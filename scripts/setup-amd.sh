#!/bin/bash
# DrugForge AMD MI300X Setup Script
# Run this on your DigitalOcean MI300X GPU Droplet
# Image: vLLM Quick Start (ROCm 7.2, vLLM 0.17.1)

set -e

echo "============================================"
echo "DrugForge AMD MI300X Setup"
echo "============================================"

# ---- Step 1: Critical Day 1 Test ----
echo ""
echo "[1/6] Running Day 1 Critical Test — OpenMM on AMD GPU..."

pip install openmm 2>/dev/null || conda install -y -c conda-forge openmm

python3 -c "
import openmm as mm
import openmm.app as app

# Check all platforms
for i in range(mm.Platform.getNumPlatforms()):
    p = mm.Platform.getPlatform(i)
    print(f'  Platform: {p.getName()} (speed: {p.getSpeed():.1f})')

# Try OpenCL (AMD GPU via ROCm)
try:
    platform = mm.Platform.getPlatformByName('OpenCL')
    print(f'')
    print(f'  ✅ OpenMM AMD ready: {platform.getName()}')
    print(f'  ✅ Speed: {platform.getSpeed()}')
except Exception as e:
    print(f'  ❌ OpenCL FAILED: {e}')
    print(f'  Trying HIP...')
    try:
        platform = mm.Platform.getPlatformByName('HIP')
        print(f'  ✅ OpenMM AMD ready via HIP: {platform.getName()}')
    except Exception as e2:
        print(f'  ❌ HIP FAILED: {e2}')
        print(f'  ⚠️  OpenMM cannot use AMD GPU. Check ROCm installation.')
        exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ Day 1 test FAILED. OpenMM cannot run on AMD GPU."
    echo "Check ROCm installation and try: apt install -y rocm-opencl-runtime"
    exit 1
fi

echo "✅ Day 1 test PASSED"

# ---- Step 2: Install Dependencies ----
echo ""
echo "[2/6] Installing Python dependencies..."

pip install fastapi "uvicorn[standard]" pydantic requests numpy \
    langgraph langchain-core openai sse-starlette python-dotenv

# RDKit for real toxicity screening
pip install rdkit-pypi 2>/dev/null || conda install -y -c conda-forge rdkit

# AutoDock Vina for molecular docking (3D poses)
pip install meeko vina 2>/dev/null && echo "  ✅ AutoDock Vina installed" || echo "  ⚠️ Vina install failed — docking will be skipped"

echo "✅ Dependencies installed"

# ---- Step 3: Clone DrugForge ----
echo ""
echo "[3/6] Cloning DrugForge..."

cd /root
if [ -d "CatalystMD" ]; then
    cd CatalystMD && git pull
else
    git clone https://github.com/YoussefMadkour/CatalystMD.git
    cd CatalystMD
fi

echo "✅ DrugForge cloned"

# ---- Step 4: Download Protein Structure ----
echo ""
echo "[4/6] Downloading COVID-19 protease (6LU7)..."

mkdir -p data/pdb_cache data/precomputed
curl -s -o data/pdb_cache/6LU7.pdb https://files.rcsb.org/download/6LU7.pdb
echo "  Downloaded: $(wc -l < data/pdb_cache/6LU7.pdb) lines"
echo "✅ Protein structure ready"

# ---- Step 5: Run Quick Simulation Test ----
echo ""
echo "[5/6] Running simulation benchmark (1000-step minimization)..."

python3 -c "
import openmm as mm
import openmm.app as app
import openmm.unit as unit
import time

pdb = app.PDBFile('data/pdb_cache/6LU7.pdb')
ff = app.ForceField('amber14-all.xml', 'amber14/tip3pfb.xml')
modeller = app.Modeller(pdb.topology, pdb.positions)
modeller.addSolvent(ff, model='tip3p', padding=1.0*unit.nanometers)

atom_count = modeller.topology.getNumAtoms()
print(f'  System size: {atom_count:,} atoms')

system = ff.createSystem(modeller.topology, nonbondedMethod=app.PME,
                         nonbondedCutoff=1.0*unit.nanometers, constraints=app.HBonds)

# Try OpenCL first, fall back to HIP
try:
    platform = mm.Platform.getPlatformByName('OpenCL')
    props = {'OpenCLPrecision': 'mixed', 'OpenCLDeviceIndex': '0'}
except:
    platform = mm.Platform.getPlatformByName('HIP')
    props = {}

integrator = mm.LangevinMiddleIntegrator(300*unit.kelvin, 1/unit.picosecond, 0.002*unit.picoseconds)
sim = app.Simulation(modeller.topology, system, integrator, platform, props)
sim.context.setPositions(modeller.positions)

print(f'  Platform: {platform.getName()}')
print(f'  Minimizing energy...')
start = time.perf_counter()
sim.minimizeEnergy(maxIterations=1000)
elapsed = time.perf_counter() - start
print(f'  Minimization: {elapsed:.1f}s')

# Check memory usage
import subprocess
try:
    out = subprocess.check_output(['rocm-smi', '--showmeminfo', 'vram'], text=True)
    print(f'  GPU Memory:')
    for line in out.strip().split('\n'):
        if 'Used' in line or 'Total' in line:
            print(f'    {line.strip()}')
except:
    print('  (rocm-smi not available for memory check)')

print(f'')
print(f'  ✅ Simulation benchmark complete')
print(f'  Atoms: {atom_count:,}')
print(f'  Time: {elapsed:.1f}s')
print(f'  Platform: {platform.getName()}')
"

echo "✅ Simulation test passed"

# ---- Step 6: Start vLLM with Qwen ----
echo ""
echo "[6/6] Starting vLLM with Qwen2.5-7B-Instruct..."
echo "  This will run in the background on port 8001"

# vLLM is pre-installed on the vLLM image
nohup vllm serve Qwen/Qwen2.5-7B-Instruct \
    --dtype float16 \
    --port 8001 \
    --max-model-len 4096 \
    --gpu-memory-utilization 0.3 \
    > /tmp/vllm.log 2>&1 &

echo "  vLLM PID: $!"
echo "  Log: /tmp/vllm.log"
echo "  Waiting for model to load (30-60s)..."

for i in $(seq 1 60); do
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        echo "  ✅ vLLM ready on port 8001"
        break
    fi
    sleep 2
done

# ---- Summary ----
echo ""
echo "============================================"
echo "DrugForge Setup Complete!"
echo "============================================"
echo ""
echo "To start the backend:"
echo "  cd /root/CatalystMD"
echo "  USE_AMD_GPU=true QWEN_API_URL=http://localhost:8001/v1 \\"
echo "    uvicorn backend.main:app --host 0.0.0.0 --port 8080"
echo ""
echo "Backend will be at: http://<your-droplet-ip>:8080"
echo "Set your frontend NEXT_PUBLIC_API_URL to that address."
echo ""
echo "💡 To save costs: destroy the droplet when not in use."
echo "   Your code is on GitHub, data re-downloads in seconds."
echo "============================================"
