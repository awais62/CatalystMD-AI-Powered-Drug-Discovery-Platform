import asyncio
import json
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from backend.pipeline import run_pipeline_async
from backend.compounds import DEMO_COMPOUNDS, TARGET_COMPOUNDS
from backend.config import KNOWN_TARGETS
from backend.simulation.openmm_runner import download_pdb

jobs: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    jobs.clear()


app = FastAPI(title="CatalystMD API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    pdb_id: str = "6LU7"
    compound_ids: list[str] | None = None


class RunResponse(BaseModel):
    job_id: str
    status: str


AGENT_NAMES = [
    "identify_target",
    "simulate",
    "score_binding",
    "screen_toxicity",
    "generate_brief",
]

AGENT_DISPLAY = {
    "identify_target": "Drug Target Identifier",
    "simulate": "Molecular Dynamics (AMD MI300X)",
    "score_binding": "Binding Scorer",
    "screen_toxicity": "Toxicity Screener",
    "generate_brief": "Discovery Reporter",
}


@app.post("/api/run", response_model=RunResponse)
async def start_run(req: RunRequest):
    job_id = str(uuid.uuid4())[:8]

    target_compounds = TARGET_COMPOUNDS.get(req.pdb_id.upper(), DEMO_COMPOUNDS)
    if req.compound_ids:
        compounds = [c for c in target_compounds if c["id"] in req.compound_ids]
    else:
        compounds = target_compounds

    jobs[job_id] = {
        "status": "running",
        "agent_status": {name: "pending" for name in AGENT_NAMES},
        "result": None,
        "events": asyncio.Queue(),
    }

    async def _run():
        def progress_cb(agent_name: str, status: str, **kwargs):
            jobs[job_id]["agent_status"][agent_name] = status
            event = {
                "agent": agent_name,
                "agent_display": AGENT_DISPLAY.get(agent_name, agent_name),
                "status": status,
            }
            if "compound" in kwargs:
                event["compound"] = kwargs["compound"]
                event["total"] = kwargs.get("total", 0)
                event["compound_name"] = kwargs.get("name", "")
                jobs[job_id]["compound_progress"] = {
                    "current": kwargs["compound"],
                    "total": kwargs.get("total", 0),
                    "name": kwargs.get("name", ""),
                }
                if kwargs.get("atoms"):
                    jobs[job_id]["atom_count"] = kwargs["atoms"]
            if "step" in kwargs:
                event["step"] = kwargs["step"]
                jobs[job_id]["current_step"] = kwargs["step"]
            try:
                jobs[job_id]["events"].put_nowait(event)
            except asyncio.QueueFull:
                pass

        try:
            result = await run_pipeline_async(req.pdb_id, compounds, progress_cb)
            jobs[job_id]["result"] = result
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["events"].put_nowait({"status": "completed"})
        except Exception as e:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)
            jobs[job_id]["events"].put_nowait({"status": "failed", "error": str(e)})

    asyncio.create_task(_run())
    return RunResponse(job_id=job_id, status="running")


@app.get("/api/status/{job_id}")
async def stream_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        job = jobs[job_id]
        yield {"event": "status", "data": json.dumps({
            "status": job["status"],
            "agent_status": job["agent_status"],
        })}

        while job["status"] == "running":
            try:
                event = await asyncio.wait_for(job["events"].get(), timeout=30.0)
                yield {"event": "update", "data": json.dumps(event)}
                if event.get("status") in ("completed", "failed"):
                    break
            except asyncio.TimeoutError:
                yield {"event": "heartbeat", "data": "{}"}

        yield {"event": "done", "data": json.dumps({"status": job["status"]})}

    return EventSourceResponse(event_generator())


@app.get("/api/results/{job_id}")
async def get_results(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    if job["status"] == "running":
        resp = {"status": "running", "agent_status": job["agent_status"]}
        if "compound_progress" in job:
            resp["compound_progress"] = job["compound_progress"]
        if "current_step" in job:
            resp["current_step"] = job["current_step"]
        if "atom_count" in job:
            resp["atom_count"] = job["atom_count"]
        return resp
    if job["status"] == "failed":
        raise HTTPException(status_code=500, detail=job.get("error", "Pipeline failed"))

    result = job["result"]
    return {
        "status": "completed",
        "target_analysis": result.get("target_analysis"),
        "binding_rankings": result.get("binding_rankings"),
        "toxicity_profiles": result.get("toxicity_profiles"),
        "discovery_brief": result.get("discovery_brief"),
        "agent_traces": result.get("agent_traces", []),
        "benchmark": {
            "atom_count": result.get("atom_count", 0),
            "simulation_time_seconds": result.get("amd_simulation_time", 0),
            "platform": result.get("platform_used", "unknown"),
            "total_compounds": len(result.get("simulation_results", [])),
            "method": result.get("simulation_results", [{}])[0].get("method", "unknown") if result.get("simulation_results") else "unknown",
        },
    }


@app.get("/api/protein/{pdb_id}")
async def get_protein(pdb_id: str):
    try:
        pdb_path = await asyncio.to_thread(download_pdb, pdb_id)
        return {"pdb_id": pdb_id.upper(), "pdb_data": pdb_path.read_text()}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch PDB {pdb_id}: {e}")


@app.get("/api/targets")
async def list_targets():
    return {
        "targets": [
            {"pdb_id": k, "name": v["name"], "ligand_id": v.get("ligand_id", "UNK")}
            for k, v in KNOWN_TARGETS.items()
        ]
    }


@app.get("/api/compounds")
async def list_compounds(pdb_id: str = "6LU7"):
    compounds = TARGET_COMPOUNDS.get(pdb_id.upper(), DEMO_COMPOUNDS)
    return {"compounds": compounds}


@app.get("/api/dock/{pdb_id}/{compound_id}")
async def dock_single(pdb_id: str, compound_id: str):
    """Dock a single compound — returns 3D pose PDB string for the viewer."""
    from backend.simulation.docking import dock_compound

    target_info = KNOWN_TARGETS.get(pdb_id.upper())
    if not target_info:
        raise HTTPException(status_code=404, detail=f"Unknown target: {pdb_id}")

    target_compounds = TARGET_COMPOUNDS.get(pdb_id.upper(), DEMO_COMPOUNDS)
    compound = next((c for c in target_compounds if c["id"] == compound_id), None)
    if not compound:
        raise HTTPException(status_code=404, detail=f"Unknown compound: {compound_id}")

    pdb_path = await asyncio.to_thread(download_pdb, pdb_id)
    center = target_info.get("binding_site_center", [0, 0, 0])

    result = await asyncio.to_thread(
        dock_compound, str(pdb_path), compound["smiles"], compound_id, center
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@app.get("/api/benchmark/gpu")
async def get_gpu_measurements():
    """Return GPU measurement data if available."""
    from backend.config import DATA_DIR
    gpu_file = DATA_DIR / "gpu_measurements" / "gpu_measurements.json"
    if not gpu_file.exists():
        return {"available": False}
    data = json.loads(gpu_file.read_text())
    # Return summary per target (not all snapshots)
    summary = []
    for pdb_id, info in data.get("targets", {}).items():
        sim = info.get("simulation", {})
        summary.append({
            "pdb_id": pdb_id,
            "protein": info.get("protein", pdb_id),
            "atom_count": sim.get("atom_count", 0),
            "wall_time_seconds": info.get("wall_time_seconds", 0),
            "peak_gpu_pct": info.get("peak_gpu_utilization_pct", 0),
            "peak_power_watts": info.get("peak_power_watts", 0),
            "vram_delta_mb": info.get("vram_delta_mb", 0),
            "platform": sim.get("platform", "unknown"),
            "method": sim.get("method", "unknown"),
        })
    return {"available": True, "measurements": summary}


@app.get("/api/benchmark/explicit")
async def get_explicit_benchmark():
    """Return real explicit-solvent benchmark data if available."""
    from backend.config import DATA_DIR
    bench_file = DATA_DIR / "precomputed" / "benchmark_explicit.json"
    if not bench_file.exists():
        return {"available": False}
    return {"available": True, **json.loads(bench_file.read_text())}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "catalystmd"}
