"""
DrugForge - AMD MI300X Critical Test
Run this FIRST before building anything else.

If this returns "OpenMM AMD ready: OpenCL" -- build DrugForge.
If this errors -- switch to ClimateFleet immediately.
"""

import sys


def main():
    print("=" * 60)
    print("DrugForge - AMD MI300X Critical Test")
    print("=" * 60)

    try:
        import openmm as mm
    except ImportError:
        print("\nFAIL: OpenMM not installed.")
        print("Run: pip install openmm")
        sys.exit(1)

    print(f"\nOpenMM version: {mm.__version__}")
    print(f"Platforms available: {mm.Platform.getNumPlatforms()}")

    for i in range(mm.Platform.getNumPlatforms()):
        p = mm.Platform.getPlatform(i)
        print(f"  {p.getName()}: speed {p.getSpeed():.1f}")

    try:
        platform = mm.Platform.getPlatformByName("OpenCL")
        print(f"\nOpenMM AMD ready: {platform.getName()}")
        print(f"Speed: {platform.getSpeed()}")
    except Exception as e:
        print(f"\nWARNING: OpenCL platform not available: {e}")
        print("Will fall back to CPU. Check ROCm installation.")

    print("\nRunning minimal simulation test...")
    import openmm.app as app
    import openmm.unit as unit
    import time

    pdb_text = """ATOM      1  N   ALA A   1       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  ALA A   1       1.458   0.000   0.000  1.00  0.00           C
ATOM      3  C   ALA A   1       2.009   1.420   0.000  1.00  0.00           C
ATOM      4  O   ALA A   1       1.246   2.390   0.000  1.00  0.00           O
ATOM      5  CB  ALA A   1       1.986  -0.764   1.199  1.00  0.00           C
END"""

    with open("/tmp/test_mini.pdb", "w") as f:
        f.write(pdb_text)

    try:
        pdb = app.PDBFile("/tmp/test_mini.pdb")
        forcefield = app.ForceField("amber14-all.xml", "amber14/tip3pfb.xml")
        modeller = app.Modeller(pdb.topology, pdb.positions)
        modeller.addSolvent(forcefield, model="tip3p", padding=0.5 * unit.nanometers)

        atom_count = modeller.topology.getNumAtoms()
        print(f"Test system: {atom_count} atoms")

        system = forcefield.createSystem(
            modeller.topology,
            nonbondedMethod=app.PME,
            nonbondedCutoff=1.0 * unit.nanometers,
            constraints=app.HBonds,
        )

        try:
            platform = mm.Platform.getPlatformByName("OpenCL")
            properties = {"OpenCLPrecision": "mixed", "OpenCLDeviceIndex": "0"}
        except Exception:
            platform = mm.Platform.getPlatformByName("CPU")
            properties = {}

        integrator = mm.LangevinMiddleIntegrator(
            300 * unit.kelvin, 1 / unit.picosecond, 0.002 * unit.picoseconds
        )
        simulation = app.Simulation(
            modeller.topology, system, integrator, platform, properties
        )
        simulation.context.setPositions(modeller.positions)

        simulation.minimizeEnergy(maxIterations=100)

        start = time.perf_counter()
        simulation.step(1000)
        elapsed = time.perf_counter() - start

        state = simulation.context.getState(getEnergy=True)
        energy = state.getPotentialEnergy()

        print(f"\nSIMULATION PASSED")
        print(f"Platform: {platform.getName()}")
        print(f"1000 steps in {elapsed:.2f}s")
        print(f"Energy: {energy}")
        print(f"\n{'='*60}")
        print("READY TO BUILD DRUGFORGE")
        print(f"{'='*60}")

    except Exception as e:
        print(f"\nSIMULATION FAILED: {e}")
        print("Consider switching to ClimateFleet.")
        sys.exit(1)


if __name__ == "__main__":
    main()
