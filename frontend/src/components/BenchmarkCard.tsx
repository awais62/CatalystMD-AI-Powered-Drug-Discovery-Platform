"use client";

import { useEffect, useState } from "react";
import type { Benchmark } from "@/lib/types";
import { fetchExplicitBenchmark, fetchGpuMeasurements } from "@/lib/api";

interface BenchmarkCardProps {
  benchmark: Benchmark;
}

interface GpuMeasurement {
  pdb_id: string;
  protein: string;
  atom_count: number;
  wall_time_seconds: number;
  peak_gpu_pct: number;
  peak_power_watts: number;
  peak_vram_mb: number;
  platform: string;
}

export default function BenchmarkCard({ benchmark }: BenchmarkCardProps) {
  const perCompound = benchmark.total_compounds > 0 ? benchmark.simulation_time_seconds / benchmark.total_compounds : 0;
  const isGPU = benchmark.platform?.includes("OpenCL");

  const [explicitBench, setExplicitBench] = useState<any>(null);
  const [gpuMeasurements, setGpuMeasurements] = useState<GpuMeasurement[] | null>(null);

  useEffect(() => {
    fetchExplicitBenchmark().then(setExplicitBench);
    fetchGpuMeasurements().then((data) => {
      if (data?.measurements) setGpuMeasurements(data.measurements);
    });
  }, []);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Current run stats */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-2 w-2 rounded-sm bg-blue-600" />
          <span className="text-sm font-bold text-blue-700">This Run: Quick Screen</span>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
            {isGPU ? "AMD MI300X OpenCL" : benchmark.platform}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="rounded-lg bg-white p-3 text-center">
            <div className="text-lg font-bold tracking-tight text-blue-600">{benchmark.atom_count.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400">atoms</div>
          </div>
          <div className="rounded-lg bg-white p-3 text-center">
            <div className="text-lg font-bold tracking-tight text-blue-600">{benchmark.simulation_time_seconds.toFixed(1)}s</div>
            <div className="text-[10px] text-slate-400">total time</div>
          </div>
          <div className="rounded-lg bg-white p-3 text-center">
            <div className="text-lg font-bold tracking-tight text-blue-600">{perCompound.toFixed(1)}s</div>
            <div className="text-[10px] text-slate-400">per compound</div>
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Method</span>
            <span className="font-mono text-slate-700">{benchmark.method === "vina_docking" ? "Vina docking + AMBER14 minimization" : "Implicit solvent (OBC2)"}</span>
          </div>
          <div className="flex justify-between">
            <span>Compounds screened</span>
            <span className="font-mono text-slate-700">{benchmark.total_compounds}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="font-mono text-slate-700">{isGPU ? "AMD MI300X (192GB HBM3)" : benchmark.platform}</span>
          </div>
        </div>
      </div>

      {/* GPU Measurements - all proteins */}
      {gpuMeasurements && gpuMeasurements.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-sm bg-emerald-500" />
            <span className="text-sm font-bold text-slate-700">GPU Benchmarks (Explicit Solvent)</span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
              Measured on MI300X
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 text-left font-medium text-slate-500">Protein</th>
                  <th className="pb-2 text-right font-medium text-slate-500">Atoms</th>
                  <th className="pb-2 text-right font-medium text-slate-500">Time</th>
                  <th className="pb-2 text-right font-medium text-slate-500">GPU</th>
                  <th className="pb-2 text-right font-medium text-slate-500">Power</th>
                </tr>
              </thead>
              <tbody>
                {gpuMeasurements.map((m) => (
                  <tr key={m.pdb_id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">
                      <div className="font-medium">{m.protein.split("(")[0].trim()}</div>
                      <div className="text-[10px] text-slate-400">{m.pdb_id}</div>
                    </td>
                    <td className="py-2 text-right font-mono text-slate-700">{m.atom_count.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-slate-700">{(m.wall_time_seconds / 60).toFixed(1)}m</td>
                    <td className="py-2 text-right">
                      <span className="font-mono font-bold text-emerald-600">{m.peak_gpu_pct}%</span>
                    </td>
                    <td className="py-2 text-right font-mono text-slate-700">{m.peak_power_watts}W</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-2">
            {gpuMeasurements.map((m) => (
              <div key={m.pdb_id} className="flex items-center gap-2">
                <span className="w-12 text-[10px] text-slate-400">{m.pdb_id}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(m.atom_count / 120000) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-500">{m.atom_count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Explicit solvent (TIP3P, 1nm padding). All runs at 100% GPU utilization on AMD MI300X OpenCL.
          </p>
        </div>
      )}

      {/* Production scale note */}
      <div className="rounded-xl bg-slate-50 p-3">
        <div className="text-xs font-bold text-slate-700">Why AMD MI300X</div>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
          MI300X's 192GB HBM3 runs both the Qwen 2.5-7B LLM (via vLLM) and OpenMM physics simulations simultaneously on a single GPU.
          Larger drug discovery systems (300K-800K atoms with 5nm explicit solvent) benefit from high-memory GPUs to avoid multi-GPU communication overhead.
        </p>
      </div>
    </div>
  );
}
