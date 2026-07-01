"use client";

import type { RankingEntry, ToxicityProfile } from "@/lib/types";

interface CompoundOverlayProps {
  compound: RankingEntry;
  toxicity?: ToxicityProfile;
  onClose: () => void;
  referenceDrugName?: string;
}

export default function CompoundOverlay({ compound, toxicity, onClose, referenceDrugName = "reference" }: CompoundOverlayProps) {
  const vs = compound.vs_reference ?? compound.vs_nirmatrelvir ?? "similar";
  const delta = compound.delta_vs_reference ?? compound.delta_vs_nirmatrelvir ?? 0;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 animate-fade-in border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
            compound.rank === 1 ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-700"
          }`}>
            #{compound.rank}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">{compound.compound_name}</div>
            <div className="text-[10px] text-slate-400">
              <span className="font-mono font-bold text-blue-600">{compound.binding_score_kcal_mol.toFixed(2)}</span> kcal/mol
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className={`font-bold ${vs === "stronger" ? "text-emerald-500" : vs === "similar" ? "text-slate-500" : "text-orange-500"}`}>
            {vs === "stronger" ? "STRONGER" : vs === "similar" ? "SIMILAR" : "WEAKER"} vs {referenceDrugName}
          </span>
          {toxicity && (
            <span className={`font-bold ${toxicity.overall_pass ? "text-emerald-500" : "text-orange-500"}`}>
              {toxicity.overall_pass ? "PASS" : "REVIEW"}
            </span>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
