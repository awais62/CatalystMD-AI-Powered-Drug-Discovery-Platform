"use client";

interface TargetSelectorProps {
  selectedTarget: string;
  onTargetChange: (pdbId: string) => void;
  onRun: () => void;
  compoundCount: number;
  disabled: boolean;
}

const TARGETS = [
  { pdb_id: "6LU7", name: "COVID-19 Main Protease", desc: "SARS-CoV-2 Mpro, Paxlovid target", category: "Antiviral" },
  { pdb_id: "6OIM", name: "KRAS G12C (Lung Cancer)", desc: "Oncogene, Sotorasib (Lumakras) target", category: "Cancer" },
  { pdb_id: "1M17", name: "EGFR Kinase (Lung Cancer)", desc: "Receptor kinase, Erlotinib (Tarceva) target", category: "Cancer" },
  { pdb_id: "1HIV", name: "HIV-1 Protease", desc: "Classic antiretroviral target", category: "Antiviral" },
];

export default function TargetSelector({ selectedTarget, onTargetChange, onRun, compoundCount, disabled }: TargetSelectorProps) {
  const selectedInfo = TARGETS.find((t) => t.pdb_id === selectedTarget);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="mb-1 block text-sm font-semibold text-slate-900">Target Protein</label>
      <p className="mb-3 text-xs text-slate-400">{selectedInfo?.desc}</p>
      <select
        value={selectedTarget}
        onChange={(e) => onTargetChange(e.target.value)}
        disabled={disabled}
        className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
      >
        {TARGETS.map((t) => (
          <option key={t.pdb_id} value={t.pdb_id}>
            {t.category === "Cancer" ? "🧬 " : "🦠 "}{t.name} ({t.pdb_id})
          </option>
        ))}
      </select>

      <div className="mb-5 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-500">{compoundCount} compounds</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span className="text-xs text-slate-500">AMD MI300X</span>
        </div>
        {selectedInfo?.category === "Cancer" && (
          <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[10px] font-medium text-purple-600">
            Oncology
          </span>
        )}
      </div>

      <button
        onClick={onRun}
        disabled={disabled}
        className="group relative w-full overflow-hidden rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Run Discovery Pipeline on AMD MI300X
      </button>
    </div>
  );
}
