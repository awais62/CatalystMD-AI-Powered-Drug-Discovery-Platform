"use client";

import type { AgentStatusMap, AgentName } from "@/lib/types";

interface AgentStatusPanelProps {
  agentStatus: AgentStatusMap;
  atomCount?: number;
  currentCompound?: number;
  totalCompounds?: number;
  compoundName?: string;
  currentStep?: string | null;
}

const AGENTS: { key: AgentName; name: string; icon: string; description: string }[] = [
  { key: "identify_target", name: "Drug Target Identifier", icon: "🎯", description: "Fetching protein structure · identifying binding site" },
  { key: "simulate", name: "Molecular Dynamics", icon: "⚛️", description: "AMD MI300X · OpenMM OpenCL · Implicit Solvent (OBC2)" },
  { key: "score_binding", name: "Binding Scorer", icon: "📊", description: "Ranking compounds by binding affinity" },
  { key: "screen_toxicity", name: "Toxicity Screener", icon: "🛡️", description: "Lipinski Rule of Five · PAINS filter" },
  { key: "generate_brief", name: "Discovery Reporter", icon: "📋", description: "Generating comprehensive discovery brief" },
];

export default function AgentStatusPanel({ agentStatus, atomCount, currentCompound, totalCompounds, compoundName, currentStep }: AgentStatusPanelProps) {
  const completedCount = Object.values(agentStatus).filter((s) => s === "completed").length;
  const progress = (completedCount / AGENTS.length) * 100;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Agent Pipeline</h3>
        <span className="text-xs text-slate-400">{completedCount}/{AGENTS.length} complete</span>
      </div>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="relative h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${progress}%` }}>
          <div className="shimmer-bar absolute inset-0" />
        </div>
      </div>

      <div className="space-y-2">
        {AGENTS.map((agent, i) => {
          const status = agentStatus[agent.key];
          const isRunning = status === "running";
          const isCompleted = status === "completed";
          const isMD = agent.key === "simulate";

          return (
            <div
              key={agent.key}
              className={`relative overflow-hidden rounded-xl border p-3 transition-all duration-300 ${
                isRunning
                  ? "border-blue-200 bg-blue-50"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-slate-100 bg-slate-50/50"
              }`}
            >
              {isRunning && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="scan-line absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-blue-100/40 to-transparent" />
                </div>
              )}

              <div className="relative flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
                  isRunning ? "bg-blue-100" : isCompleted ? "bg-emerald-100" : "bg-slate-100"
                }`}>
                  {isCompleted ? (
                    <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={isRunning ? "" : "opacity-40"}>{agent.icon}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      isRunning ? "text-blue-700" : isCompleted ? "text-emerald-700" : "text-slate-400"
                    }`}>{agent.name}</span>
                    {isRunning && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-1 animate-pulse rounded-full bg-blue-500" />
                        <div className="h-1 w-1 animate-pulse rounded-full bg-blue-500" style={{ animationDelay: "0.2s" }} />
                        <div className="h-1 w-1 animate-pulse rounded-full bg-blue-500" style={{ animationDelay: "0.4s" }} />
                      </div>
                    )}
                  </div>
                  {isRunning && <p className="mt-0.5 text-[11px] text-slate-400">{currentStep || agent.description}</p>}
                </div>
              </div>

              {isRunning && isMD && (
                <div className="relative mt-3 rounded-lg bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    {atomCount ? (
                      <span className="font-mono font-bold text-blue-600">{atomCount.toLocaleString()} atoms</span>
                    ) : (
                      <span className="font-mono text-blue-400">Docking first compound...</span>
                    )}
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">AMD MI300X OpenCL</span>
                  </div>
                  {currentCompound != null && totalCompounds != null && totalCompounds > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Compound {currentCompound}/{totalCompounds}{compoundName ? ` — ${compoundName}` : ""}</span>
                        <span>{Math.round((currentCompound / totalCompounds) * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="relative h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${(currentCompound / totalCompounds) * 100}%` }}>
                          <div className="shimmer-bar absolute inset-0" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                    <span>MI300X 192GB</span><span>·</span><span>OpenMM OpenCL</span><span>·</span><span>AMBER14 + OBC2</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
