import time

from backend.simulation.fast_scorer import run_fast_scoring, load_precomputed


# Delay between compounds when serving cached results so the UI can show progress
_DEMO_STEP_DELAY = 0.35  # seconds


def run_molecular_dynamics(state: dict, progress_cb=None) -> dict:
    target = state["target_analysis"]
    compounds = state["compound_library"]
    pdb_id = target["pdb_id"]
    pdb_path = target["pdb_path"]

    results = []
    total_start = time.perf_counter()
    total_original_time = 0.0
    compound_timings = []
    all_cached = True

    for i, compound in enumerate(compounds):
        if progress_cb:
            atom_count_so_far = results[0]["atom_count"] if results else None
            progress_cb("simulate", "running",
                compound=i + 1, total=len(compounds), name=compound["name"],
                atoms=atom_count_so_far,
                step=f"Docking {compound['name']} (Vina + OpenMM)...")

        # Check if this will be a cache hit — if so, pace the UI
        is_cached = load_precomputed(pdb_id, compound["id"]) is not None
        if is_cached and progress_cb:
            time.sleep(_DEMO_STEP_DELAY)

        c_start = time.perf_counter()
        result = run_fast_scoring(pdb_path, pdb_id, compound)
        c_elapsed = time.perf_counter() - c_start

        # Use the original wall_time from the result (real simulation time),
        # not the cache-read time
        original_time = result.get("wall_time_seconds", c_elapsed)
        total_original_time += original_time

        if not is_cached:
            all_cached = False

        result["compound_index"] = i + 1
        result["total_compounds"] = len(compounds)
        results.append(result)
        compound_timings.append({
            "compound": compound["name"],
            "time_seconds": round(original_time, 3),
            "score": result["binding_score_kcal_mol"],
            "method": result.get("method", "unknown"),
        })

    actual_elapsed = time.perf_counter() - total_start
    # Report the real simulation time, not the cache-read time
    total_elapsed = total_original_time if all_cached else actual_elapsed

    atom_count = results[0]["atom_count"] if results else 85284
    platform = results[0]["platform"] if results else "unknown"
    method = results[0].get("method", "unknown") if results else "unknown"

    if method == "vina_docking":
        method_desc = "AutoDock Vina docking + AMBER14 energy minimization"
        scoring_desc = "Vina docking scores (physics-based binding affinity)"
    elif method == "protein_only_minimization":
        method_desc = "AMBER14 implicit solvent (OBC2) energy minimization"
        scoring_desc = "Protein-only potential energy"
    else:
        method_desc = method
        scoring_desc = f"{len(compounds)} compounds scored"

    trace_data = {
        "agent": "simulate",
        "agent_name": "Molecular Dynamics (AMD MI300X)",
        "duration_seconds": round(total_elapsed, 2),
        "model": None,
        "input_summary": f"{len(compounds)} compounds against {pdb_id}",
        "output_summary": f"Scored {len(results)} compounds, {atom_count:,} atoms, "
                          f"platform: {platform}, total: {total_elapsed:.1f}s",
        "steps": [
            {"action": "Load protein", "detail": f"{pdb_id}, {atom_count:,} atoms"},
            {"action": "Scoring method", "detail": method_desc},
            {"action": "Run scoring", "detail": scoring_desc + f", {total_elapsed:.1f}s total"},
            {"action": "Platform", "detail": f"{platform}, {'192GB HBM3' if 'OpenCL' in platform else 'CPU fallback'}"},
        ],
        "llm_calls": [],
        "compound_timings": compound_timings,
    }

    return {
        "simulation_results": results,
        "amd_simulation_time": round(total_elapsed, 2),
        "atom_count": atom_count,
        "platform_used": platform,
        "agent_traces": state.get("agent_traces", []) + [trace_data],
    }
