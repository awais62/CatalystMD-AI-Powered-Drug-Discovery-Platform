import time
from backend.config import QWEN_MODEL, KNOWN_TARGETS
from backend.agents.llm import call_llm


def run_binding_scorer(state: dict, progress_cb=None) -> dict:
    start = time.perf_counter()
    results = state["simulation_results"]
    target = state["target_analysis"]
    pdb_id = target["pdb_id"]

    # Get target-specific reference drug
    target_config = KNOWN_TARGETS.get(pdb_id, {})
    ref_drug_id = target_config.get("reference_drug_id", "nirmatrelvir")
    ref_drug_name = target_config.get("reference_drug_name", "Nirmatrelvir (Paxlovid)")

    if progress_cb:
        progress_cb("score_binding", "running", step=f"Ranking {len(results)} compounds...")
    ranked = sorted(results, key=lambda r: r["binding_score_kcal_mol"])

    # Find the reference drug's score
    ref_score = None
    for r in ranked:
        if r["compound_id"] == ref_drug_id:
            ref_score = r["binding_score_kcal_mol"]
            break
    if ref_score is None:
        ref_score = -8.3

    rankings = []
    for i, r in enumerate(ranked):
        delta = r["binding_score_kcal_mol"] - ref_score
        if delta < -0.2:
            comparison = "stronger"
        elif delta > 0.2:
            comparison = "weaker"
        else:
            comparison = "similar"

        rankings.append({
            "rank": i + 1,
            "compound_id": r["compound_id"],
            "compound_name": r["compound_name"],
            "binding_score_kcal_mol": r["binding_score_kcal_mol"],
            "vs_reference": comparison,
            "delta_vs_reference": round(delta, 2),
            "known_ki_nm": r.get("known_ki_nm"),
        })

    top3 = rankings[:3]
    top3_summary = "\n".join(
        f"{r['rank']}. {r['compound_name']}: {r['binding_score_kcal_mol']} kcal/mol "
        f"({r['vs_reference']} than {ref_drug_name})"
        for r in top3
    )

    prompt = (
        f"You are a computational chemist. The following compounds were screened against "
        f"{target['protein_name']} ({target['pdb_id']}). Binding scores (more negative = stronger):\n\n"
        f"{top3_summary}\n\n"
        f"{ref_drug_name} (approved drug) scored {ref_score} kcal/mol.\n"
        f"In 3-4 sentences, interpret these results for a pharmaceutical scientist."
    )

    if progress_cb:
        progress_cb("score_binding", "running", step=f"Qwen analyzing top candidates vs {ref_drug_name}...")
    llm_trace = call_llm(prompt)
    interpretation = llm_trace["response"]

    if not interpretation:
        top = top3[0]
        interpretation = (
            f"{top['compound_name']} shows the strongest estimated binding affinity at "
            f"{top['binding_score_kcal_mol']} kcal/mol, which is {abs(top['delta_vs_reference']):.1f} kcal/mol "
            f"{top['vs_reference']} than {ref_drug_name}. "
            f"This suggests {top['compound_name']} may form more favorable interactions with the "
            f"{target['protein_name']} binding pocket. Further experimental validation with "
            f"biochemical IC50 assays is recommended to confirm computational predictions."
        )

    elapsed = time.perf_counter() - start

    trace_data = {
        "agent": "score_binding",
        "agent_name": "Binding Scorer",
        "duration_seconds": round(elapsed, 2),
        "model": QWEN_MODEL,
        "input_summary": f"{len(results)} simulation results",
        "output_summary": f"Top hit: {rankings[0]['compound_name']} at {rankings[0]['binding_score_kcal_mol']} kcal/mol "
                          f"({rankings[0]['vs_reference']} than {ref_drug_name})",
        "steps": [
            {"action": "Sort by binding energy", "detail": f"Ranked {len(rankings)} compounds (lower = stronger)"},
            {"action": f"Compare to {ref_drug_name}", "detail": f"Reference: {ref_score} kcal/mol"},
            {"action": "LLM interpretation", "detail": f"Generated scientific analysis ({llm_trace['duration_ms']}ms)"},
        ],
        "llm_calls": [llm_trace],
    }

    return {
        "binding_rankings": {
            "rankings": rankings,
            "reference_drug_id": ref_drug_id,
            "reference_drug_name": ref_drug_name,
            "reference_score": ref_score,
            "top_hit": rankings[0] if rankings else None,
            "interpretation": interpretation,
            "total_screened": len(rankings),
        },
        "agent_traces": state.get("agent_traces", []) + [trace_data],
    }
