"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RankingEntry, ToxicityProfile } from "@/lib/types";
import CompoundOverlay from "./CompoundOverlay";

interface ProteinViewerProps {
  pdbData: string | null;
  bindingResidues?: string[];
  showLigand?: boolean;
  ligandId?: string;
  selectedCompound?: RankingEntry | null;
  toxicityMap?: Map<string, ToxicityProfile>;
  onClearSelection?: () => void;
  dockedPose?: string | null;
  dockingLoading?: boolean;
  referenceDrugName?: string;
}

const RESIDUE_COLORS: Record<string, string> = {
  // COVID-19 (6LU7)
  His41: "0xf59e0b",
  Cys145: "0xef4444",
  Glu166: "0x8b5cf6",
  His164: "0x06b6d4",
  // KRAS G12C (6OIM)
  Cys12: "0xef4444",
  His95: "0xf59e0b",
  Tyr96: "0x8b5cf6",
  Asp69: "0x06b6d4",
  // EGFR (1M17)
  Met793: "0xef4444",
  Thr790: "0xf59e0b",
  Lys745: "0x8b5cf6",
  Asp855: "0x06b6d4",
  // HIV (1HIV)
  Asp25: "0xef4444",
  Thr26: "0xf59e0b",
  Gly27: "0x8b5cf6",
  "Asp25'": "0x06b6d4",
};

const RESIDUE_TIPS: Record<string, string> = {
  His41: "Catalytic residue, activates the reaction that cuts viral proteins",
  Cys145: "Catalytic residue, primary drug binding site on this protein",
  Glu166: "Shapes the pocket, determines which molecules can fit inside",
  His164: "Holds the drug in place, stabilizes molecules in the correct position",
};

const LIGAND_NAMES: Record<string, string> = {
  N3: "N3 Inhibitor",
  ARS: "ARS-1620",
  AQ4: "Erlotinib Analog",
  A77: "A77 Inhibitor",
};

function getLigandTip(id: string) {
  const name = LIGAND_NAMES[id] || id;
  return `${name}: the drug already bound in the pocket when this protein was crystallized. Marks where drugs attach. Your screened compounds compete for this same spot.`;
}

function parseResi(name: string): number | null {
  const m = name.match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

export default function ProteinViewer({
  pdbData,
  bindingResidues = [],
  showLigand = false,
  ligandId = "N3",
  selectedCompound,
  toxicityMap,
  onClearSelection,
  dockedPose,
  dockingLoading,
  referenceDrugName,
}: ProteinViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const pdbDataRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [showProtein, setShowProtein] = useState(true);
  const [showResidues, setShowResidues] = useState(true);
  const [showLigandToggle, setShowLigandToggle] = useState(true);
  const [isSpinning, setIsSpinning] = useState(true);
  const [focusedResidue, setFocusedResidue] = useState<string | null>(null);

  const rebuildView = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !pdbDataRef.current) return;

    viewer.clear();
    viewer.addModel(pdbDataRef.current, "pdb");

    if (showProtein) {
      viewer.setStyle({}, { cartoon: { color: "spectrum", opacity: focusedResidue ? 0.4 : 0.85 } });
    } else {
      viewer.setStyle({}, {});
    }

    if (showResidues && bindingResidues.length > 0) {
      for (const resName of bindingResidues) {
        const resi = parseResi(resName);
        if (!resi) continue;
        const color = RESIDUE_COLORS[resName] || "0xfbbf24";
        const isFocused = focusedResidue === resName;

        viewer.setStyle(
          { resi },
          {
            stick: { color, radius: isFocused ? 0.35 : 0.2 },
            ...(showProtein ? { cartoon: { color, opacity: isFocused ? 1 : 0.9 } } : {}),
          }
        );

        if (isFocused) {
          viewer.addLabel(resName, {
            position: undefined,
            backgroundColor: "#0f172a",
            fontColor: `#${color.replace("0x", "")}`,
            fontSize: 12,
            borderRadius: 4,
            padding: 4,
          }, { resi });
        }
      }
    }

    if (showLigand && showLigandToggle) {
      viewer.setStyle(
        { hetflag: true },
        { stick: { color: "0x10b981", radius: focusedResidue ? 0.1 : 0.15 } }
      );
    } else {
      viewer.setStyle({ hetflag: true }, {});
    }

    if (focusedResidue) {
      const resi = parseResi(focusedResidue);
      if (resi) {
        viewer.zoomTo({ resi }, 500);
      }
    } else if (!showProtein && showResidues) {
      const nums = bindingResidues.map(parseResi).filter(Boolean);
      if (nums.length > 0) viewer.zoomTo({ resi: nums });
    } else {
      viewer.zoomTo();
    }

    viewer.render();
  }, [showProtein, showResidues, showLigandToggle, showLigand, bindingResidues, focusedResidue]);

  // Initial load
  useEffect(() => {
    if (!pdbData || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const $3Dmol = await import("3dmol");
      if (cancelled || !containerRef.current) return;

      if (viewerRef.current) {
        viewerRef.current.clear();
      } else {
        viewerRef.current = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: "0x1e293b",
        });
      }

      pdbDataRef.current = pdbData;
      const viewer = viewerRef.current;
      viewer.addModel(pdbData, "pdb");
      viewer.setStyle({}, { cartoon: { color: "spectrum", opacity: 0.85 } });

      if (bindingResidues.length > 0) {
        for (const resName of bindingResidues) {
          const resi = parseResi(resName);
          if (!resi) continue;
          const color = RESIDUE_COLORS[resName] || "0xfbbf24";
          viewer.setStyle({ resi }, { stick: { color, radius: 0.2 }, cartoon: { color, opacity: 0.9 } });
        }
      }

      if (showLigand) {
        viewer.setStyle({ hetflag: true }, { stick: { color: "0x10b981", radius: 0.15 } });
      }

      viewer.zoomTo();
      viewer.render();
      viewer.spin("y", 0.4);
      setLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [pdbData, bindingResidues, showLigand]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !loaded || !pdbDataRef.current) return;

    // If docked pose exists, do a full rebuild with docked compound
    if (dockedPose) {
      viewer.clear();
      viewer.addModel(pdbDataRef.current, "pdb");

      // Dim the protein
      viewer.setStyle({}, { cartoon: { color: "spectrum", opacity: 0.5 } });

      // Show binding site residues
      for (const resName of bindingResidues) {
        const resi = parseResi(resName);
        if (!resi) continue;
        const color = RESIDUE_COLORS[resName] || "0xfbbf24";
        viewer.setStyle({ resi }, { stick: { color, radius: 0.15 }, cartoon: { color, opacity: 0.6 } });
      }

      // Hide original ligand
      viewer.setStyle({ hetflag: true }, {});

      // Add docked compound
      viewer.addModel(dockedPose, "pdb");
      viewer.setStyle({ model: -1 }, {
        stick: { color: "0xff3366", radius: 0.3 },
        sphere: { color: "0xff3366", radius: 0.4, opacity: 0.6 },
      });

      // Add 3D label for compound name
      if (selectedCompound) {
        viewer.addLabel(selectedCompound.compound_name, {
          position: undefined,
          backgroundColor: "#1e293b",
          fontColor: "#ff3366",
          fontSize: 11,
          borderRadius: 4,
          padding: 4,
        }, { model: -1 });
      }

      viewer.zoomTo({ model: -1 }, 500);
      viewer.spin(false);
      viewer.render();
    } else {
      rebuildView();
    }
  }, [showProtein, showResidues, showLigandToggle, focusedResidue, loaded, rebuildView, dockedPose, selectedCompound]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !loaded) return;
    viewer.spin(isSpinning ? "y" : false, 0.4);
  }, [isSpinning, loaded]);

  const handleResidueClick = (res: string) => {
    if (focusedResidue === res) {
      setFocusedResidue(null);
      setIsSpinning(true);
    } else {
      setFocusedResidue(res);
      setIsSpinning(false);
    }
  };

  const tox = selectedCompound && toxicityMap
    ? toxicityMap.get(selectedCompound.compound_id)
    : undefined;

  return (
    <div className="glow-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div ref={containerRef} className="h-[320px] w-full sm:h-[400px] lg:h-[480px]" style={{ position: "relative" }} />

      {!loaded && pdbData && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-xs text-slate-400">Loading protein structure...</span>
          </div>
        </div>
      )}

      {!pdbData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
          <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span className="text-sm text-slate-400">Select a target to view 3D structure</span>
        </div>
      )}

      {selectedCompound && onClearSelection && (
        <CompoundOverlay compound={selectedCompound} toxicity={tox} onClose={onClearSelection} referenceDrugName={referenceDrugName} />
      )}

      {dockingLoading && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-blue-200 bg-white/90 px-3 py-2 text-xs text-blue-600 shadow-sm backdrop-blur-sm">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Docking compound...
        </div>
      )}

      {/* View controls */}
      {loaded && (
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          <ViewToggle label="Protein" active={showProtein} color="#60a5fa" onToggle={() => setShowProtein((v) => !v)} />
          <ViewToggle label="Binding Site" active={showResidues} color="#fbbf24" onToggle={() => setShowResidues((v) => !v)} />
          {showLigand && (
            <ViewToggle label="Pocket Reference" active={showLigandToggle} color="#10b981" onToggle={() => setShowLigandToggle((v) => !v)} />
          )}
          <ViewToggle label="Spin" active={isSpinning} color="#94a3b8" onToggle={() => setIsSpinning((v) => !v)} />
        </div>
      )}

      {/* Bottom: clickable residue badges with tooltips */}
      {loaded && showResidues && !selectedCompound && (
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {bindingResidues.map((res) => {
            const color = RESIDUE_COLORS[res];
            const hexColor = color ? `#${color.replace("0x", "")}` : "#fbbf24";
            const isFocused = focusedResidue === res;
            const tip = RESIDUE_TIPS[res];

            return (
              <Tooltip key={res} text={tip}>
                <button
                  onClick={() => handleResidueClick(res)}
                  className={`rounded-md border px-2.5 py-1 text-[10px] font-medium backdrop-blur-sm transition-all ${
                    isFocused ? "scale-110 shadow-lg" : "hover:scale-105"
                  }`}
                  style={{
                    borderColor: isFocused ? hexColor : `${hexColor}40`,
                    backgroundColor: isFocused ? `${hexColor}30` : `${hexColor}15`,
                    color: hexColor,
                    boxShadow: isFocused ? `0 0 12px ${hexColor}40` : undefined,
                  }}
                >
                  {res}
                  {isFocused && " ×"}
                </button>
              </Tooltip>
            );
          })}
          {showLigand && showLigandToggle && (
            <Tooltip text={getLigandTip(ligandId)}>
              <button
                onClick={() => {
                  if (focusedResidue === "__ligand") {
                    setFocusedResidue(null);
                    setIsSpinning(true);
                  } else {
                    setFocusedResidue("__ligand");
                    setIsSpinning(false);
                    const viewer = viewerRef.current;
                    if (viewer) {
                      viewer.zoomTo({ hetflag: true }, 500);
                      viewer.render();
                    }
                  }
                }}
                className={`rounded-md border px-2.5 py-1 text-[10px] font-medium text-emerald-400 backdrop-blur-sm transition-all ${
                  focusedResidue === "__ligand" ? "scale-110 border-emerald-400 bg-emerald-500/30 shadow-lg shadow-emerald-500/20" : "border-emerald-500/30 bg-emerald-500/10 hover:scale-105"
                }`}
              >
                Pocket Ref.{focusedResidue === "__ligand" ? " ×" : ""}
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {loaded && (
        <div className="absolute bottom-3 right-3 rounded-md border border-slate-200/80 bg-white/80 px-2 py-1 text-[10px] text-slate-400 backdrop-blur-sm">
          {focusedResidue ? "Click badge again to reset" : "Click residue to zoom"}
        </div>
      )}
    </div>
  );
}

function Tooltip({ text, children }: { text?: string; children: React.ReactNode }) {
  if (!text) return <>{children}</>;
  return (
    <div className="group/tip relative">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover/tip:opacity-100">
        <div className="max-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] leading-relaxed text-slate-600 shadow-lg">
          {text}
        </div>
        <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-slate-200 bg-white" />
      </div>
    </div>
  );
}

function ViewToggle({ label, active, color, onToggle }: { label: string; active: boolean; color: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] font-medium backdrop-blur-sm transition-all ${
        active ? "border-slate-300 bg-white/90 text-slate-700 shadow-sm" : "border-slate-200/60 bg-white/60 text-slate-400"
      }`}
    >
      <div
        className={`h-2 w-2 rounded-sm transition-opacity ${active ? "opacity-100" : "opacity-30"}`}
        style={{ backgroundColor: color }}
      />
      {label}
    </button>
  );
}
