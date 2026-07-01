import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent.parent
load_dotenv(BASE_DIR / "backend" / ".env")
DATA_DIR = BASE_DIR / "data"
PRECOMPUTED_DIR = DATA_DIR / "precomputed"
PDB_CACHE_DIR = DATA_DIR / "pdb_cache"

QWEN_API_URL = os.getenv("QWEN_API_URL", "http://localhost:8001/v1")
QWEN_MODEL = os.getenv("QWEN_MODEL", "Qwen/Qwen2.5-7B-Instruct")
QWEN_API_KEY = os.getenv("OPENAI_API_KEY", "not-needed")

USE_AMD_GPU = os.getenv("USE_AMD_GPU", "true").lower() == "true"
OPENCL_DEVICE_INDEX = os.getenv("OPENCL_DEVICE_INDEX", "0")

SIMULATION_STEPS = int(os.getenv("SIMULATION_STEPS", "50000"))
FAST_SCORING_STEPS = int(os.getenv("FAST_SCORING_STEPS", "1000"))
SOLVENT_PADDING_NM = float(os.getenv("SOLVENT_PADDING_NM", "1.0"))

# Scoring configuration
SCORING_METHOD = os.getenv("SCORING_METHOD", "vina")  # "vina" | "mmgbsa" | "protein_only"
SCORING_VERSION = "vina_v1"

# MM-GBSA parameters (Phase 2)
MMGBSA_MD_STEPS = int(os.getenv("MMGBSA_MD_STEPS", "5000"))
MMGBSA_SNAPSHOTS = int(os.getenv("MMGBSA_SNAPSHOTS", "10"))
MMGBSA_SNAPSHOT_INTERVAL = int(os.getenv("MMGBSA_SNAPSHOT_INTERVAL", "500"))

RCSB_BASE_URL = "https://files.rcsb.org/download"

KNOWN_TARGETS = {
    "6LU7": {
        "name": "SARS-CoV-2 Main Protease",
        "ligand_id": "N3",
        "reference_drug_id": "nirmatrelvir",
        "reference_drug_name": "Nirmatrelvir (Paxlovid)",
        "binding_site_residues": ["His41", "Cys145", "Glu166", "His164"],
        "binding_site_center": [-15.2, 12.8, 70.1],
        "pocket_volume_A3": 892.4,
        "resolution_angstroms": 2.16,
        "biological_context": (
            "The SARS-CoV-2 main protease (Mpro/3CLpro) cleaves viral polyproteins "
            "at 11 conserved sites, an essential step in viral replication. It has no "
            "human homolog, making it an ideal drug target with minimal off-target risk."
        ),
        "therapeutic_relevance": (
            "Blocking this protease prevents viral replication. Nirmatrelvir (Paxlovid) "
            "targets this exact protein. Emerging SARS-CoV-2 variants show signs of "
            "nirmatrelvir resistance, creating urgent need for next-generation inhibitors."
        ),
    },
    "1HIV": {
        "name": "HIV-1 Protease",
        "ligand_id": "A77",
        "reference_drug_id": "saquinavir",
        "reference_drug_name": "Saquinavir",
        "binding_site_residues": ["Asp25", "Thr26", "Gly27", "Asp25'"],
        "binding_site_center": [3.0, 0.0, 0.0],
        "pocket_volume_A3": 650.0,
        "resolution_angstroms": 2.0,
        "biological_context": "HIV-1 protease cleaves Gag and Gag-Pol polyproteins during viral maturation.",
        "therapeutic_relevance": "Target of all protease inhibitor antiretrovirals (ritonavir, darunavir, etc.).",
    },
    "6OIM": {
        "name": "KRAS G12C (Lung Cancer)",
        "ligand_id": "ARS",
        "reference_drug_id": "sotorasib",
        "reference_drug_name": "Sotorasib (Lumakras)",
        "binding_site_residues": ["Cys12", "His95", "Tyr96", "Asp69"],
        "binding_site_center": [-2.5, -1.8, 12.3],
        "pocket_volume_A3": 530.0,
        "resolution_angstroms": 1.65,
        "biological_context": (
            "KRAS is the most frequently mutated oncogene in human cancer. The G12C mutation "
            "locks KRAS in its active GTP-bound state, driving uncontrolled cell growth. For 40 years "
            "KRAS was considered 'undruggable' because its surface lacks obvious drug-binding pockets."
        ),
        "therapeutic_relevance": (
            "Sotorasib (Lumakras), approved 2021, was the first drug to successfully target KRAS G12C "
            "by forming a covalent bond with the mutant Cys12 residue in the Switch II pocket. "
            "It transformed lung cancer treatment but resistance emerges quickly — next-generation "
            "inhibitors are urgently needed."
        ),
    },
    "1M17": {
        "name": "EGFR Kinase (Lung Cancer)",
        "ligand_id": "AQ4",
        "reference_drug_id": "erlotinib",
        "reference_drug_name": "Erlotinib (Tarceva)",
        "binding_site_residues": ["Met793", "Thr790", "Lys745", "Asp855"],
        "binding_site_center": [22.5, 0.5, 52.0],
        "pocket_volume_A3": 780.0,
        "resolution_angstroms": 2.6,
        "biological_context": (
            "Epidermal Growth Factor Receptor (EGFR) is a receptor tyrosine kinase that drives "
            "cell proliferation. Activating mutations in EGFR are found in 15-30% of non-small cell "
            "lung cancers, making it one of the most important targets in precision oncology."
        ),
        "therapeutic_relevance": (
            "Erlotinib (Tarceva) and gefitinib (Iressa) were among the first targeted cancer therapies. "
            "Third-generation inhibitor osimertinib (Tagrisso) overcomes resistance mutations. "
            "EGFR inhibitors generate over $8 billion annually in global sales."
        ),
    },
}

for d in [DATA_DIR, PRECOMPUTED_DIR, PDB_CACHE_DIR]:
    d.mkdir(parents=True, exist_ok=True)
