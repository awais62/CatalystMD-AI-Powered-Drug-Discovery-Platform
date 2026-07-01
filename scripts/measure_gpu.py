"""
Measure real GPU stats during OpenMM simulation for each protein target.
Captures rocm-smi output before, during, and after simulation.
Saves proof logs to data/gpu_measurements/

Usage: cd CatalystMD && python scripts/measure_gpu.py
"""
import json
import subprocess
import sys
import os
import time
import threading

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.simulation.openmm_runner import download_pdb, run_binding_simulation
from backend.config import DATA_DIR

MEASUREMENTS_DIR = DATA_DIR / "gpu_measurements"
MEASUREMENTS_DIR.mkdir(parents=True, exist_ok=True)

TARGETS = {
    "6LU7": "SARS-CoV-2 Main Protease",
    "6OIM": "KRAS G12C (Lung Cancer)",
    "1M17": "EGFR Kinase (Lung Cancer)",
    "1HIV": "HIV-1 Protease",
}


def capture_rocm_smi():
    """Capture full rocm-smi output."""
    try:
        out = subprocess.check_output(["rocm-smi", "--showallinfo"], text=True, timeout=10)
        return out
    except Exception as e:
        return f"rocm-smi error: {e}"


def capture_gpu_metrics():
    """Capture key GPU metrics."""
    metrics = {"timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())}
    try:
        # Temperature
        out = subprocess.check_output(["rocm-smi", "--showtemp"], text=True, timeout=5)
        for line in out.splitlines():
            if "Temperature" in line and "junction" in line.lower():
                parts = line.split()
                for p in parts:
                    try:
                        metrics["temperature_c"] = float(p)
                        break
                    except ValueError:
                        continue
    except Exception:
        pass

    try:
        # Power
        out = subprocess.check_output(["rocm-smi", "--showpower"], text=True, timeout=5)
        for line in out.splitlines():
            if "Average" in line or "Current" in line:
                parts = line.split()
                for p in parts:
                    try:
                        val = float(p)
                        if val > 10:  # likely watts
                            metrics["power_watts"] = val
                            break
                    except ValueError:
                        continue
    except Exception:
        pass

    try:
        # Memory
        out = subprocess.check_output(["rocm-smi", "--showmeminfo", "vram"], text=True, timeout=5)
        for line in out.splitlines():
            if "Used" in line:
                parts = line.split()
                for i, p in enumerate(parts):
                    if p == "Used":
                        for v in parts[i+1:]:
                            try:
                                metrics["vram_used_bytes"] = int(v)
                                metrics["vram_used_mb"] = round(int(v) / (1024**2))
                                break
                            except ValueError:
                                continue
            if "Total" in line:
                parts = line.split()
                for i, p in enumerate(parts):
                    if p == "Total":
                        for v in parts[i+1:]:
                            try:
                                metrics["vram_total_bytes"] = int(v)
                                metrics["vram_total_gb"] = round(int(v) / (1024**3), 1)
                                break
                            except ValueError:
                                continue
    except Exception:
        pass

    try:
        # GPU utilization
        out = subprocess.check_output(["rocm-smi", "--showuse"], text=True, timeout=5)
        for line in out.splitlines():
            if "GPU use" in line:
                parts = line.split()
                for p in parts:
                    try:
                        val = float(p.rstrip("%"))
                        metrics["gpu_utilization_pct"] = val
                        break
                    except ValueError:
                        continue
    except Exception:
        pass

    return metrics


def monitor_gpu_during(duration_seconds, interval=2):
    """Capture GPU metrics every N seconds during simulation."""
    snapshots = []
    stop_event = threading.Event()

    def collector():
        while not stop_event.is_set():
            snapshots.append(capture_gpu_metrics())
            stop_event.wait(interval)

    thread = threading.Thread(target=collector, daemon=True)
    thread.start()
    return stop_event, snapshots


def main():
    print("=" * 60)
    print("CatalystMD GPU Measurement Suite")
    print("=" * 60)

    # Baseline GPU state
    print("\nCapturing baseline GPU state...", flush=True)
    baseline = capture_gpu_metrics()
    print(f"  Temp: {baseline.get('temperature_c', 'N/A')}C")
    print(f"  Power: {baseline.get('power_watts', 'N/A')}W")
    print(f"  VRAM: {baseline.get('vram_used_mb', 'N/A')}MB / {baseline.get('vram_total_gb', 'N/A')}GB")
    print(f"  GPU%: {baseline.get('gpu_utilization_pct', 'N/A')}%")

    all_measurements = {"baseline": baseline, "targets": {}}

    for pdb_id, name in TARGETS.items():
        print(f"\n{'=' * 60}")
        print(f"Measuring: {name} ({pdb_id})")
        print(f"{'=' * 60}", flush=True)

        pdb_path = download_pdb(pdb_id)

        # Before (capture baseline VRAM with vLLM running)
        before = capture_gpu_metrics()
        vram_before = before.get("vram_used_mb", 0)

        # Start GPU monitoring
        stop_event, snapshots = monitor_gpu_during(999, interval=3)

        # Run explicit solvent minimization with 2nm padding for higher atom counts
        print(f"  Running explicit solvent minimization (2nm padding)...", flush=True)
        sim_start = time.perf_counter()
        try:
            result = run_binding_simulation(
                str(pdb_path),
                minimization_only=True,
                solvent_padding_nm=2.0,
            )
            sim_time = time.perf_counter() - sim_start
            success = True
        except Exception as e:
            sim_time = time.perf_counter() - sim_start
            result = {"error": str(e)}
            success = False

        # Stop monitoring
        stop_event.set()
        time.sleep(1)

        # After
        after = capture_gpu_metrics()

        # Compute peak metrics from snapshots
        peak_gpu_pct = max((s.get("gpu_utilization_pct", 0) for s in snapshots), default=0)
        peak_power = max((s.get("power_watts", 0) for s in snapshots), default=0)
        peak_vram_total = max((s.get("vram_used_mb", 0) for s in snapshots), default=0)
        # Delta = simulation VRAM only (subtract vLLM baseline)
        vram_delta_mb = peak_vram_total - vram_before if vram_before > 0 else 0

        measurement = {
            "protein": name,
            "pdb_id": pdb_id,
            "success": success,
            "before": before,
            "after": after,
            "snapshots": snapshots,
            "peak_gpu_utilization_pct": peak_gpu_pct,
            "peak_power_watts": peak_power,
            "peak_vram_mb": peak_vram_total,
            "vram_delta_mb": max(0, vram_delta_mb),
            "vram_baseline_mb": vram_before,
            "simulation": result if success else {"error": result.get("error")},
            "wall_time_seconds": round(sim_time, 2),
        }

        all_measurements["targets"][pdb_id] = measurement

        if success:
            print(f"  Atoms: {result.get('atom_count', 'N/A'):,}")
            print(f"  Time: {result.get('wall_time_seconds', 'N/A')}s")
            print(f"  Platform: {result.get('platform', 'N/A')}")
            print(f"  Peak GPU%: {peak_gpu_pct}%")
            print(f"  Peak Power: {peak_power}W")
            print(f"  Simulation VRAM: {vram_delta_mb:.0f}MB (delta from baseline)")
        else:
            print(f"  FAILED: {result.get('error')}")

    # Save all measurements
    output_file = MEASUREMENTS_DIR / "gpu_measurements.json"
    output_file.write_text(json.dumps(all_measurements, indent=2))
    print(f"\n{'=' * 60}")
    print(f"All measurements saved to: {output_file}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
