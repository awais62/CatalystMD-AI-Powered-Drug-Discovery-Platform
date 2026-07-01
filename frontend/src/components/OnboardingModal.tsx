"use client";

import { useState, useEffect } from "react";

interface OnboardingModalProps {
  onDismiss: () => void;
}

export default function OnboardingModal({ onDismiss }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to CatalystMD",
      subtitle: "AI Drug Discovery on AMD MI300X",
      content: (
        <div className="space-y-4 text-sm text-slate-400">
          <p>
            CatalystMD screens drug candidates against protein targets using
            <span className="font-semibold text-blue-600"> molecular dynamics simulation</span> on
            AMD MI300X hardware.
          </p>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">The AMD Story</div>
            <p className="text-xs leading-relaxed text-slate-400">
              CatalystMD runs both the AI model (Qwen 2.5-7B) and physics simulations (OpenMM)
              on a <span className="font-bold text-blue-600">single AMD MI300X GPU (192GB HBM3)</span>.
              Our benchmarks show 100% GPU utilization across all protein targets.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "How It Works",
      subtitle: "5 AI Agents, 1 Pipeline",
      content: (
        <div className="space-y-3">
          {[
            {
              icon: "🎯", name: "Target Identifier",
              desc: "Downloads the real 3D protein structure from the Protein Data Bank. Identifies the binding pocket, the physical cavity where drugs need to sit to block the protein.",
            },
            {
              icon: "⚛️", name: "Molecular Dynamics",
              desc: "Docks each drug into the binding pocket using AutoDock Vina (physics-based scoring), then runs energy minimization with OpenMM on AMD MI300X. Real binding scores, not estimates.",
            },
            {
              icon: "📊", name: "Binding Scorer",
              desc: "Ranks all candidates by how strongly they bind. Compares each one to the current FDA-approved drug for that target to find potentially better alternatives.",
            },
            {
              icon: "🛡️", name: "Toxicity Screener",
              desc: "Checks if candidates could work as real drugs. Applies Lipinski's Rule of Five (molecular weight, solubility, etc.) and screens for known toxic chemical patterns.",
            },
            {
              icon: "📋", name: "Discovery Reporter",
              desc: "AI writes a complete drug discovery brief explaining the results in plain scientific language. Includes structural analysis, recommendations, and next experimental steps.",
            },
          ].map((agent, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-slate-50/80 p-3">
              <span className="mt-0.5 text-lg">{agent.icon}</span>
              <div>
                <div className="text-xs font-semibold text-slate-900">{agent.name}</div>
                <div className="text-[10px] leading-relaxed text-slate-500">{agent.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Choose a Target",
      subtitle: "4 validated drug targets",
      content: (
        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <span>🦠</span>
              <span className="text-xs font-semibold text-slate-900">COVID-19 Protease</span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-600">Recommended first</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">20 compounds vs Paxlovid. Top hit: Shikonin (-6.79 kcal/mol). Real Vina docking.</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <span>🧬</span>
              <span className="text-xs font-semibold text-slate-900">KRAS G12C, Lung Cancer</span>
              <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[9px] text-purple-600">Oncology</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">15 compounds vs Sotorasib (Lumakras). Top hit: SML-8-73-1 (-8.59 kcal/mol).</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <span>🧬</span>
              <span className="text-xs font-semibold text-slate-900">EGFR Kinase, Lung Cancer</span>
              <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[9px] text-purple-600">Oncology</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">12 compounds vs Erlotinib (Tarceva). Top hit: WZ4002 (-8.82 kcal/mol).</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-600">Tips:</span> Click residue badges to zoom in. Click compounds in rankings to inspect. Check Agent Logs for AI reasoning.
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="animate-fade-in mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CatalystMD" className="h-10 w-10 rounded-xl shadow-lg shadow-blue-500/20" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{current.title}</h2>
              <p className="text-xs text-slate-500">{current.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6 min-h-[240px]">
          {current.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Step dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-blue-500" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              Skip
            </button>
            <button
              onClick={() => {
                if (isLast) onDismiss();
                else setStep((s) => s + 1);
              }}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              {isLast ? "Start Discovery" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
