# CatalystMD

AI-powered drug discovery platform that screens drug candidates against disease protein targets using real computational chemistry on AMD MI300X.

Built for the AMD Developer Hackathon 2026 (lablab.ai). Solo build by Team CatalystMD.

Track: AI Agents and Agentic Workflows.

**Live Demo:** [HuggingFace Space](https://huggingface.co/spaces/youssefmadkour1/CatalystMD)

## What It Does

CatalystMD takes a disease target and screens drug compounds against it using five AI agents in sequence. Each agent passes its results to the next through a LangGraph pipeline.

1. Target Analyst: Downloads the real 3D protein structure from the RCSB Protein Data Bank, identifies the binding pocket, and analyzes biological context using Qwen 2.5-7B.

2. Molecular Dynamics Engine: Docks each compound into the binding pocket using AutoDock Vina (physics-based scoring) and runs energy minimization with OpenMM on the AMD MI300X GPU via OpenCL.

3. Binding Scorer: Ranks all candidates by binding affinity and compares each to the current FDA-approved drug for that target. Qwen generates a scientific interpretation.

4. Toxicity Screener: Checks drug-likeness using Lipinski's Rule of Five and screens for PAINS (Pan-Assay Interference Compounds) using RDKit.

5. Discovery Reporter: Generates a complete scientific brief with structural analysis, rankings, toxicity data, and recommended next steps using Qwen 2.5-7B.

## Disease Targets

| Target | PDB | Compounds | Reference Drug | Top Hit (Vina) |
|--------|-----|-----------|---------------|----------------|
| COVID-19 Main Protease | 6LU7 | 20 | Nirmatrelvir (Paxlovid) | Shikonin (-6.79 kcal/mol) |
| KRAS G12C Lung Cancer | 6OIM | 15 | Sotorasib (Lumakras) | SML-8-73-1 (-8.59 kcal/mol) |
| EGFR Kinase Lung Cancer | 1M17 | 12 | Erlotinib (Tarceva) | WZ4002 (-8.82 kcal/mol) |
| HIV-1 Protease | 1HIV | 10 | Saquinavir | Saquinavir (-6.26 kcal/mol) |

All binding scores are real AutoDock Vina docking results, not simulated.

## GPU Benchmarks (Measured on AMD MI300X)

Explicit solvent simulations (TIP3P water, 1nm padding, AMBER14 force field):

| Protein | Atoms | Time | GPU Utilization | Power |
|---------|-------|------|-----------------|-------|
| COVID-19 (6LU7) | 76,038 | 16.0 min | 100% | 328W |
| KRAS G12C (6OIM) | 22,620 | 2.0 min | 100% | 316W |
| EGFR (1M17) | 119,907 | 26.8 min | 100% | 333W |
| HIV-1 (1HIV) | 45,635 | 7.6 min | 100% | 330W |

**Production-scale benchmark (5nm explicit solvent):**

| Protein | Atoms | Time | GPU Utilization | Power | Solvent |
|---------|-------|------|-----------------|-------|---------|
| EGFR (1M17) | 314,568 | 40 min | 100% | 310-342W | TIP3P 5nm padding |

This simulation requires >140GB VRAM — only possible on MI300X (192GB HBM3). Cannot run on NVIDIA H100 (80GB) or H200 (141GB).

All measurements captured with rocm-smi during simulation. Full data in `data/gpu_measurements/`.

## Architecture

```
Next.js Frontend (3Dmol.js protein viewer)
        |
FastAPI Backend (port 8080)
        |
LangGraph Pipeline (5 sequential agents)
  |-- Target Identifier (Qwen 2.5-7B via vLLM)
  |-- Molecular Dynamics (AutoDock Vina + OpenMM on MI300X)
  |-- Binding Scorer (Qwen 2.5-7B via vLLM)
  |-- Toxicity Screener (RDKit)
  |-- Discovery Reporter (Qwen 2.5-7B via vLLM)
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| GPU | AMD Instinct MI300X (192GB HBM3) via AMD Developer Cloud |
| Molecular Docking | AutoDock Vina 1.2.x, Meeko, Open Babel |
| Physics Simulation | OpenMM 8.x, AMBER14 force field, OpenCL backend |
| Protein Preparation | PDBFixer (missing atoms, hydrogens, terminal caps) |
| LLM | Qwen 2.5-7B-Instruct from HuggingFace Hub, served via vLLM |
| Agent Orchestration | LangGraph (LangChain) |
| Chemistry | RDKit (Lipinski, PAINS, molecular properties) |
| Frontend | Next.js 16, 3Dmol.js, Tailwind CSS |
| Backend | FastAPI, Python 3.12 |

## Project Structure

```
CatalystMD/
  backend/
    main.py                 FastAPI server, API endpoints
    pipeline.py             LangGraph state graph (5 agents)
    config.py               All configuration (targets, scoring, GPU settings)
    compounds.py            Curated compound libraries (SMILES, Ki values)
    agents/
      target_identifier.py  Agent 1: downloads PDB, identifies binding site
      molecular_dynamics.py Agent 2: runs Vina docking + OpenMM minimization
      binding_scorer.py     Agent 3: ranks compounds, compares to reference drug
      toxicity_screener.py  Agent 4: Lipinski + PAINS screening
      discovery_reporter.py Agent 5: generates scientific brief
      llm.py                Shared Qwen/vLLM helper
    simulation/
      fast_scorer.py        Main scoring pipeline (Vina -> OpenMM -> fallback)
      docking.py            AutoDock Vina wrapper (receptor prep, ligand prep, docking)
      openmm_runner.py      OpenMM explicit solvent simulation
  frontend/
    src/app/page.tsx        Main page (idle, running, completed states)
    src/components/         UI components (ProteinViewer, AgentStatusPanel, etc.)
    src/lib/api.ts          API client
    src/lib/types.ts        TypeScript interfaces
  hf_space/
    app.py                  HuggingFace Space (Gradio, precomputed results)
    data/                   Precomputed pipeline results for each target
  scripts/
    deploy.sh               One-command deploy to AMD Developer Cloud
    run_benchmark.py         Explicit solvent benchmark script
    measure_gpu.py           GPU measurement script (rocm-smi monitoring)
    test_docking.py          AutoDock Vina test script
  data/
    pdb_cache/               Downloaded protein structures from RCSB
    precomputed/             Cached scoring results (per compound)
    docked/                  Cached docking results (Vina poses)
    gpu_measurements/        GPU benchmark data (rocm-smi snapshots)
```

## Deploy to AMD Developer Cloud

One-command deployment to a fresh MI300X droplet:

```bash
# 1. Create a GPU Droplet on amd.digitalocean.com
#    Image: vLLM Quick Start (ROCm 7.2, vLLM 0.17.1)
#    GPU: MI300X
#    Add your SSH key

# 2. Deploy
./scripts/deploy.sh <DROPLET_IP>

# 3. Open in browser
# Frontend: http://<DROPLET_IP>:3000
# Backend:  http://<DROPLET_IP>:8080
```

The deploy script handles: code sync, Python venv, Node.js, all pip dependencies (OpenMM, Vina, RDKit, PDBFixer, Meeko, Open Babel), vLLM startup, env configuration, frontend and backend startup.

## Local Development (CPU Fallback)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8080

# Frontend
cd frontend
npm install
npm run dev
```

Without AMD GPU, the pipeline falls back to CPU for OpenMM. Vina docking works on CPU (standard). LLM requires a separate vLLM instance or can be pointed at any OpenAI-compatible API.

## EGFR Lung Cancer Results (Real Vina Docking)

| Rank | Compound | Score (kcal/mol) | vs Erlotinib (Tarceva) | Lipinski |
|------|----------|-----------------|----------------------|----------|
| 1 | WZ4002 | -8.82 | Stronger | PASS |
| 2 | Lapatinib (Tykerb) | -8.77 | Stronger | REVIEW |
| 3 | Afatinib (Gilotrif) | -8.70 | Stronger | PASS |
| 4 | CO-1686 (Rociletinib) | -8.59 | Stronger | PASS |
| 5 | Dacomitinib (Vizimpro) | -8.24 | Stronger | REVIEW |
| 6 | Gefitinib (Iressa) | -8.10 | Stronger | PASS |
| 11 | Erlotinib (Tarceva) | -7.20 | Reference (FDA approved) | - |

10 of 12 screened compounds show stronger predicted binding than the current FDA-approved drug.
All scores computed by AutoDock Vina. Receptor prepared with PDBFixer, ligands prepared with Meeko/RDKit.

## Data Sources

- RCSB Protein Data Bank: experimentally determined protein structures (X-ray crystallography)
- Published literature: curated compounds with known experimental binding data (Ki values)
- PubChem/ChEMBL: SMILES structures for drug candidates

## What is Real

- AutoDock Vina docking produces real physics-based binding scores
- OpenMM runs real energy minimization on AMD MI300X via OpenCL
- Protein structures are real X-ray crystallography data from RCSB
- RDKit computes real molecular properties
- Qwen 2.5-7B generates real AI analysis (served via vLLM on MI300X)
- 3D docked poses are real Vina output viewable in the protein viewer
- GPU benchmarks are real measurements captured with rocm-smi
- All compound SMILES are real chemical structures

## License

MIT
