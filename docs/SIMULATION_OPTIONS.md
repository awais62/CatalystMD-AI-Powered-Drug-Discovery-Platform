# CatalystMD — Simulation Plan for AMD MI300X

## Compound Counts

| Target | PDB | Disease | Compounds | Reference Drug |
|---|---|---|---|---|
| COVID-19 Protease | 6LU7 | COVID-19 | 20 | Paxlovid (nirmatrelvir) |
| HIV-1 Protease | 1HIV | HIV/AIDS | 10 | Darunavir, Ritonavir |
| KRAS G12C | 6OIM | Lung Cancer | 15 | Sotorasib (Lumakras) |
| EGFR Kinase | 1M17 | Lung Cancer | 12 | Erlotinib (Tarceva) |
| **Total** | | **4 diseases** | **57** | |

---

## Water Box — Why It Matters

Proteins float in water. The simulation puts the protein in a box of water molecules. More water = more accurate physics = more atoms = more GPU memory.

| Padding | Atoms per System | GPU Memory | Quality |
|---|---|---|---|
| 1.0 nm | ~85,000 | ~4-8 GB | Demo — fast, less accurate |
| 3.0 nm | ~300,000 | ~15-25 GB | Publication quality |
| 5.0 nm | ~800,000 | ~80-120 GB | Pharma-grade — needs MI300X |

At **5nm padding**, each individual simulation legitimately requires 80-120GB of GPU memory. A standard NVIDIA H100 (80GB) cannot run it. AMD MI300X (192GB) can.

---

## Two Simulation Modes on AMD

### Mode 1: Quick Demo (run first)

**Purpose:** Get working results fast for the demo video and live testing.

| Setting | Value |
|---|---|
| Water padding | 1.0 nm |
| Atoms per system | ~85,000 |
| GPU memory per sim | ~4-8 GB |
| Simulation steps | 1,000 (energy minimization) |
| Time per compound | ~30-60 sec |

| Target | Compounds | Estimated Time |
|---|---|---|
| COVID-19 (6LU7) | 20 | ~15 min |
| HIV (1HIV) | 10 | ~8 min |
| KRAS G12C (6OIM) | 15 | ~12 min |
| EGFR (1M17) | 12 | ~10 min |
| **Total** | **57** | **~45 min** |

**Cost:** ~$2 (1 hour at $1.99/hr)

**What you get:**
- Working results for all 57 compounds across 4 targets
- Real OpenMM simulation on AMD GPU (not fallback)
- Real binding scores to show in the demo video
- `rocm-smi` screenshot showing GPU in use
- Agent traces with real timing

**Use for:** Demo video recording, live demo, validating the pipeline works on AMD.

---

### Mode 2: Production Benchmark (run overnight)

**Purpose:** Real pharma-grade numbers for the benchmark card and submission.

| Setting | Value |
|---|---|
| Water padding | 5.0 nm |
| Atoms per system | ~800,000 |
| GPU memory per sim | ~80-120 GB |
| Simulation steps | 50,000 (0.2ns MD) |
| Time per compound | ~15-30 min |

| Target | Compounds | Estimated Time |
|---|---|---|
| COVID-19 (6LU7) | 20 | ~6-10 hrs |
| HIV (1HIV) | 10 | ~3-5 hrs |
| KRAS G12C (6OIM) | 15 | ~5-8 hrs |
| EGFR (1M17) | 12 | ~4-6 hrs |
| **Total** | **57** | **~18-29 hrs** |

**Cost:** ~$36-58 (at $1.99/hr)

**What you get:**
- Real `rocm-smi` showing 80-120GB GPU memory usage per simulation
- Screenshot proof: "This doesn't fit on H100"
- Publication-quality binding affinity estimates
- Real wall-clock timing for benchmark card
- Pre-computed results saved as JSON (cached for demo)

**Use for:** Benchmark card numbers, submission, LinkedIn Post 2 claims.

**Note:** Can do COVID-19 only at 5nm (~$16) if budget is tight. KRAS and EGFR at 3nm (~$8) as a middle ground.

---

## Budget Plan ($100 credit, $1.99/hr = ~50 hrs)

| Task | Time | Cost |
|---|---|---|
| Setup + Day 1 test | 1 hr | $2 |
| **Mode 1: Quick Demo (all 57)** | 1 hr | $2 |
| **Mode 2: COVID @ 5nm** | 8 hrs | $16 |
| **Mode 2: KRAS @ 3nm** | 2 hrs | $4 |
| **Mode 2: EGFR @ 3nm** | 1.5 hrs | $3 |
| **Mode 2: HIV @ 3nm** | 1 hr | $2 |
| vLLM + Qwen (runs alongside) | — | $0 |
| Debugging buffer | 2 hrs | $4 |
| HuggingFace Space deploy | 1 hr | $2 |
| **Total** | **~18 hrs** | **~$35** |

Leaves **$65 buffer** (~33 hours) for re-runs and unexpected issues.

**Key rule:** Destroy the instance between sessions. Don't leave it idle.

---

## Execution Order on AMD

```
Day 1 (today/tomorrow):
1. Spin up MI300X instance (vLLM image, ROCm 7.2)
2. Run setup script: bash scripts/setup-amd.sh
3. Run Mode 1 (Quick Demo) — all 57 compounds @ 1nm
4. Record rocm-smi screenshot
5. Save results as precomputed JSON
6. Record demo video with live results
7. Destroy instance

Day 2 (overnight):
1. Spin up instance again
2. Run Mode 2 (Production) — COVID @ 5nm, rest @ 3nm
3. Record rocm-smi showing 80-120GB memory usage
4. Save pre-computed results
5. Deploy HuggingFace Space
6. Destroy instance

Day 3 (submission day):
1. Spin up for final testing if needed
2. Verify HF Space works
3. Submit
4. Destroy instance
```

---

## Code Change for Water Box

One line in `backend/simulation/openmm_runner.py` and `backend/simulation/fast_scorer.py`:

```python
# Quick demo (Mode 1)
SOLVENT_PADDING = float(os.getenv("SOLVENT_PADDING_NM", "1.0"))

modeller.addSolvent(forcefield, model='tip3p',
                    padding=SOLVENT_PADDING * unit.nanometers)
```

Set via environment variable:
- Local dev: `SOLVENT_PADDING_NM=1.0` (default)
- Quick demo on AMD: `SOLVENT_PADDING_NM=1.0`
- Production benchmark: `SOLVENT_PADDING_NM=5.0`
