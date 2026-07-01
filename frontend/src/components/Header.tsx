"use client";

import type { AppState } from "@/lib/types";

const STATUS_CONFIG = {
  idle: { label: "READY", color: "bg-emerald-500", text: "text-emerald-600" },
  running: { label: "SIMULATING", color: "bg-blue-500 animate-pulse", text: "text-blue-600" },
  completed: { label: "COMPLETE", color: "bg-emerald-500", text: "text-emerald-600" },
};

export default function Header({ appState }: { appState: AppState }) {
  const status = STATUS_CONFIG[appState];

  return (
    <header className="relative border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      {appState === "running" && (
        <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden">
          <div className="shimmer-bar h-full w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="CatalystMD" className="h-10 w-10 rounded-xl shadow-md shadow-blue-500/20" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              CatalystMD
            </h1>
            <p className="text-[11px] tracking-wide text-slate-400">
              AI Drug Discovery on AMD MI300X
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 sm:flex">
            {["Qwen 2.5-7B", "MI300X", "192GB HBM3"].map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            <div className="relative">
              <div className={`h-2 w-2 rounded-full ${status.color}`} />
              {appState === "running" && (
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-blue-500 pulse-ring" />
              )}
            </div>
            <span className={`text-xs font-semibold tracking-wider ${status.text}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
