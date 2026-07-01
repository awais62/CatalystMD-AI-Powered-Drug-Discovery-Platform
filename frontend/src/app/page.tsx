"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  AppState,
  AgentStatusMap,
  PipelineResults,
  RankingEntry,
} from "@/lib/types";
import {
  startRun,
  getResults,
  getProteinPDB,
  pollStatus,
  fetchCompounds,
  fetchDockPose,
} from "@/lib/api";
import Header from "@/components/Header";
import ProteinViewer from "@/components/ProteinViewer";
import TargetSelector from "@/components/TargetSelector";
import AgentStatusPanel from "@/components/AgentStatusPanel";
import BindingRankings from "@/components/BindingRankings";
import ResultsTabs from "@/components/ResultsTabs";
import OnboardingModal from "@/components/OnboardingModal";

const TARGET_LIGANDS: Record<string, string> = {
  "6LU7": "N3",
  "6OIM": "ARS",
  "1M17": "AQ4",
  "1HIV": "A77",
};

const INITIAL_AGENT_STATUS: AgentStatusMap = {
  identify_target: "pending",
  simulate: "pending",
  score_binding: "pending",
  screen_toxicity: "pending",
  generate_brief: "pending",
};

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [selectedTarget, setSelectedTarget] = useState("6LU7");
  const [pdbData, setPdbData] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] =
    useState<AgentStatusMap>(INITIAL_AGENT_STATUS);
  const [results, setResults] = useState<PipelineResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompound, setSelectedCompound] = useState<RankingEntry | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [compoundProgress, setCompoundProgress] = useState<{ current: number; total: number; name: string; atoms?: number } | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [dockedPose, setDockedPose] = useState<string | null>(null);
  const [dockingLoading, setDockingLoading] = useState(false);
  const [compoundCount, setCompoundCount] = useState(20);

  useEffect(() => {
    getProteinPDB(selectedTarget)
      .then(setPdbData)
      .catch(() => setPdbData(null));
    fetchCompounds(selectedTarget)
      .then((c: any[]) => setCompoundCount(c.length))
      .catch(() => setCompoundCount(0));
  }, [selectedTarget]);

  const toxicityMap = useMemo(() => {
    if (!results?.toxicity_profiles) return new Map();
    return new Map(results.toxicity_profiles.map((t) => [t.compound_id, t]));
  }, [results?.toxicity_profiles]);

  const handleRun = useCallback(async () => {
    setAppState("running");
    setError(null);
    setResults(null);
    setSelectedCompound(null);
    setAgentStatus(INITIAL_AGENT_STATUS);
    setCompoundProgress(null);
    setCurrentStep(null);

    try {
      const jobId = await startRun(selectedTarget);

      pollStatus(
        jobId,
        (agent, status) => {
          setAgentStatus((prev) => ({ ...prev, [agent]: status }));
        },
        async () => {
          try {
            const res = await getResults(jobId);
            setResults(res);
            // Auto-select the winning compound
            if (res.binding_rankings?.top_hit) {
              setSelectedCompound(res.binding_rankings.top_hit);
            }
            setAppState("completed");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Failed to get results"
            );
            setAppState("idle");
          }
        },
        (err) => {
          setError(err);
          setAppState("idle");
        },
        (current, total, name, atoms) => {
          setCompoundProgress({ current, total, name, atoms });
        },
        (step) => {
          setCurrentStep(step);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start pipeline");
      setAppState("idle");
    }
  }, [selectedTarget]);

  const handleReset = useCallback(() => {
    setAppState("idle");
    setResults(null);
    setSelectedCompound(null);
    setAgentStatus(INITIAL_AGENT_STATUS);
    setError(null);
  }, []);

  const TARGET_RESIDUES: Record<string, string[]> = {
    "6LU7": ["His41", "Cys145", "Glu166", "His164"],
    "6OIM": ["Cys12", "His95", "Tyr96", "Asp69"],
    "1M17": ["Met793", "Thr790", "Lys745", "Asp855"],
    "1HIV": ["Asp25", "Thr26", "Gly27", "Asp25'"],
  };

  const bindingResidues =
    results?.target_analysis?.binding_site?.key_residues ??
    TARGET_RESIDUES[selectedTarget] ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      {showOnboarding && <OnboardingModal onDismiss={() => setShowOnboarding(false)} />}
      <Header appState={appState} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        )}

        {/* IDLE STATE */}
        {appState === "idle" && (
          <div className="animate-fade-in">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                AI-Powered Drug Discovery
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                Simulate drug-protein binding using molecular dynamics on AMD MI300X.
                Screen compounds against validated drug targets in minutes.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <ProteinViewer
                  pdbData={pdbData}
                  bindingResidues={bindingResidues}
                  ligandId={TARGET_LIGANDS[selectedTarget] || "UNK"}
                />
              </div>
              <div className="space-y-4 lg:col-span-2">
                <TargetSelector
                  selectedTarget={selectedTarget}
                  onTargetChange={setSelectedTarget}
                  onRun={handleRun}
                  compoundCount={compoundCount}
                  disabled={false}
                />

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Pipeline
                  </h3>
                  <div className="space-y-2.5">
                    {[
                      { icon: "🎯", text: "Identify target protein and binding site" },
                      { icon: "⚛️", text: "Simulate binding on AMD MI300X (192GB)" },
                      { icon: "📊", text: "Score and rank affinity vs. approved drugs" },
                      { icon: "🛡️", text: "Screen toxicity — Lipinski + PAINS" },
                      { icon: "📋", text: "Generate drug discovery brief" },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm">{step.icon}</span>
                        <span className="text-xs text-slate-400">{step.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RUNNING STATE */}
        {appState === "running" && (
          <div className="animate-fade-in grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ProteinViewer
                pdbData={pdbData}
                bindingResidues={bindingResidues}
              />
              <div className="mt-3 flex items-center justify-center gap-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-blue-600">MI300X</div>
                  <div className="text-[10px] text-slate-500">AMD OpenCL GPU</div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-blue-600">AMBER14</div>
                  <div className="text-[10px] text-slate-500">force field</div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-blue-600">OBC2</div>
                  <div className="text-[10px] text-slate-500">implicit solvent</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <AgentStatusPanel
                agentStatus={agentStatus}
                atomCount={compoundProgress?.atoms}
                currentCompound={compoundProgress?.current}
                totalCompounds={compoundProgress?.total ?? compoundCount}
                compoundName={compoundProgress?.name}
                currentStep={currentStep}
              />
            </div>
          </div>
        )}

        {/* COMPLETED STATE */}
        {appState === "completed" && results && (
          <div className="space-y-6">
            {/* Top hit banner */}
            {results.binding_rankings?.top_hit && (
              <div className="animate-fade-in flex items-center justify-between rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-blue-50/50 to-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl font-black text-blue-600">
                    #1
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">
                      {results.binding_rankings.top_hit.compound_name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="font-mono font-bold text-blue-600">
                        {results.binding_rankings.top_hit.binding_score_kcal_mol.toFixed(2)} kcal/mol
                      </span>
                      <span className="text-slate-300">&middot;</span>
                      <span className="font-semibold text-emerald-600">
                        {(results.binding_rankings.top_hit.vs_reference ?? results.binding_rankings.top_hit.vs_nirmatrelvir) === "stronger"
                          ? "STRONGER"
                          : (results.binding_rankings.top_hit.vs_reference ?? results.binding_rankings.top_hit.vs_nirmatrelvir ?? "").toUpperCase()}{" "}
                        than {results.binding_rankings.reference_drug_name ?? "Paxlovid"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
                >
                  New Screen
                </button>
              </div>
            )}

            {/* Viewer + Tabs */}
            <div className="grid gap-6 lg:grid-cols-5">
              <div id="protein-viewer" className="lg:col-span-3">
                <ProteinViewer
                  pdbData={pdbData}
                  bindingResidues={
                    results.target_analysis?.binding_site?.key_residues ??
                    bindingResidues
                  }
                  showLigand
                  ligandId={results.target_analysis?.ligand_id || TARGET_LIGANDS[selectedTarget] || "UNK"}
                  selectedCompound={selectedCompound}
                  toxicityMap={toxicityMap}
                  onClearSelection={() => { setSelectedCompound(null); setDockedPose(null); }}
                  dockedPose={dockedPose}
                  dockingLoading={dockingLoading}
                  referenceDrugName={results.binding_rankings.reference_drug_name}
                />
              </div>

              <div className="lg:col-span-2">
                <ResultsTabs results={results} />
              </div>
            </div>

            {/* Rankings table */}
            {results.binding_rankings?.rankings && (
              <BindingRankings
                rankings={results.binding_rankings.rankings}
                toxicityProfiles={results.toxicity_profiles}
                selectedCompoundId={selectedCompound?.compound_id}
                referenceDrugName={results.binding_rankings.reference_drug_name}
                referenceDrugId={results.binding_rankings.reference_drug_id}
                dockingLoading={dockingLoading}
                dockedPose={dockedPose}
                onSelectCompound={(c) => {
                  setSelectedCompound(c);
                  setDockedPose(null);
                  if (c) {
                    setDockingLoading(true);
                    fetchDockPose(selectedTarget, c.compound_id).then((result) => {
                      if (result?.pose_pdb) {
                        setDockedPose(result.pose_pdb);
                      }
                      setDockingLoading(false);
                    });
                  }
                }}
              />
            )}

            {/* Discovery Brief viewer + download */}
            {results.discovery_brief && <DiscoveryBriefSection brief={results.discovery_brief} />}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-[11px] text-slate-400">
        CatalystMD &middot; AMD Developer Hackathon 2026 &middot; Team CatalystMD
      </footer>
    </div>
  );
}

function DiscoveryBriefSection({ brief }: { brief: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = brief.split("\n");
  const preview = lines.slice(0, 20).join("\n");

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const escaped = brief.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = [
      "<!DOCTYPE html><html><head>",
      "<title>CatalystMD Discovery Brief</title>",
      "<style>body{font-family:'Courier New',monospace;font-size:11px;line-height:1.6;padding:40px;color:#1e293b;max-width:800px}",
      "h1{font-size:16px;border-bottom:2px solid #2563eb;padding-bottom:8px}",
      "pre{white-space:pre-wrap}</style>",
      "</head><body>",
      "<h1>CatalystMD Discovery Brief</h1>",
      "<pre>" + escaped + "</pre>",
      "</body></html>",
    ].join("");

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }

  return (
    <div className="animate-fade-in animate-fade-in-delay-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">Discovery Brief</div>
            <div className="text-[11px] text-slate-400">{lines.length} lines &middot; AI-generated analysis report</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadPDF}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PDF
          </button>
          <button
            onClick={() => downloadFile(brief, "catalystmd_brief.md", "text/markdown")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-all hover:border-blue-300 hover:text-blue-600"
          >
            .md
          </button>
          <button
            onClick={() => downloadFile(brief, "catalystmd_brief.txt", "text/plain")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-all hover:border-blue-300 hover:text-blue-600"
          >
            .txt
          </button>
        </div>
      </div>

      <div className="relative p-4">
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-600">
          {expanded ? brief : preview}
        </pre>
        {!expanded && lines.length > 20 && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>

      {lines.length > 20 && (
        <div className="border-t border-slate-100 px-4 py-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            <svg className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? "Show less" : `Show all ${lines.length} lines`}
          </button>
        </div>
      )}
    </div>
  );
}
