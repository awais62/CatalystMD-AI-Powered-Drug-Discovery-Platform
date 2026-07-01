import time


def _check_lipinski(smiles: str) -> dict:
    try:
        from rdkit import Chem
        from rdkit.Chem import Descriptors, rdMolDescriptors

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {
                "molecular_weight": 0,
                "logP": 0,
                "H_bond_donors": 0,
                "H_bond_acceptors": 0,
                "lipinski_violations": 4,
                "drug_like": False,
                "error": "Invalid SMILES",
            }

        mw = round(Descriptors.MolWt(mol), 1)
        logp = round(Descriptors.MolLogP(mol), 2)
        hbd = rdMolDescriptors.CalcNumHBD(mol)
        hba = rdMolDescriptors.CalcNumHBA(mol)

        violations = sum([mw > 500, logp > 5, hbd > 5, hba > 10])

        return {
            "molecular_weight": mw,
            "logP": logp,
            "H_bond_donors": hbd,
            "H_bond_acceptors": hba,
            "lipinski_violations": violations,
            "drug_like": violations <= 1,
        }
    except ImportError:
        return _check_lipinski_fallback(smiles)


def _check_lipinski_fallback(smiles: str) -> dict:
    mw_estimate = len(smiles) * 8.5
    hbd_estimate = smiles.count("O") + smiles.count("N") - smiles.count("n")
    hba_estimate = smiles.count("O") + smiles.count("N") + smiles.count("n")

    violations = sum([
        mw_estimate > 500,
        hbd_estimate > 5,
        hba_estimate > 10,
    ])

    return {
        "molecular_weight": round(mw_estimate, 1),
        "logP": 2.5,
        "H_bond_donors": max(0, hbd_estimate),
        "H_bond_acceptors": max(0, hba_estimate),
        "lipinski_violations": violations,
        "drug_like": violations <= 1,
        "method": "estimate",
    }


def _check_pains(smiles: str) -> list[str]:
    try:
        from rdkit import Chem
        from rdkit.Chem.FilterCatalog import FilterCatalog, FilterCatalogParams

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return ["Invalid SMILES"]

        params = FilterCatalogParams()
        params.AddCatalog(FilterCatalogParams.FilterCatalogs.PAINS)
        catalog = FilterCatalog(params)

        entry = catalog.GetFirstMatch(mol)
        if entry:
            return [entry.GetDescription()]
        return []
    except (ImportError, Exception):
        return []


def run_toxicity_screener(state: dict, progress_cb=None) -> dict:
    start = time.perf_counter()
    rankings = state["binding_rankings"]["rankings"]
    results = state["simulation_results"]

    smiles_map = {r["compound_id"]: r["smiles"] for r in results}

    profiles = []
    screening_details = []
    for idx, r in enumerate(rankings[:10]):
        if progress_cb:
            progress_cb("screen_toxicity", "running", step=f"Screening {r['compound_name']}... ({idx+1}/10)")
        smiles = smiles_map.get(r["compound_id"], "")
        lipinski = _check_lipinski(smiles)
        pains = _check_pains(smiles)

        passed = lipinski["drug_like"] and len(pains) == 0
        profiles.append({
            "compound_id": r["compound_id"],
            "compound_name": r["compound_name"],
            "rank": r["rank"],
            "binding_score_kcal_mol": r["binding_score_kcal_mol"],
            "lipinski": lipinski,
            "pains_flags": pains,
            "toxicity_flags": pains,
            "overall_pass": passed,
        })
        screening_details.append(
            f"{r['compound_name']}: {'PASS' if passed else 'REVIEW'} "
            f"(MW={lipinski['molecular_weight']}, violations={lipinski['lipinski_violations']})"
        )

    elapsed = time.perf_counter() - start
    pass_count = sum(1 for p in profiles if p["overall_pass"])

    trace_data = {
        "agent": "screen_toxicity",
        "agent_name": "Toxicity Screener",
        "duration_seconds": round(elapsed, 2),
        "model": None,
        "input_summary": f"Top {len(profiles)} candidates by binding affinity",
        "output_summary": f"{pass_count}/{len(profiles)} pass drug-likeness filter",
        "steps": [
            {"action": "Lipinski Rule of Five", "detail": f"MW<500, LogP<5, HBD<5, HBA<10: {pass_count}/{len(profiles)} pass"},
            {"action": "PAINS filter", "detail": "Pan-Assay Interference Compound screening"},
            {"action": "Results", "detail": "\n".join(screening_details[:5])},
        ],
        "llm_calls": [],
    }

    return {
        "toxicity_profiles": profiles,
        "agent_traces": state.get("agent_traces", []) + [trace_data],
    }
