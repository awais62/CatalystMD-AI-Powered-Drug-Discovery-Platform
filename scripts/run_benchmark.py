"""
Run a real explicit-solvent benchmark on AMD MI300X.
Saves results to data/precomputed/benchmark_explicit.json.

Usage: cd CatalystMD && python scripts/run_benchmark.py
"""
import json
import subprocess
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.simulation.openmm_runner import download_pdb, run_binding_simulation
from backend.config import PRECOMPUTED_DIR, DATA_DIR

PDB_ID = "6LU7"
BENCHMARK_FILE = DATA_DIR / "precomputed" / "benchmark_explicit.json"


def get_gpu_memory():
    """Get GPU memory usage from rocm-smi."""
    try:
        out = subprocess.check_output(
            ["rocm-smi", "--showmeminfo", "vram"], text=True
        )
        for line in out.splitlines():
            if "Used" in line:
                parts = line.split()
                for i, p in enumerate(parts):
                    if p == "Used":
                        # Next numeric value is the amount
                        for v in parts[i+1:]:
                            try:
                                return int(v)
                            except ValueError:
                                continue
    except Exception:
        pass
    return None


def main():
    print("=" * 60)
    print("CatalystMD Explicit Solvent Benchmark")
    print("=" * 60)
    print(f"Target: {PDB_ID} (COVID-19 Main Protease)")
    print(f"Solvent: TIP3P explicit water, 1.0nm padding")
    print(f"Method: Energy minimization (1000 iterations)")
    print(f"GPU: AMD MI300X via OpenCL")
    print()

    # Download PDB
    print("Downloading protein structure...")
    pdb_path = download_pdb(PDB_ID)
    print(f"  PDB: {pdb_path}")

    # Get baseline GPU memory
    mem_before = get_gpu_memory()
    if mem_before is not None:
        print(f"  GPU memory before: {mem_before / (1024**2):.0f} MB")

    # Run explicit solvent minimization
    print()
    print("Running explicit solvent minimization...")
    print("  (This takes ~15-20 minutes for ~85K atoms)")
    print()

    total_start = time.perf_counter()
    result = run_binding_simulation(
        str(pdb_path),
        minimization_only=True,
        solvent_padding_nm=1.0,
    )
    total_elapsed = time.perf_counter() - total_start

    # Get GPU memory during/after
    mem_after = get_gpu_memory()
    gpu_memory_used_mb = None
    if mem_before is not None and mem_after is not None:
        gpu_memory_used_mb = (mem_after - mem_before) / (1024**2)

    # Build benchmark result
    benchmark = {
        "pdb_id": PDB_ID,
        "protein_name": "SARS-CoV-2 Main Protease",
        "atom_count": result["atom_count"],
        "solvent_padding_nm": result["solvent_padding_nm"],
        "method": result["method"],
        "platform": result["platform"],
        "wall_time_seconds": result["wall_time_seconds"],
        "total_time_seconds": round(total_elapsed, 2),
        "potential_energy_kj_mol": round(result["potential_energy_kj_mol"], 1),
        "gpu_memory_used_mb": round(gpu_memory_used_mb, 0) if gpu_memory_used_mb else None,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
    }

    # Save
    BENCHMARK_FILE.parent.mkdir(parents=True, exist_ok=True)
    BENCHMARK_FILE.write_text(json.dumps(benchmark, indent=2))

    # Report
    print()
    print("=" * 60)
    print("BENCHMARK RESULTS")
    print("=" * 60)
    print(f"  Atoms:          {benchmark['atom_count']:,}")
    print(f"  Solvent:        TIP3P, {benchmark['solvent_padding_nm']}nm padding")
    print(f"  Platform:       {benchmark['platform']}")
    print(f"  Method:         {benchmark['method']}")
    print(f"  Minimization:   {benchmark['wall_time_seconds']:.1f}s")
    print(f"  Total time:     {benchmark['total_time_seconds']:.1f}s (includes prep)")
    print(f"  Energy:         {benchmark['potential_energy_kj_mol']:.1f} kJ/mol")
    if benchmark["gpu_memory_used_mb"]:
        print(f"  GPU memory:     {benchmark['gpu_memory_used_mb']:.0f} MB")
    print(f"  Saved to:       {BENCHMARK_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
