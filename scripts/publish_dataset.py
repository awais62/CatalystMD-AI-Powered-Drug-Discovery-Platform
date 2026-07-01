"""
Publish COVID-19 protease benchmark dataset to HuggingFace Hub.

Usage:
  huggingface-cli login
  python scripts/publish_dataset.py
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.compounds import DEMO_COMPOUNDS
from backend.simulation.openmm_runner import download_pdb
from backend.simulation.fast_scorer import run_fast_scoring

PDB_ID = "6LU7"
HF_REPO = "PagerZero/covid19-protease-amd-benchmark"


def main():
    try:
        from datasets import Dataset
    except ImportError:
        print("Install datasets: pip install datasets")
        sys.exit(1)

    pdb_path = download_pdb(PDB_ID)

    # Score all compounds with Vina
    results = {}
    for c in DEMO_COMPOUNDS:
        results[c["id"]] = run_fast_scoring(str(pdb_path), PDB_ID, c)

    nirm_score = results["nirmatrelvir"]["binding_score_kcal_mol"]

    records = []
    for c in DEMO_COMPOUNDS:
        r = results[c["id"]]
        score = r["binding_score_kcal_mol"]
        delta = score - nirm_score

        if delta < -0.2:
            vs = "stronger"
        elif delta > 0.2:
            vs = "weaker"
        else:
            vs = "similar"

        records.append({
            "compound_id": c["id"],
            "compound_name": c["name"],
            "smiles": c["smiles"],
            "known_ki_nm": c["known_ki_nm"],
            "pdb_target": PDB_ID,
            "binding_score_kcal_mol": score,
            "vs_nirmatrelvir": vs,
            "atom_count": r.get("atom_count", 0),
            "platform": r.get("platform", "unknown"),
            "method": r.get("method", "unknown"),
        })

    records.sort(key=lambda r: r["binding_score_kcal_mol"])

    dataset = Dataset.from_list(records)
    print(f"Dataset: {len(dataset)} records")
    print(dataset)

    print(f"\nPushing to {HF_REPO}...")
    dataset.push_to_hub(HF_REPO)
    print("Done!")


if __name__ == "__main__":
    main()
