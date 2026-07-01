"use client";

import { useState } from "react";

interface DiscoveryBriefProps {
  brief: string;
}

export default function DiscoveryBrief({ brief }: DiscoveryBriefProps) {
  const [expanded, setExpanded] = useState(false);

  const lines = brief.split("\n");
  const preview = lines.slice(0, 25).join("\n");

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
    <div className="animate-fade-in animate-fade-in-delay-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Discovery Brief
        </h3>
        <button
          onClick={handleDownload}
          className="group flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-all hover:border-blue-300 hover:text-blue-600"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download .txt
        </button>
      </div>

      <div className="relative">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-5 font-mono text-xs leading-relaxed text-slate-600">
          {expanded ? brief : preview}
        </pre>
        {!expanded && lines.length > 25 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 rounded-b-xl bg-gradient-to-t from-white to-transparent" />
        )}
      </div>

      {lines.length > 25 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          {expanded ? (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              Show all ({lines.length} lines)
            </>
          )}
        </button>
      )}
    </div>
  );
}
