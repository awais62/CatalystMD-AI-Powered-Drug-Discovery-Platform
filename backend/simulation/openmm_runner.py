import time
import json
import requests
from pathlib import Path

from backend.config import (
    PDB_CACHE_DIR, RCSB_BASE_URL, USE_AMD_GPU,
    OPENCL_DEVICE_INDEX, SIMULATION_STEPS, SOLVENT_PADDING_NM,
)


def download_pdb(pdb_id: str) -> Path:
    pdb_id = pdb_id.upper()
    cached = PDB_CACHE_DIR / f"{pdb_id}.pdb"
    if cached.exists():
        return cached
    url = f"{RCSB_BASE_URL}/{pdb_id}.pdb"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    cached.write_text(resp.text)
    return cached


def get_platform():
    import openmm as mm

    if USE_AMD_GPU:
        try:
            platform = mm.Platform.getPlatformByName("OpenCL")
            return platform, {
                "OpenCLPrecision": "mixed",
                "OpenCLDeviceIndex": OPENCL_DEVICE_INDEX,
            }
        except Exception:
            pass

    return mm.Platform.getPlatformByName("CPU"), {}


def run_binding_simulation(
    protein_pdb_path: str,
    simulation_steps: int | None = None,
    minimization_only: bool = False,
    solvent_padding_nm: float | None = None,
) -> dict:
    import openmm as mm
    import openmm.app as app
    import openmm.unit as unit
    from pdbfixer import PDBFixer

    steps = simulation_steps or SIMULATION_STEPS
    padding = solvent_padding_nm or SOLVENT_PADDING_NM

    # Clean protein with PDBFixer
    fixer = PDBFixer(filename=str(protein_pdb_path))
    fixer.removeHeterogens(False)
    fixer.missingResidues = {}
    fixer.findMissingAtoms()
    fixer.addMissingAtoms()
    fixer.addMissingHydrogens(pH=7.0)

    forcefield = app.ForceField("amber14-all.xml", "amber14/tip3pfb.xml")

    modeller = app.Modeller(fixer.topology, fixer.positions)
    modeller.addSolvent(forcefield, model="tip3p", padding=padding * unit.nanometers)

    atom_count = modeller.topology.getNumAtoms()

    system = forcefield.createSystem(
        modeller.topology,
        nonbondedMethod=app.PME,
        nonbondedCutoff=1.0 * unit.nanometers,
        constraints=app.HBonds,
    )

    platform, properties = get_platform()

    integrator = mm.LangevinMiddleIntegrator(
        300 * unit.kelvin,
        1 / unit.picosecond,
        0.002 * unit.picoseconds,
    )

    simulation = app.Simulation(
        modeller.topology, system, integrator, platform, properties
    )
    simulation.context.setPositions(modeller.positions)

    start = time.perf_counter()
    simulation.minimizeEnergy(maxIterations=1000)
    minimize_time = time.perf_counter() - start

    if minimization_only:
        state = simulation.context.getState(getEnergy=True)
        potential_energy = state.getPotentialEnergy()
        return {
            "potential_energy_kj_mol": potential_energy.value_in_unit(unit.kilojoules_per_mole),
            "simulation_steps": 0,
            "minimization_iterations": 1000,
            "simulation_time_ps": 0,
            "wall_time_seconds": round(minimize_time, 2),
            "platform": platform.getName(),
            "atom_count": atom_count,
            "solvent_padding_nm": padding,
            "method": "explicit_solvent_minimization",
        }

    md_start = time.perf_counter()
    simulation.step(steps)
    md_time = time.perf_counter() - md_start

    state = simulation.context.getState(getEnergy=True)
    potential_energy = state.getPotentialEnergy()

    return {
        "potential_energy_kj_mol": potential_energy.value_in_unit(unit.kilojoules_per_mole),
        "simulation_steps": steps,
        "simulation_time_ps": steps * 0.002,
        "wall_time_seconds": round(minimize_time + md_time, 2),
        "minimize_time_seconds": round(minimize_time, 2),
        "md_time_seconds": round(md_time, 2),
        "platform": platform.getName(),
        "atom_count": atom_count,
        "solvent_padding_nm": padding,
        "method": "explicit_solvent_md",
    }
