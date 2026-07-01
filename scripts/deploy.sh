#!/bin/bash
# CatalystMD Full Deploy Script
# =============================
# Deploys CatalystMD to a fresh AMD Developer Cloud MI300X droplet.
# Handles everything: code sync, deps, vLLM, backend, frontend.
#
# Usage:
#   cd CatalystMD
#   ./scripts/deploy.sh <DROPLET_IP>
#
# Prerequisites:
#   1. Create a GPU Droplet on amd.digitalocean.com:
#      - Image: vLLM Quick Start (ROCm 7.2, vLLM 0.17.1)
#      - GPU: MI300X
#      - Add your SSH key (~/.ssh/id_ed25519.pub)
#   2. Run this script from the CatalystMD project root
#
# What this script does:
#   - Syncs code to the droplet (excludes node_modules, .git, venv, .env)
#   - Installs python3.12-venv + Node.js 20 if missing
#   - Creates Python venv, installs backend deps (uses `rdkit` not `rdkit-pypi`)
#   - Installs frontend npm deps
#   - Patches next.config.ts to allow the droplet IP as a dev origin
#     (Next.js 16+ blocks cross-origin dev resources by default)
#   - Starts vLLM inside the pre-existing `rocm` Docker container
#   - Discovers the Docker container IP so the backend can reach vLLM
#   - Writes backend .env and frontend .env.local with correct URLs
#   - Starts backend on port 8080 (port 8000 is taken by Docker)
#   - Starts frontend on port 3000
#
# Known issues this script accounts for:
#   - `rdkit-pypi` doesn't exist for Python 3.12 on this image → use `rdkit`
#   - Port 8000 is occupied by the rocm Docker container → backend uses 8080
#   - Next.js 16 blocks dev resources from non-localhost origins → patched via allowedDevOrigins
#   - vLLM runs inside Docker, not on the host → backend .env uses Docker container IP
#   - SSH commands with `pkill` exit non-zero when no process found → `|| true` everywhere
#   - PDB files need PDBFixer (missing hydrogens, terminal caps) before OpenMM can process them
#   - OpenMM uses implicit solvent (OBC2) for fast demo (~5s/compound, ~4730 atoms)
#   - Explicit solvent (5nm, ~800K atoms) would take hours per compound — only for precompute
#   - Frontend process can die silently — script always kills and restarts both services

set -e

# ---- Config ----
DROPLET_IP="${1:?Usage: ./scripts/deploy.sh <DROPLET_IP>}"
SSH="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@${DROPLET_IP}"
REMOTE_DIR="/root/CatalystMD"
VLLM_MODEL="Qwen/Qwen2.5-7B-Instruct"
BACKEND_PORT=8080
FRONTEND_PORT=3000
VLLM_PORT=8001

echo "============================================"
echo "CatalystMD Deploy to ${DROPLET_IP}"
echo "============================================"

# ---- Step 1: Wait for SSH ----
echo ""
echo "[1/8] Waiting for SSH..."
for i in $(seq 1 30); do
    if $SSH "echo ok" > /dev/null 2>&1; then
        echo "  Connected."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "  ERROR: Cannot SSH into ${DROPLET_IP} after 60s"
        exit 1
    fi
    sleep 2
done

# ---- Step 2: Sync code ----
echo ""
echo "[2/8] Syncing project files..."
rsync -avz --quiet \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '__pycache__' \
    --exclude '.git' \
    --exclude 'venv' \
    --exclude '.venv' \
    --exclude '.env' \
    --exclude '.env.local' \
    "$(pwd)/" "root@${DROPLET_IP}:${REMOTE_DIR}/"
echo "  Done."

# ---- Step 3: Install system deps ----
echo ""
echo "[3/8] Installing system dependencies..."
$SSH "apt-get update -qq > /dev/null 2>&1 && apt-get install -y -qq python3.12-venv openbabel > /dev/null 2>&1" || true

# SSH may drop during apt installs (sshd restarts). Wait for it to come back.
sleep 5
for i in $(seq 1 15); do
    if $SSH "echo ok" > /dev/null 2>&1; then break; fi
    sleep 3
done

# Install Node.js 20 if not present
$SSH "command -v node > /dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1 && apt-get install -y -qq nodejs > /dev/null 2>&1)"
echo "  Node: $($SSH 'node --version 2>/dev/null || echo "not found"')"
echo "  Python: $($SSH 'python3 --version 2>/dev/null || echo "not found"')"

# ---- Step 4: Python venv + backend deps ----
echo ""
echo "[4/8] Setting up Python venv and backend dependencies..."
# NOTE: Use `rdkit` (not `rdkit-pypi`) — rdkit-pypi doesn't publish wheels for Python 3.12
$SSH "cd ${REMOTE_DIR} && \
    python3 -m venv venv 2>/dev/null || true; \
    source venv/bin/activate && \
    pip install -q \
        fastapi 'uvicorn[standard]' pydantic requests numpy \
        langgraph langchain-core openai rdkit sse-starlette python-dotenv openmm pdbfixer \
        vina meeko scipy gemmi \
        2>&1 | tail -1"
echo "  Done."

# ---- Step 5: Frontend deps ----
echo ""
echo "[5/8] Installing frontend dependencies..."
$SSH "cd ${REMOTE_DIR}/frontend && npm install --silent 2>&1 | tail -1"
echo "  Done."

# ---- Step 6: Start vLLM inside Docker ----
echo ""
echo "[6/8] Starting vLLM with ${VLLM_MODEL}..."

# Check if vLLM is already serving the model
VLLM_RUNNING=$($SSH "docker exec rocm curl -s http://localhost:${VLLM_PORT}/v1/models 2>/dev/null | grep -q '${VLLM_MODEL}' && echo yes || echo no" 2>/dev/null || echo "no")

if [ "$VLLM_RUNNING" = "yes" ]; then
    echo "  vLLM already running."
else
    $SSH "docker exec -d rocm bash -c 'vllm serve ${VLLM_MODEL} --host 0.0.0.0 --port ${VLLM_PORT} --trust-remote-code > /tmp/vllm.log 2>&1'"
    echo "  Waiting for model to download and load (up to 3 min)..."
    for i in $(seq 1 90); do
        if $SSH "docker exec rocm curl -s http://localhost:${VLLM_PORT}/v1/models 2>/dev/null | grep -q '${VLLM_MODEL}'" 2>/dev/null; then
            echo "  vLLM ready."
            break
        fi
        if [ "$i" -eq 90 ]; then
            echo "  ERROR: vLLM failed to start after 3 minutes."
            echo "  Check logs: ssh root@${DROPLET_IP} 'docker exec rocm tail -50 /tmp/vllm.log'"
            exit 1
        fi
        sleep 2
    done
fi

# Get Docker container IP — backend runs on host, vLLM runs in container
# so backend needs the container's bridge IP to reach vLLM
CONTAINER_IP=$($SSH "docker inspect rocm --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'")
echo "  vLLM container IP: ${CONTAINER_IP}"

# ---- Step 7: Configure and start backend ----
echo ""
echo "[7/8] Starting backend on port ${BACKEND_PORT}..."
echo "  (Port 8000 is taken by the rocm Docker container — using ${BACKEND_PORT})"

# Kill any existing backend
$SSH "pkill -f 'uvicorn backend.main' 2>/dev/null || true"
sleep 1

# Write backend .env pointing at vLLM inside Docker
$SSH "cat > ${REMOTE_DIR}/backend/.env << EOF
QWEN_API_URL=http://${CONTAINER_IP}:${VLLM_PORT}/v1
QWEN_MODEL=${VLLM_MODEL}
OPENAI_API_KEY=not-needed
USE_AMD_GPU=true
OPENCL_DEVICE_INDEX=0
EOF"

$SSH "cd ${REMOTE_DIR} && source venv/bin/activate && setsid nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port ${BACKEND_PORT} > /tmp/backend.log 2>&1 &"
sleep 3

# Verify backend
if $SSH "curl -s http://localhost:${BACKEND_PORT}/api/health 2>/dev/null | grep -q ok"; then
    echo "  Backend running."
else
    echo "  WARNING: Backend may still be starting."
    echo "  Check: ssh root@${DROPLET_IP} 'tail -20 /tmp/backend.log'"
fi

# ---- Step 8: Configure and start frontend ----
echo ""
echo "[8/8] Starting frontend on port ${FRONTEND_PORT}..."

# Kill any existing frontend
$SSH "pkill -f 'next dev' 2>/dev/null || true"
sleep 1

# Write frontend .env
$SSH "echo NEXT_PUBLIC_API_URL=http://${DROPLET_IP}:${BACKEND_PORT} > ${REMOTE_DIR}/frontend/.env.local"

# Patch next.config.ts to allow this IP as a dev origin
# Next.js 16+ blocks cross-origin dev resources (JS bundles, fonts, WebSocket HMR)
# which breaks the app when accessed via IP instead of localhost
$SSH "printf 'import type { NextConfig } from \"next\";\nconst nextConfig: NextConfig = { allowedDevOrigins: [\"%s\"] };\nexport default nextConfig;\n' '${DROPLET_IP}' > ${REMOTE_DIR}/frontend/next.config.ts"

$SSH "cd ${REMOTE_DIR}/frontend && setsid nohup node_modules/.bin/next dev --hostname 0.0.0.0 --port ${FRONTEND_PORT} > /tmp/frontend.log 2>&1 &"
sleep 5

if $SSH "curl -s http://localhost:${FRONTEND_PORT} > /dev/null 2>&1"; then
    echo "  Frontend running."
else
    echo "  WARNING: Frontend may still be starting."
    echo "  Check: ssh root@${DROPLET_IP} 'tail -20 /tmp/frontend.log'"
fi

# ---- Summary ----
echo ""
echo "============================================"
echo "CatalystMD Deployed!"
echo "============================================"
echo ""
echo "  Open in browser: http://${DROPLET_IP}:${FRONTEND_PORT}"
echo ""
echo "  Services:"
echo "    Frontend:  http://${DROPLET_IP}:${FRONTEND_PORT}"
echo "    Backend:   http://${DROPLET_IP}:${BACKEND_PORT}"
echo "    Health:    http://${DROPLET_IP}:${BACKEND_PORT}/api/health"
echo "    vLLM:      inside Docker (${VLLM_MODEL})"
echo "    GPU:       AMD MI300X (192GB)"
echo ""
echo "  Logs:"
echo "    Backend:   ssh root@${DROPLET_IP} 'tail -f /tmp/backend.log'"
echo "    Frontend:  ssh root@${DROPLET_IP} 'tail -f /tmp/frontend.log'"
echo "    vLLM:      ssh root@${DROPLET_IP} 'docker exec rocm tail -f /tmp/vllm.log'"
echo ""
echo "  Redeploy after code changes:"
echo "    ./scripts/deploy.sh ${DROPLET_IP}"
echo ""
echo "  Destroy the droplet when done to save credits!"
echo "============================================"
