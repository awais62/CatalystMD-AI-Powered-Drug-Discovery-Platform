"use client";

const THEMES = [
  {
    name: "Clinical White",
    subtitle: "Clean / Medical / Light",
    bg: "#f8f9fc",
    card: "#ffffff",
    border: "#e2e5ef",
    primary: "#2563eb",
    primaryMuted: "#1e40af",
    secondary: "#60a5fa",
    success: "#059669",
    danger: "#dc2626",
    text: "#1e293b",
    textMuted: "#64748b",
    badge1: "#d97706",
    badge2: "#dc2626",
    badge3: "#7c3aed",
    badge4: "#0891b2",
  },
  {
    name: "Warm Ivory",
    subtitle: "Pharmaceutical / Warm Light",
    bg: "#faf8f4",
    card: "#ffffff",
    border: "#e8e2d6",
    primary: "#b45309",
    primaryMuted: "#92400e",
    secondary: "#d97706",
    success: "#15803d",
    danger: "#b91c1c",
    text: "#292524",
    textMuted: "#78716c",
    badge1: "#b45309",
    badge2: "#b91c1c",
    badge3: "#6d28d9",
    badge4: "#0e7490",
  },
  {
    name: "Soft Sage",
    subtitle: "Biotech / Nature / Light",
    bg: "#f5f7f4",
    card: "#ffffff",
    border: "#d4ddd2",
    primary: "#16a34a",
    primaryMuted: "#15803d",
    secondary: "#22c55e",
    success: "#059669",
    danger: "#ea580c",
    text: "#1a2e1a",
    textMuted: "#5c7a5c",
    badge1: "#ca8a04",
    badge2: "#dc2626",
    badge3: "#7c3aed",
    badge4: "#0891b2",
  },
  {
    name: "Midnight Gold",
    subtitle: "Pharmaceutical / Premium",
    bg: "#0c0f1a",
    card: "#141829",
    border: "#2a2d3a",
    primary: "#d4a855",
    primaryMuted: "#7c6b3e",
    secondary: "#e8c876",
    success: "#5cb270",
    danger: "#c75c5c",
    text: "#e2e0d8",
    textMuted: "#8a8778",
    badge1: "#d4a855",
    badge2: "#c75c5c",
    badge3: "#7c6b3e",
    badge4: "#5cb270",
  },
  {
    name: "Deep Emerald",
    subtitle: "Molecular Biology",
    bg: "#0a1210",
    card: "#0f1f1a",
    border: "#1a3a2e",
    primary: "#34d399",
    primaryMuted: "#065f46",
    secondary: "#6ee7b7",
    success: "#10b981",
    danger: "#f59e0b",
    text: "#d1fae5",
    textMuted: "#6b8f7f",
    badge1: "#34d399",
    badge2: "#f59e0b",
    badge3: "#065f46",
    badge4: "#6ee7b7",
  },
  {
    name: "Violet Lab",
    subtitle: "Modern Chemistry",
    bg: "#0f0a1a",
    card: "#1a1329",
    border: "#2d2340",
    primary: "#a78bfa",
    primaryMuted: "#7c3aed",
    secondary: "#c4b5fd",
    success: "#34d399",
    danger: "#f87171",
    text: "#ede9fe",
    textMuted: "#8b7faa",
    badge1: "#a78bfa",
    badge2: "#f87171",
    badge3: "#7c3aed",
    badge4: "#34d399",
  },
];

function MockDashboard({ theme }: { theme: typeof THEMES[0] }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: theme.bg, borderColor: theme.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: theme.border, background: `${theme.card}cc` }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryMuted})` }}>
            DF
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: theme.text }}>DrugForge</div>
            <div className="text-[10px]" style={{ color: theme.textMuted }}>AI Drug Discovery on AMD MI300X</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["Qwen 2.5-7B", "MI300X"].map((t) => (
            <span key={t} className="rounded-md border px-2 py-0.5 text-[9px]" style={{ borderColor: theme.border, color: theme.textMuted }}>{t}</span>
          ))}
          <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5" style={{ borderColor: theme.border }}>
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: theme.success }} />
            <span className="text-[10px] font-semibold" style={{ color: theme.success }}>READY</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Top hit banner */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: `${theme.primary}30`, background: `${theme.primary}08` }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black" style={{ background: `${theme.primary}20`, color: theme.primary }}>
            #1
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: theme.text }}>GC-376</div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-mono font-bold" style={{ color: theme.primary }}>-8.82 kcal/mol</span>
              <span style={{ color: theme.textMuted }}>&middot;</span>
              <span className="font-semibold" style={{ color: theme.success }}>STRONGER than Paxlovid</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Protein viewer mock */}
          <div className="col-span-3 rounded-xl border p-4" style={{ borderColor: theme.border, background: `${theme.card}80` }}>
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg" style={{ background: `${theme.bg}` }}>
              <div className="text-3xl">🧬</div>
              <div className="text-xs" style={{ color: theme.textMuted }}>3D Protein Viewer</div>
            </div>
            <div className="mt-3 flex gap-1.5">
              {["His41", "Cys145", "Glu166", "His164"].map((res, i) => (
                <span key={res} className="rounded-md border px-2 py-0.5 text-[9px] font-medium" style={{
                  borderColor: `${theme[`badge${i+1}` as keyof typeof theme]}40`,
                  background: `${theme[`badge${i+1}` as keyof typeof theme]}15`,
                  color: theme[`badge${i+1}` as keyof typeof theme] as string,
                }}>
                  {res}
                </span>
              ))}
            </div>
          </div>

          {/* Tabs mock */}
          <div className="col-span-2 rounded-xl border" style={{ borderColor: theme.border, background: `${theme.card}80` }}>
            <div className="flex border-b px-1" style={{ borderColor: theme.border }}>
              {["Overview", "Analysis", "Agents"].map((tab, i) => (
                <div key={tab} className="relative px-3 py-2.5 text-[10px] font-medium" style={{ color: i === 0 ? theme.primary : theme.textMuted }}>
                  {tab}
                  {i === 0 && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: theme.primary }} />}
                </div>
              ))}
            </div>
            <div className="p-3">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: "20", label: "Screened" },
                  { val: "GC-376", label: "Top Hit" },
                  { val: "-8.82", label: "kcal/mol" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: `${theme.bg}` }}>
                    <div className="text-sm font-bold" style={{ color: theme.primary }}>{s.val}</div>
                    <div className="text-[8px]" style={{ color: theme.textMuted }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Agent traces mock */}
              <div className="mt-3 space-y-1.5">
                {["Target Identifier", "Molecular Dynamics", "Binding Scorer"].map((agent, i) => (
                  <div key={agent} className="flex items-center justify-between rounded-lg border p-2" style={{ borderColor: theme.border, background: `${theme.success}08` }}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded" style={{ background: `${theme.success}20` }}>
                        <span className="text-[8px]" style={{ color: theme.success }}>✓</span>
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: theme.text }}>{agent}</span>
                    </div>
                    {i === 2 && <span className="rounded px-1 py-0.5 text-[8px]" style={{ background: `${theme.primary}15`, color: theme.primary }}>LLM</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rankings mock */}
        <div className="mt-4 rounded-xl border p-3" style={{ borderColor: theme.border, background: `${theme.card}80` }}>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>Binding Rankings</div>
          <div className="space-y-1">
            {[
              { rank: 1, name: "GC-376", score: "-8.82", vs: "stronger" },
              { rank: 2, name: "Nirmatrelvir (Paxlovid)", score: "-8.45", vs: "similar" },
              { rank: 3, name: "N3 (crystal ligand)", score: "-8.13", vs: "weaker" },
            ].map((r) => (
              <div key={r.rank} className="flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: r.rank === 1 ? `${theme.primary}08` : "transparent" }}>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold" style={{
                    background: r.rank === 1 ? `${theme.primary}20` : `${theme.border}`,
                    color: r.rank === 1 ? theme.primary : theme.textMuted,
                  }}>{r.rank}</span>
                  <span className="text-[11px]" style={{ color: r.rank === 1 ? theme.text : theme.textMuted }}>{r.name}</span>
                  {r.rank === 1 && <span className="rounded px-1 py-0.5 text-[8px] font-bold" style={{ background: `${theme.primary}15`, color: theme.primary }}>TOP HIT</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px]" style={{ color: r.rank === 1 ? theme.primary : theme.textMuted }}>{r.score}</span>
                  <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{
                    background: r.vs === "stronger" ? `${theme.success}15` : r.vs === "similar" ? `${theme.textMuted}15` : `${theme.danger}15`,
                    color: r.vs === "stronger" ? theme.success : r.vs === "similar" ? theme.textMuted : theme.danger,
                  }}>
                    {r.vs === "stronger" ? "↑ Stronger" : r.vs === "similar" ? "≈ Similar" : "↓ Weaker"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benchmark mock */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border p-3" style={{ borderColor: `${theme.primary}20`, background: `${theme.primary}05` }}>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm" style={{ background: theme.primary }} />
              <span className="text-[10px] font-bold" style={{ color: theme.primary }}>AMD MI300X</span>
            </div>
            <div className="mt-1 text-lg font-bold" style={{ color: theme.text }}>192GB</div>
            <div className="text-[9px]" style={{ color: theme.textMuted }}>18.3 min · 85K atoms</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: `${theme.danger}20`, background: `${theme.danger}05` }}>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm" style={{ background: theme.danger }} />
              <span className="text-[10px] font-bold" style={{ color: theme.danger }}>NVIDIA H100</span>
            </div>
            <div className="mt-1 text-sm font-bold" style={{ color: theme.danger }}>NOT FEASIBLE</div>
            <div className="text-[9px]" style={{ color: theme.textMuted }}>Exceeds 80GB capacity</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemesPage() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-2xl font-bold text-white">DrugForge — Color Palette Preview</h1>
        <p className="mb-3 text-sm text-slate-500">Pick one. Each shows the full dashboard layout with that palette.</p>
        <p className="mb-10 text-xs text-slate-600">Light themes first, then dark themes below.</p>

        <div className="space-y-12">
          {THEMES.map((theme) => (
            <div key={theme.name}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{theme.name}</h2>
                <span className="rounded-full border border-slate-700 px-3 py-0.5 text-xs text-slate-400">{theme.subtitle}</span>
                <div className="flex gap-1">
                  {[theme.bg, theme.primary, theme.success, theme.danger, theme.textMuted].map((c, i) => (
                    <div key={i} className="h-4 w-4 rounded-full border border-slate-700" style={{ background: c }} title={c} />
                  ))}
                </div>
              </div>
              <MockDashboard theme={theme} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
