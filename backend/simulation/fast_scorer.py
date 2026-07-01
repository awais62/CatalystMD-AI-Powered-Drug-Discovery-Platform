import time
import json
from pathlib import Path

from backend.config import PRECOMPUTED_DIR, FAST_SCORING_STEPS, KNOWN_TARGETS, SCORING_VERSION

_prepared_simulations: dict[str, tuple] = {}


def _precomputed_path(pdb_id: str, compound_id: str) -> Path:
    return PRECOMPUTED_DIR / f"{pdb_id}_{compound_id}.json"


def load_precomputed(pdb_id: str, compound_id: str) -> dict | None:
    path = _precomputed_path(pdb_id, compound_id)
    if path.exists():
        data = json.loads(path.read_text())
        if data.get("scoring_version") == SCORING_VERSION:
            return data
        return None  # stale cache from old scoring method
    return None


def save_precomputed(pdb_id: str, compound_id: str, result: dict):
    path = _precomputed_path(pdb_id, compound_id)
    path.write_text(json.dumps(result, indent=2))


def _prepare_protein(protein_pdb_path: str, pdb_id: str):
    """Prepare protein once: fix PDB, build system, cache for reuse."""
    if pdb_id in _prepared_simulations:
        return _prepared_simulations[pdb_id]

    from pdbfixer import PDBFixer
    import openmm as mm
    import openmm.app as app
    import openmm.unit as unit
    from backend.simulation.openmm_runner import get_platform

    fixer = PDBFixer(filename=str(protein_pdb_path))
    fixer.removeHeterogens(False)
    fixer.missingResidues = {}
    fixer.findMissingAtoms()
    fixer.addMissingAtoms()
    fixer.addMissingHydrogens(pH=7.0)

    atom_count = fixer.topology.getNumAtoms()

    forcefield = app.ForceField("amber14-all.xml", "implicit/obc2.xml")
    system = forcefield.createSystem(
        fixer.topology,
        nonbondedMethod=app.NoCutoff,
        constraints=app.HBonds,
    )

    platform, properties = get_platform()

    prepared = (fixer.topology, fixer.positions, system, platform, properties, atom_count)
    _prepared_simulations[pdb_id] = prepared
    return prepared


def run_fast_scoring(
    protein_pdb_path: str,
    pdb_id: str,
    compound: dict,
) -> dict:
    precomputed = load_precomputed(pdb_id, compound["id"])
    if precomputed:
        return precomputed

    # Primary: Vina docking (real physics)
    try:
        result = _run_vina_scoring(protein_pdb_path, compound, pdb_id)
        save_precomputed(pdb_id, compound["id"], result)
        return result
    except Exception:
        import traceback
        traceback.print_exc()

    # Fallback: protein-only OpenMM minimization
    try:
        result = _run_openmm_fast(protein_pdb_path, compound, pdb_id)
        save_precomputed(pdb_id, compound["id"], result)
        return result
    except Exception:
        import traceback
        traceback.print_exc()

    # Last resort: no simulation available
    result = _run_fallback(compound, pdb_id)
    save_precomputed(pdb_id, compound["id"], result)
    return result


def _run_vina_scoring(protein_pdb_path: str, compound: dict, pdb_id: str) -> dict:
    """Dock compound with AutoDock Vina and use the Vina score as binding affinity."""
    from backend.simulation.docking import dock_compound

    target_info = KNOWN_TARGETS.get(pdb_id, {})
    center = target_info.get("binding_site_center", [0.0, 0.0, 0.0])

    start = time.perf_counter()

    dock_result = dock_compound(
        protein_pdb_path, compound["smiles"], compound["id"], center
    )

    if dock_result.get("error") or dock_result.get("vina_score_kcal_mol") is None:
        raise ValueError(f"Docking failed for {compound['id']}: {dock_result.get('error')}")

    docking_time = time.perf_counter() - start

    # Also run protein-only OpenMM minimization for the GPU energy showcase
    potential_energy_kj = None
    platform_name = "Vina"
    atom_count = 0
    try:
        topology, positions, system, platform, properties, atom_count = _prepare_protein(
            protein_pdb_path, pdb_id
        )
        import openmm as mm
        import openmm.unit as unit

        integrator = mm.LangevinMiddleIntegrator(
            300 * unit.kelvin, 1 / unit.picosecond, 0.002 * unit.picoseconds
        )
        simulation = mm.app.Simulation(topology, system, integrator, platform, properties)
        simulation.context.setPositions(positions)
        simulation.minimizeEnergy(maxIterations=FAST_SCORING_STEPS)

        state = simulation.context.getState(getEnergy=True)
        potential_energy_kj = round(
            state.getPotentialEnergy().value_in_unit(unit.kilojoules_per_mole), 1
        )
        platform_name = platform.getName()
    except Exception:
        pass  # OpenMM not available — Vina score still valid

    total_time = time.perf_counter() - start

    return {
        "compound_id": compound["id"],
        "compound_name": compound["name"],
        "smiles": compound["smiles"],
        "known_ki_nm": compound.get("known_ki_nm"),
        "binding_score_kcal_mol": dock_result["vina_score_kcal_mol"],
        "vina_score_kcal_mol": dock_result["vina_score_kcal_mol"],
        "potential_energy_kj_mol": potential_energy_kj,
        "wall_time_seconds": round(total_time, 2),
        "docking_time_seconds": dock_result.get("docking_time_seconds"),
        "platform": platform_name,
        "atom_count": atom_count,
        "method": "vina_docking",
        "pose_pdb": dock_result.get("pose_pdb"),
        "scoring_version": SCORING_VERSION,
    }


def _run_openmm_fast(protein_pdb_path: str, compound: dict, pdb_id: str) -> dict:
    """Fallback: protein-only implicit solvent minimization. No ligand docking."""
    import openmm as mm
    import openmm.app as app
    import openmm.unit as unit

    topology, positions, system, platform, properties, atom_count = _prepare_protein(
        protein_pdb_path, pdb_id
    )

    integrator = mm.LangevinMiddleIntegrator(
        300 * unit.kelvin, 1 / unit.picosecond, 0.002 * unit.picoseconds
    )

    simulation = app.Simulation(topology, system, integrator, platform, properties)
    simulation.context.setPositions(positions)

    start = time.perf_counter()
    simulation.minimizeEnergy(maxIterations=FAST_SCORING_STEPS)
    elapsed = time.perf_counter() - start

    state = simulation.context.getState(getEnergy=True)
    energy_kj = state.getPotentialEnergy().value_in_unit(unit.kilojoules_per_mole)

    return {
        "compound_id": compound["id"],
        "compound_name": compound["name"],
        "smiles": compound["smiles"],
        "known_ki_nm": compound.get("known_ki_nm"),
        "binding_score_kcal_mol": 0.0,
        "potential_energy_kj_mol": round(energy_kj, 1),
        "wall_time_seconds": round(elapsed, 2),
        "platform": platform.getName(),
        "atom_count": atom_count,
        "method": "docking_failed",
        "scoring_version": SCORING_VERSION,
    }


def _run_fallback(compound: dict, pdb_id: str) -> dict:
    """Last resort when no simulation packages are available."""
    return {
        "compound_id": compound["id"],
        "compound_name": compound["name"],
        "smiles": compound["smiles"],
        "known_ki_nm": compound.get("known_ki_nm"),
        "binding_score_kcal_mol": 0.0,
        "potential_energy_kj_mol": None,
        "wall_time_seconds": 0.0,
        "platform": "none",
        "atom_count": 0,
        "method": "no_simulation_available",
        "scoring_version": SCORING_VERSION,
    }
