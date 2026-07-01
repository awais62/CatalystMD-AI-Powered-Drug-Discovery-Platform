import time
from backend.config import KNOWN_TARGETS, QWEN_MODEL
from backend.simulation.openmm_runner import download_pdb
from backend.agents.llm import call_llm


def run_target_identifier(state: dict, progress_cb=None) -> dict:
    start = time.perf_counter()
    pdb_id = state["target_protein"].upper()
    target_info = KNOWN_TARGETS.get(pdb_id, {})

    if progress_cb:
        progress_cb("identify_target", "running", step="Downloading PDB structure...")
    pdb_path = download_pdb(pdb_id)
    pdb_text = pdb_path.read_text()

    atom_lines = [l for l in pdb_text.splitlines() if l.startswith("ATOM") or l.startswith("HETATM")]
    atom_count = len(atom_lines)

    llm_calls = []

    biological_context = target_info.get("biological_context", "")
    therapeutic_relevance = target_info.get("therapeutic_relevance", "")

    if progress_cb:
        progress_cb("identify_target", "running", step="Analyzing binding site...")
    if not biological_context:
        trace = call_llm(
            f"In 2-3 sentences, explain the biological function of protein PDB {pdb_id} "
            f"and why it is a drug target."
        )
        llm_calls.append(trace)
        biological_context = trace["response"] or f"Protein {pdb_id} is a validated drug target."

    if not therapeutic_relevance:
        trace = call_llm(
            f"In 2-3 sentences, explain the therapeutic relevance of targeting protein {pdb_id}."
        )
        llm_calls.append(trace)
        therapeutic_relevance = trace["response"] or f"Inhibiting {pdb_id} has therapeutic potential."

    elapsed = time.perf_counter() - start

    target_analysis = {
        "protein_name": target_info.get("name", pdb_id),
        "pdb_id": pdb_id,
        "pdb_path": str(pdb_path),
        "ligand_id": target_info.get("ligand_id", "UNK"),
        "resolution_angstroms": target_info.get("resolution_angstroms", 2.0),
        "pdb_atom_count": atom_count,
        "binding_site": {
            "center_coords": target_info.get("binding_site_center", [0, 0, 0]),
            "key_residues": target_info.get("binding_site_residues", []),
            "pocket_volume_A3": target_info.get("pocket_volume_A3", 0),
        },
        "biological_context": biological_context,
        "therapeutic_relevance": therapeutic_relevance,
    }

    trace_data = {
        "agent": "identify_target",
        "agent_name": "Drug Target Identifier",
        "duration_seconds": round(elapsed, 2),
        "model": QWEN_MODEL if llm_calls else None,
        "input_summary": f"PDB ID: {pdb_id}",
        "output_summary": f"Identified {target_analysis['protein_name']}, {atom_count} atoms, "
                          f"binding site: {', '.join(target_analysis['binding_site']['key_residues'])}",
        "steps": [
            {"action": "Download PDB", "detail": f"Fetched {pdb_id}.pdb from RCSB ({atom_count} atoms)"},
            {"action": "Identify binding site", "detail": f"Key residues: {', '.join(target_analysis['binding_site']['key_residues'])}"},
            {"action": "Analyze context", "detail": f"Pocket volume: {target_analysis['binding_site']['pocket_volume_A3']} A3"},
        ],
        "llm_calls": llm_calls,
    }

    return {"target_analysis": target_analysis, "agent_traces": [trace_data]}
