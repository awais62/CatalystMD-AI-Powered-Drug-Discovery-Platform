"""
Pre-compute full molecular dynamics results for top compounds.
Run on AMD Developer Cloud with MI300X.

Usage: python scripts/precompute_md.py
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import PRECOMPUTED_DIR
from backend.compounds import DEMO_COMPOUNDS
from backend.simulation.openmm_runner import download_pdb, run_binding_simulation
from backend.simulation.fast_scorer import run_fast_scoring, save_precomputed

TOP_N = 5
PDB_ID = "6LU7"
FULL_MD_STEPS = 50000


def main():
    print(f"Pre-computing full MD for top {TOP_N} compounds against {PDB_ID}")

    pdb_path = download_pdb(PDB_ID)
    print(f"PDB downloaded: {pdb_path}")

    # Score all compounds with Vina to find the top hits
    scored = []
    for c in DEMO_COMPOUNDS:
        result = run_fast_scoring(str(pdb_path), PDB_ID, c)
        scored.append((result["binding_score_kcal_mol"], c))
    scored.sort(key=lambda x: x[0])

    top_compounds = [c for _, c in scored[:TOP_N]]

    print(f"\nTop {TOP_N} compounds to simulate:")
    for i, c in enumerate(top_compounds):
        print(f"  {i+1}. {c['name']} (score: {scored[i][0]:.2f} kcal/mol)")

    for i, compound in enumerate(top_compounds):
        print(f"\n{'='*60}")
        print(f"Running full MD for {compound['name']} ({i+1}/{TOP_N})")
        print(f"Steps: {FULL_MD_STEPS}")

        try:
            result = run_binding_simulation(str(pdb_path), FULL_MD_STEPS)

            # Get the Vina score for this compound
            vina_result = run_fast_scoring(str(pdb_path), PDB_ID, compound)

            precomputed = {
                "compound_id": compound["id"],
                "compound_name": compound["name"],
                "smiles": compound["smiles"],
                "known_ki_nm": compound.get("known_ki_nm"),
                "binding_score_kcal_mol": vina_result["binding_score_kcal_mol"],
                "potential_energy_kj_mol": result["potential_energy_kj_mol"],
                "wall_time_seconds": result["wall_time_seconds"],
                "platform": result["platform"],
                "atom_count": result["atom_count"],
                "simulation_steps": result["simulation_steps"],
                "simulation_time_ps": result["simulation_time_ps"],
                "method": "full_md",
                "scoring_version": "vina_v1",
            }

            save_precomputed(PDB_ID, compound["id"], precomputed)
            print(f"  Saved: {PRECOMPUTED_DIR / f'{PDB_ID}_{compound['id']}.json'}")
            print(f"  Atoms: {result['atom_count']:,}")
            print(f"  Time: {result['wall_time_seconds']:.1f}s")
            print(f"  Platform: {result['platform']}")

        except Exception as e:
            print(f"  FAILED: {e}")

    print(f"\n{'='*60}")
    print(f"Pre-computation complete. Results in: {PRECOMPUTED_DIR}")


if __name__ == "__main__":
    main()
