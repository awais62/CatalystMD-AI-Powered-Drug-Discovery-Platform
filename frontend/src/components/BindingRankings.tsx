"use client";

import React from "react";
import type { RankingEntry, ToxicityProfile } from "@/lib/types";

interface BindingRankingsProps {
  rankings: RankingEntry[];
  toxicityProfiles?: ToxicityProfile[];
  selectedCompoundId?: string | null;
  onSelectCompound?: (compound: RankingEntry | null) => void;
  referenceDrugName?: string;
  referenceDrugId?: string;
  dockingLoading?: boolean;
  dockedPose?: string | null;
}

export default function BindingRankings({
  rankings,
  toxicityProfiles,
  selectedCompoundId,
  onSelectCompound,
  referenceDrugName = "Paxlovid",
  referenceDrugId = "nirmatrelvir",
  dockingLoading = false,
  dockedPose,
}: BindingRankingsProps) {
  const toxMap = new Map(
    (toxicityProfiles ?? []).map((t) => [t.compound_id, t])
  );

  return (
    <div className="animate-fade-in animate-fade-in-delay-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Binding Rankings
        </h3>
        <div className="flex items-center gap-3">
          {onSelectCompound && (
            <span className="text-[10px] text-slate-600">Click a row to inspect</span>
          )}
          <span className="text-xs text-slate-500">
            {rankings.length} compounds
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">#</th>
              <th className="pb-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Compound</th>
              <th className="pb-3 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">Binding Score</th>
              <th className="pb-3 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">vs {referenceDrugName}</th>
              <th className="pb-3 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">Lipinski</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r) => {
              const tox = toxMap.get(r.compound_id);
              const isTop = r.rank === 1;
              const isRef = r.compound_id === referenceDrugId;
              const isSelected = selectedCompoundId === r.compound_id;

              return (
                <React.Fragment key={r.compound_id}>
                <tr
                  onClick={() => onSelectCompound?.(isSelected ? null : r)}
                  className={`group border-b border-slate-100 transition-colors ${
                    onSelectCompound ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "bg-blue-50"
                      : isTop
                        ? "bg-blue-50/50 hover:bg-blue-50"
                        : "hover:bg-slate-50"
                  }`}
                >
                  <td className="py-2.5 pr-3">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold ${
                      isTop || isSelected
                        ? "bg-blue-100 text-blue-600"
                        : r.rank <= 3
                          ? "bg-slate-100 text-slate-700"
                          : "text-slate-600"
                    }`}>
                      {r.rank}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isTop || isSelected ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                        {r.compound_name}
                      </span>
                      {isTop && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600">
                          Top Hit
                        </span>
                      )}
                      {isRef && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                          FDA Approved
                        </span>
                      )}
                      {isSelected && !isTop && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600">
                          Inspecting
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`font-mono text-sm ${
                      isTop || isSelected ? "font-bold text-blue-600" : "text-slate-700"
                    }`}>
                      {r.binding_score_kcal_mol.toFixed(2)}
                    </span>
                    <span className="ml-1 text-[10px] text-slate-600">kcal/mol</span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      (r.vs_reference ?? r.vs_nirmatrelvir) === "stronger"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : (r.vs_reference ?? r.vs_nirmatrelvir) === "similar"
                          ? "bg-slate-500/10 text-slate-400"
                          : "bg-orange-500/10 text-orange-400"
                    }`}>
                      {(r.vs_reference ?? r.vs_nirmatrelvir) === "stronger" ? "↑ Stronger" :
                       (r.vs_reference ?? r.vs_nirmatrelvir) === "similar" ? "≈ Similar" : "↓ Weaker"}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    {tox ? (
                      <span className={`text-[11px] font-medium ${
                        tox.overall_pass ? "text-emerald-400" : "text-orange-400"
                      }`}>
                        {tox.overall_pass ? "PASS" : "REVIEW"}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-600">—</span>
                    )}
                  </td>
                </tr>
                {isSelected && (
                  <tr key={`${r.compound_id}-detail`}>
                    <td colSpan={5} className="bg-blue-50/80 px-4 pb-3 pt-1">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="rounded-lg bg-white p-2.5 text-center shadow-sm">
                          <div className="text-lg font-bold text-blue-600">{r.binding_score_kcal_mol.toFixed(2)}</div>
                          <div className="text-[9px] text-slate-400">Binding Score (kcal/mol)</div>
                        </div>
                        <div className="rounded-lg bg-white p-2.5 text-center shadow-sm">
                          <div className={`text-sm font-bold ${(r.vs_reference ?? r.vs_nirmatrelvir) === "stronger" ? "text-emerald-600" : (r.vs_reference ?? r.vs_nirmatrelvir) === "similar" ? "text-slate-600" : "text-orange-500"}`}>
                            {(r.delta_vs_reference ?? r.delta_vs_nirmatrelvir ?? 0) > 0 ? "+" : ""}{(r.delta_vs_reference ?? r.delta_vs_nirmatrelvir ?? 0).toFixed(2)}
                          </div>
                          <div className="text-[9px] text-slate-400">vs {referenceDrugName} (kcal/mol)</div>
                        </div>
                        {tox && (
                          <>
                            <div className="rounded-lg bg-white p-2.5 text-center shadow-sm">
                              <div className="text-sm font-bold text-slate-700">{tox.lipinski.molecular_weight}</div>
                              <div className="text-[9px] text-slate-400">MW (Da) &lt;500</div>
                            </div>
                            <div className="rounded-lg bg-white p-2.5 text-center shadow-sm">
                              <div className="text-sm font-bold text-slate-700">{tox.lipinski.lipinski_violations}/4</div>
                              <div className="text-[9px] text-slate-400">Lipinski violations</div>
                            </div>
                          </>
                        )}
                        {!tox && (
                          <>
                            <div className="rounded-lg bg-white p-2.5 text-center shadow-sm">
                              <div className="text-sm text-slate-400">—</div>
                              <div className="text-[9px] text-slate-400">No tox data</div>
                            </div>
                            <div />
                          </>
                        )}
                      </div>
                      {tox && !tox.overall_pass && (
                        <div className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-[10px] leading-relaxed text-orange-700">
                          <span className="font-bold">Why REVIEW:</span>{" "}
                          {[
                            tox.lipinski.molecular_weight > 500 && `MW ${tox.lipinski.molecular_weight} Da exceeds 500 (harder to absorb orally)`,
                            tox.lipinski.logP > 5 && `LogP ${tox.lipinski.logP} exceeds 5 (too hydrophobic)`,
                            tox.lipinski.H_bond_donors > 5 && `${tox.lipinski.H_bond_donors} H-bond donors exceeds 5 (reduces membrane permeability)`,
                            tox.lipinski.H_bond_acceptors > 10 && `${tox.lipinski.H_bond_acceptors} H-bond acceptors exceeds 10 (reduces bioavailability)`,
                          ].filter(Boolean).join(". ") || "PAINS filter flagged a potentially reactive chemical pattern."}
                          {". "}Does not mean the drug won&apos;t work, but needs further optimization.
                        </div>
                      )}
                      {dockingLoading && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[11px] font-medium text-blue-600">Docking {r.compound_name} into binding pocket (~10s)...</span>
                          <span className="text-[10px] text-slate-400">AutoDock Vina</span>
                        </div>
                      )}
                      {!dockingLoading && dockedPose && (
                        <button
                          onClick={() => document.getElementById("protein-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                          className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-100"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View docked pose in 3D viewer
                        </button>
                      )}
                      {r.known_ki_nm && (
                        <div className="mt-2 text-[10px] text-slate-400">
                          Known experimental Ki: <span className="font-medium text-slate-600">{r.known_ki_nm} nM</span> (from published literature)
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
