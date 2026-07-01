# CatalystMD — Technical Walkthrough

## Overview

CatalystMD is an AI-powered drug discovery platform that screens drug candidates against disease protein targets using real computational chemistry on AMD MI300X. It combines physics-based molecular docking (AutoDock Vina), GPU-accelerated energy minimization (OpenMM), and LLM-driven analysis (Qwen 2.5-7B) into a 5-agent pipeline orchestrated by LangGraph.

**GitHub:** https://github.com/YoussefMadkour/CatalystMD
**Live Demo:** https://huggingface.co/spaces/youssefmadkour1/CatalystMD

---

## Problem

Drug discovery takes 10-15 years and costs $2.6B per approved drug (DiMasi et al. 2016). Fewer than 5% of candidates survive clinical trials. Computational screening can dramatically compress the early discovery phase, but existing tools either rely on ML surrogates instead of real physics, or require multi-node HPC clusters that are expensive and complex to set up.

## Solution

CatalystMD runs a complete drug discovery pipeline on a single AMD MI300X GPU:

1. **Real physics** — AutoDock Vina performs physics-based molecular docking (15,000+ citations). Not ML predictions.
2. **GPU-accelerated simulation** — OpenMM runs AMBER14 energy minimization via OpenCL on MI300X at 100% GPU utilization.
3. **AI analysis** — Qwen 2.5-7B (served via vLLM on the same GPU) interprets results and generates scientific briefs.
4. **Full-stack platform** — Interactive web app with 3D protein visualization, real-time pipeline status, and downloadable reports.

---

## Architecture

### 5-Agent LangGraph Pipeline

```
[Start] → Target Identifier → Molecular Dynamics → Binding Scorer → Toxicity Screener → Discovery Reporter → [End]
```

Each agent is a node in a LangGraph `StateGraph`. State flows sequentially — each agent receives the accumulated state from all previous agents and adds its own results.

**File:** `backend/pipeline.py`

### Agent 1: Target Identifier
- Downloads real protein structure from RCSB Protein Data Bank (PDB format)
- Identifies binding pocket coordinates and key residues
- Generates biological context using Qwen 2.5-7B via vLLM
- **File:** `backend/agents/target_identifier.py`

### Agent 2: Molecular Dynamics Engine
- For each compound in the library:
  1. Converts SMILES → 3D structure (RDKit + Meeko)
  2. Prepares receptor PDBQT (PDBFixer + Open Babel)
  3. Runs AutoDock Vina docking in the binding pocket (20A box)
  4. Runs OpenMM energy minimization (AMBER14, OBC2 implicit solvent, 1000 steps)
- Reports real binding affinity scores in kcal/mol
- **Files:** `backend/agents/molecular_dynamics.py`, `backend/simulation/fast_scorer.py`, `backend/simulation/docking.py`

### Agent 3: Binding Scorer
- Ranks all compounds by Vina binding score (most negative = strongest)
- Compares each to the target-specific FDA-approved reference drug
- Calls Qwen 2.5-7B to interpret the top 3 candidates
- **File:** `backend/agents/binding_scorer.py`

### Agent 4: Toxicity Screener
- Applies Lipinski Rule of Five (MW < 500, LogP < 5, HBD < 5, HBA < 10)
- Runs PAINS substructure filter via RDKit
- **File:** `backend/agents/toxicity_screener.py`

### Agent 5: Discovery Reporter
- Generates 2-paragraph structural analysis via Qwen 2.5-7B
- Compiles comprehensive discovery brief with all pipeline results
- **File:** `backend/agents/discovery_reporter.py`

---

## Why AMD MI300X

The MI300X's 192GB HBM3 is critical to this project:

1. **Dual workload on single GPU** — Both the Qwen 2.5-7B LLM (via vLLM) and OpenMM physics simulations run simultaneously on one GPU. No multi-GPU communication overhead.

2. **Production-scale simulations** — Explicit solvent molecular dynamics with 5nm water padding produces 314,568 atoms. This requires >140GB VRAM. It cannot run on NVIDIA H100 (80GB) or H200 (141GB).

3. **Measured performance:**

| Protein | Atoms | Time | GPU | Power |
|---------|-------|------|-----|-------|
| COVID-19 (6LU7) | 76,038 | 16 min | 100% | 328W |
| KRAS G12C (6OIM) | 22,620 | 2 min | 100% | 316W |
| EGFR (1M17) | 119,907 | 27 min | 100% | 333W |
| HIV-1 (1HIV) | 45,635 | 8 min | 100% | 330W |
| **EGFR 5nm explicit** | **314,568** | **40 min** | **100%** | **310-342W** |

All measurements captured live via `rocm-smi` during actual simulations. Full logs in `data/gpu_measurements/`.

---

## Results

57 compounds screened across 4 disease targets. All scores from real AutoDock Vina docking on real X-ray crystallography protein structures.

| Target | PDB | Compounds | Reference Drug | Top Hit | Score | vs Reference |
|--------|-----|-----------|---------------|---------|-------|-------------|
| COVID-19 Protease | 6LU7 | 20 | Nirmatrelvir (Paxlovid) | Shikonin | -6.79 | Stronger |
| KRAS G12C (Lung Cancer) | 6OIM | 15 | Sotorasib (Lumakras) | SML-8-73-1 | -8.59 | Stronger |
| EGFR (Lung Cancer) | 1M17 | 12 | Erlotinib (Tarceva) | WZ4002 | -8.82 | 10/12 beat ref |
| HIV-1 Protease | 1HIV | 10 | Saquinavir | Saquinavir | -6.26 | Reference |

**EGFR highlight:** 10 of 12 screened compounds show stronger predicted binding than Erlotinib (Tarceva), the current FDA-approved drug.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| GPU | AMD MI300X (192GB HBM3) | OpenCL compute for OpenMM + vLLM |
| Molecular Docking | AutoDock Vina, Meeko, Open Babel | Physics-based binding affinity |
| Physics Simulation | OpenMM 8 + AMBER14 | Energy minimization (implicit/explicit solvent) |
| Protein Prep | PDBFixer | Missing atoms, hydrogens, terminal caps |
| Chemistry | RDKit | Lipinski, PAINS, SMILES-to-3D |
| LLM | Qwen 2.5-7B-Instruct (vLLM) | Target analysis, result interpretation |
| Agent Orchestration | LangGraph (LangChain) | Sequential agent pipeline |
| Backend | FastAPI, Python 3.12 | Async API with SSE streaming |
| Frontend | Next.js 16, React 19, 3Dmol.js | 3D protein viewer + real-time status |
| Deployment | Bash script to AMD Developer Cloud | One-command setup on MI300X droplet |

---

## How to Build It

### Prerequisites
- AMD MI300X GPU (via AMD Developer Cloud)
- Python 3.12
- Node.js 20

### One-Command Deploy
```bash
./scripts/deploy.sh <DROPLET_IP>
```

This script:
1. Syncs code to the MI300X droplet
2. Installs Python venv + all dependencies (OpenMM, Vina, RDKit, PDBFixer, Meeko)
3. Starts vLLM in Docker with Qwen 2.5-7B
4. Configures backend (.env) and frontend
5. Starts both servers (backend :8080, frontend :3000)

### Local Development (CPU)
```bash
# Backend
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8080

# Frontend
cd frontend && npm install && npm run dev
```

---

## Frontend Features

- **3D Protein Viewer** (3Dmol.js): Interactive cartoon rendering with binding site highlighting, ligand display, docked pose overlay
- **Real-Time Pipeline Status**: Server-Sent Events stream agent progress to the UI
- **Compound Progress**: Live compound-by-compound tracking during MD simulation
- **Binding Rankings**: Sortable table with clickable rows to view 3D docked poses
- **Toxicity Report**: Lipinski + PAINS screening results
- **Discovery Brief**: Downloadable as PDF, Markdown, or plain text

---

## Data Sources

- **Protein structures:** RCSB Protein Data Bank (X-ray crystallography, 1.6-2.6 A resolution)
- **Compounds:** PubChem, ChEMBL, published literature (all with known experimental binding data)
- **Reference drugs:** FDA-approved drugs for each target (Paxlovid, Lumakras, Tarceva, Saquinavir)

---

## References

- DiMasi et al. (2016). "Innovation in the pharmaceutical industry." *J. Health Economics*. [Cost: $2.6B per drug]
- Trott & Olson (2010). "AutoDock Vina." *J. Comput. Chem.* [15,000+ citations]
- Eastman et al. (2024). "OpenMM 8." *J. Phys. Chem. B.*
- Sun et al. (2022). "Why 90% of clinical drug development fails." *PMC.*
- AMBER force fields: Case et al. — ambermd.org
- RDKit: Open-source cheminformatics — rdkit.org
