"use client";

import { useState } from "react";
import type { PipelineResults, AgentTrace } from "@/lib/types";
import BenchmarkCard from "./BenchmarkCard";

type Tab = "overview" | "analysis" | "agents" | "toxicity" | "benchmark";

interface ResultsTabsProps {
  results: PipelineResults;
}

export default function ResultsTabs({ results }: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "analysis", label: "Analysis" },
    { id: "agents", label: "Agent Logs" },
    { id: "toxicity", label: "Toxicity" },
    { id: "benchmark", label: "Benchmark" },
  ];

  return (
    <div className="animate-fade-in animate-fade-in-delay-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-slate-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative shrink-0 px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-blue-600"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === "overview" && <OverviewTab results={results} />}
        {activeTab === "analysis" && <AnalysisTab results={results} />}
        {activeTab === "agents" && <AgentLogsTab traces={results.agent_traces ?? []} />}
        {activeTab === "toxicity" && <ToxicityTab results={results} />}
        {activeTab === "benchmark" && results.benchmark && <BenchmarkCard benchmark={results.benchmark} />}
      </div>
    </div>
  );
}

function OverviewTab({ results }: { results: PipelineResults }) {
  const target = results.target_analysis;
  const top = results.binding_rankings?.top_hit;
  const totalScreened = results.binding_rankings?.total_screened ?? 0;

  return (
    <div className="space-y-4">
      {/* Target info */}
      {target && (
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Target</div>
          <div className="text-sm font-bold text-slate-900">{target.protein_name}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>PDB: {target.pdb_id}</span>
            <span>{target.resolution_angstroms}&#8491; resolution</span>
            <span>{results.benchmark?.atom_count ? results.benchmark.atom_count.toLocaleString() : target.pdb_atom_count.toLocaleString()} atoms</span>
          </div>
          <div className="mt-2 text-[9px] text-slate-400 mb-1">Binding site residues (where drugs attach)</div>
          <div className="flex flex-wrap gap-1.5">
            {target.binding_site.key_residues.map((res) => {
              // Colors for all target residues (red, amber, violet, cyan pattern)
              const residueIndex = target.binding_site.key_residues.indexOf(res);
              const palette = [
                { border: "border-red-300", bg: "bg-red-50", text: "text-red-600" },
                { border: "border-amber-300", bg: "bg-amber-50", text: "text-amber-600" },
                { border: "border-violet-300", bg: "bg-violet-50", text: "text-violet-600" },
                { border: "border-cyan-300", bg: "bg-cyan-50", text: "text-cyan-600" },
              ];
              const c = palette[residueIndex % palette.length];
              return (
                <span key={res} className={`rounded-md border ${c.border} ${c.bg} px-2 py-0.5 text-[10px] font-medium ${c.text}`}>
                  {res}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Screening summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{totalScreened}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">Compounds Screened</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-xl font-bold text-slate-900">{top?.compound_name?.split(" ")[0] ?? "—"}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">Top Hit</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-xl font-bold text-emerald-400">
            {top ? `${top.binding_score_kcal_mol.toFixed(1)}` : "—"}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">kcal/mol</div>
        </div>
      </div>

      {/* Biological context */}
      {target?.biological_context && (
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Biological Context</div>
          <p className="text-xs leading-relaxed text-slate-700">{target.biological_context}</p>
        </div>
      )}

      {target?.therapeutic_relevance && (
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Therapeutic Relevance</div>
          <p className="text-xs leading-relaxed text-slate-700">{target.therapeutic_relevance}</p>
        </div>
      )}
    </div>
  );
}

function AnalysisTab({ results }: { results: PipelineResults }) {
  const interpretation = results.binding_rankings?.interpretation;
  const top = results.binding_rankings?.top_hit;
  const nirRef = results.binding_rankings?.nirmatrelvir_reference_score;

  // Try to extract structural analysis from brief
  const brief = results.discovery_brief ?? "";
  let structuralAnalysis = "";
  const saStart = brief.indexOf("STRUCTURAL ANALYSIS");
  if (saStart !== -1) {
    const saContent = brief.substring(saStart + "STRUCTURAL ANALYSIS".length);
    const nextSection = saContent.indexOf("\nBINDING INTERPRETATION");
    structuralAnalysis = (nextSection !== -1 ? saContent.substring(0, nextSection) : saContent.substring(0, 600))
      .replace(/^[\s-]+/, "").trim();
  }

  return (
    <div className="space-y-4">
      {/* Key comparison */}
      {top && (
        <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-blue-50 to-transparent p-4">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{top.binding_score_kcal_mol.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">{top.compound_name}</div>
          </div>
          <div className="text-xs text-slate-500">vs</div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-400">{nirRef?.toFixed(2) ?? "-8.30"}</div>
            <div className="text-[10px] text-slate-500">{results.binding_rankings?.reference_drug_name ?? "Reference drug"}</div>
          </div>
          <div className="ml-auto">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              (top.vs_reference ?? top.vs_nirmatrelvir) === "stronger"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-slate-500/15 text-slate-400"
            }`}>
              {(top.delta_vs_reference ?? top.delta_vs_nirmatrelvir ?? 0) > 0 ? "+" : ""}{(top.delta_vs_reference ?? top.delta_vs_nirmatrelvir ?? 0).toFixed(2)} kcal/mol
            </span>
          </div>
        </div>
      )}

      {/* Structural analysis (AI-generated) */}
      {structuralAnalysis && (
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="mb-0 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Structural Analysis
            </div>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">AI Generated</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-700">{structuralAnalysis}</p>
        </div>
      )}

      {/* Binding interpretation */}
      {interpretation && (
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Binding Interpretation
            </div>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">AI Generated</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-700">{interpretation}</p>
        </div>
      )}
    </div>
  );
}

function getReviewReason(tox: PipelineResults["toxicity_profiles"][0]): string {
  const issues: string[] = [];
  const lip = tox.lipinski;
  if (lip.molecular_weight > 500) issues.push(`Molecular weight (${lip.molecular_weight} Da) exceeds 500 limit: larger molecules have difficulty crossing cell membranes`);
  if (lip.logP > 5) issues.push(`LogP (${lip.logP}) exceeds 5: too hydrophobic for good oral absorption`);
  if (lip.H_bond_donors > 5) issues.push(`${lip.H_bond_donors} H-bond donors exceeds 5: reduces membrane permeability`);
  if (lip.H_bond_acceptors > 10) issues.push(`${lip.H_bond_acceptors} H-bond acceptors exceeds 10: reduces oral bioavailability`);
  if (tox.pains_flags && tox.pains_flags.length > 0) {
    issues.push(`PAINS alert (${tox.pains_flags.join(", ")}): chemical pattern known to cause false positives in lab assays`);
  }
  if (issues.length === 0) return "Flagged for manual review.";
  return issues.join(". ") + ".";
}

function ToxicityTab({ results }: { results: PipelineResults }) {
  const profiles = results.toxicity_profiles ?? [];

  if (profiles.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-500">No toxicity data available</div>;
  }

  return (
    <div className="space-y-3">
      <div className="mb-2 text-xs text-slate-500">
        Lipinski Rule of Five screening for top {profiles.length} candidates
      </div>

      {profiles.map((tox) => (
        <div
          key={tox.compound_id}
          className={`rounded-xl border p-4 ${
            tox.overall_pass
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-orange-200 bg-orange-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">{tox.compound_name}</span>
              <span className="font-mono text-xs text-slate-400">
                {tox.binding_score_kcal_mol.toFixed(2)} kcal/mol
              </span>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              tox.overall_pass
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700"
            }`}>
              {tox.overall_pass ? "PASS" : "REVIEW"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-2">
            {[
              { label: "MW", value: tox.lipinski.molecular_weight, limit: 500, unit: "Da" },
              { label: "LogP", value: tox.lipinski.logP, limit: 5, unit: "" },
              { label: "HBD", value: tox.lipinski.H_bond_donors, limit: 5, unit: "" },
              { label: "HBA", value: tox.lipinski.H_bond_acceptors, limit: 10, unit: "" },
              { label: "Violations", value: tox.lipinski.lipinski_violations, limit: 1, unit: "/4" },
            ].map((prop) => {
              const over = prop.label === "Violations" ? prop.value > prop.limit : prop.value > prop.limit;
              return (
                <div key={prop.label} className={`rounded-lg p-2 text-center ${over ? "bg-red-50 border border-red-200" : "bg-white border border-slate-200"}`}>
                  <div className={`text-xs font-bold ${over ? "text-red-600" : "text-slate-700"}`}>
                    {typeof prop.value === "number" ? (Number.isInteger(prop.value) ? prop.value : prop.value.toFixed(1)) : prop.value}
                    {prop.unit}
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-400">
                    {prop.label} {prop.label !== "Violations" ? `<${prop.limit}` : `≤${prop.limit}`}
                  </div>
                </div>
              );
            })}
          </div>

          {!tox.overall_pass && (
            <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-orange-700">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Why this needs review
              </div>
              <p className="text-[10px] leading-relaxed text-orange-800/80">
                {getReviewReason(tox)}
              </p>
            </div>
          )}

          {tox.pains_flags.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-orange-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
              </svg>
              PAINS: {tox.pains_flags.join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BriefTab({ brief }: { brief?: string }) {
  if (!brief) return <div className="py-8 text-center text-sm text-slate-500">No brief generated</div>;

  function handleDownload() {
    const blob = new Blob([brief], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalystmd_discovery_brief.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition-all hover:border-blue-300 hover:text-blue-600"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download .txt
        </button>
      </div>
      <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-5 font-mono text-xs leading-relaxed text-slate-700">
        {brief}
      </pre>
    </div>
  );
}

function AgentLogsTab({ traces }: { traces: AgentTrace[] }) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedLLM, setExpandedLLM] = useState<number | null>(null);

  if (traces.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-500">No agent traces available</div>;
  }

  const totalTime = traces.reduce((sum, t) => sum + t.duration_seconds, 0);
  const totalLLM = traces.reduce((sum, t) => sum + t.llm_calls.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-400">
        <span>{traces.length} agents</span>
        <span className="text-slate-600">&middot;</span>
        <span>{totalLLM} LLM calls</span>
        <span className="text-slate-600">&middot;</span>
        <span>{totalTime.toFixed(1)}s total</span>
      </div>

      {traces.map((trace, idx) => {
        const isExpanded = expandedAgent === trace.agent;
        const hasLLM = trace.llm_calls.length > 0;

        return (
          <div key={trace.agent} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setExpandedAgent(isExpanded ? null : trace.agent)}
              className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15">
                  <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{trace.agent_name}</div>
                  <div className="text-[10px] text-slate-500">{trace.output_summary}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasLLM && (
                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">LLM</span>
                )}
                <span className="font-mono text-[10px] text-slate-500">{trace.duration_seconds}s</span>
                <svg className={`h-3 w-3 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-200 p-3 pt-2">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="mb-1 text-[9px] font-medium uppercase text-slate-600">Input</div>
                    <div className="text-[11px] text-slate-400">{trace.input_summary}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="mb-1 text-[9px] font-medium uppercase text-slate-600">Output</div>
                    <div className="text-[11px] text-slate-400">{trace.output_summary}</div>
                  </div>
                </div>

                <div className="mb-3 space-y-1">
                  <div className="text-[9px] font-medium uppercase text-slate-600">Steps</div>
                  {trace.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 text-[11px]">
                      <span className="shrink-0 text-blue-600">{i + 1}.</span>
                      <span className="font-medium text-slate-700">{step.action}</span>
                      <span className="text-slate-500">&mdash; {step.detail}</span>
                    </div>
                  ))}
                </div>

                {trace.llm_calls.map((call, i) => {
                  const llmKey = idx * 100 + i;
                  const isLLMOpen = expandedLLM === llmKey;

                  return (
                    <div key={i} className="mt-2 rounded-lg border border-blue-500/15 bg-blue-500/5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedLLM(isLLMOpen ? null : llmKey); }}
                        className="flex w-full items-center justify-between p-2 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">{call.model}</span>
                          <span className="text-[10px] text-slate-400">{call.success ? `${call.duration_ms}ms` : "failed"}</span>
                        </div>
                        <svg className={`h-3 w-3 text-slate-500 transition-transform ${isLLMOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isLLMOpen && (
                        <div className="space-y-2 border-t border-blue-500/10 p-2">
                          <div>
                            <div className="mb-1 text-[9px] font-medium uppercase text-slate-600">Prompt</div>
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-[10px] leading-relaxed text-slate-400">{call.prompt}</pre>
                          </div>
                          <div>
                            <div className="mb-1 text-[9px] font-medium uppercase text-slate-600">Response</div>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-[10px] leading-relaxed text-emerald-700">{call.response || "(empty)"}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {trace.model && (
                  <div className="mt-2 text-[10px] text-slate-600">Model: {trace.model}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
