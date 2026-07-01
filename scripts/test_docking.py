"""Test AutoDock Vina docking on AMD droplet."""
import time
import subprocess
import tempfile
from pathlib import Path
from vina import Vina
from meeko import MoleculePreparation, PDBQTWriterLegacy
from rdkit import Chem
from rdkit.Chem import AllChem


def pdb_to_pdbqt_receptor(pdb_path, output_path):
    """Convert PDB to PDBQT using Open Babel."""
    subprocess.run(
        ["obabel", pdb_path, "-O", output_path, "-xr", "-xp"],
        capture_output=True, check=True
    )
    return output_path


def smiles_to_pdbqt(smiles):
    """Convert SMILES to 3D PDBQT for Vina."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    mol = Chem.AddHs(mol)
    if AllChem.EmbedMolecule(mol, randomSeed=42) != 0:
        AllChem.EmbedMolecule(mol, AllChem.ETKDGv3())
    AllChem.MMFFOptimizeMolecule(mol)

    prep = MoleculePreparation()
    mol_setups = prep.prepare(mol)
    if not mol_setups:
        return None
    pdbqt_string, is_ok, error = PDBQTWriterLegacy.write_string(mol_setups[0])
    return pdbqt_string if is_ok else None


def dock(receptor_pdbqt_path, ligand_pdbqt, center, box_size=20):
    """Run Vina docking, return score and pose PDBQT."""
    v = Vina(sf_name="vina")
    v.set_receptor(receptor_pdbqt_path)
    v.set_ligand_from_string(ligand_pdbqt)
    v.compute_vina_maps(center=center, box_size=[box_size]*3)
    v.dock(exhaustiveness=8, n_poses=1)
    energy = v.energies(n_poses=1)[0][0]
    poses = v.poses(n_poses=1)
    return energy, poses


def pdbqt_pose_to_pdb(pdbqt_string):
    """Convert PDBQT pose to PDB for 3Dmol.js viewer."""
    lines = []
    for line in pdbqt_string.splitlines():
        if line.startswith("ATOM") or line.startswith("HETATM"):
            lines.append(line[:66].rstrip())
        elif line.startswith("END"):
            lines.append("END")
    return "\n".join(lines)


if __name__ == "__main__":
    print("Converting receptor PDB to PDBQT...")
    receptor_pdbqt = "/tmp/receptor_1M17.pdbqt"
    pdb_to_pdbqt_receptor("data/pdb_cache/1M17.pdb", receptor_pdbqt)
    print(f"  Done: {receptor_pdbqt}")

    print("Preparing ligand (Erlotinib)...")
    smiles = "C=Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1"
    lig_pdbqt = smiles_to_pdbqt(smiles)
    if not lig_pdbqt:
        print("  FAILED to prepare ligand")
        exit(1)
    print(f"  Ligand ready ({len(lig_pdbqt)} chars)")

    print("Docking...")
    start = time.perf_counter()
    score, pose = dock(receptor_pdbqt, lig_pdbqt, center=[22.5, 0.5, 52.0])
    elapsed = time.perf_counter() - start

    pdb_pose = pdbqt_pose_to_pdb(pose)
    print(f"  Score: {score:.2f} kcal/mol")
    print(f"  Time: {elapsed:.1f}s")
    print(f"  PDB pose: {len(pdb_pose)} chars")
    print("SUCCESS")
