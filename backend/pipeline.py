from typing import TypedDict, Any
import asyncio
from collections.abc import Callable

from langgraph.graph import StateGraph, START, END

from backend.agents.target_identifier import run_target_identifier
from backend.agents.molecular_dynamics import run_molecular_dynamics
from backend.agents.binding_scorer import run_binding_scorer
from backend.agents.toxicity_screener import run_toxicity_screener
from backend.agents.discovery_reporter import run_discovery_reporter
from backend.compounds import DEMO_COMPOUNDS


class DrugDiscoveryState(TypedDict, total=False):
    target_protein: str
    compound_library: list[dict]
    target_analysis: dict
    simulation_results: list[dict]
    binding_rankings: dict
    toxicity_profiles: list[dict]
    discovery_brief: str
    amd_simulation_time: float
    atom_count: int
    platform_used: str
    agent_traces: list[dict]


def _wrap_node(fn: Callable, name: str, callback: Callable | None = None):
    def wrapper(state: dict) -> dict:
        if callback:
            callback(name, "running")
        if callback:
            result = fn(state, progress_cb=callback)
        else:
            result = fn(state)
        if callback:
            callback(name, "completed")
        return result
    return wrapper


def build_graph(progress_callback: Callable | None = None) -> StateGraph:
    graph = StateGraph(DrugDiscoveryState)

    graph.add_node("identify_target", _wrap_node(run_target_identifier, "identify_target", progress_callback))
    graph.add_node("simulate", _wrap_node(run_molecular_dynamics, "simulate", progress_callback))
    graph.add_node("score_binding", _wrap_node(run_binding_scorer, "score_binding", progress_callback))
    graph.add_node("screen_toxicity", _wrap_node(run_toxicity_screener, "screen_toxicity", progress_callback))
    graph.add_node("generate_brief", _wrap_node(run_discovery_reporter, "generate_brief", progress_callback))

    graph.add_edge(START, "identify_target")
    graph.add_edge("identify_target", "simulate")
    graph.add_edge("simulate", "score_binding")
    graph.add_edge("score_binding", "screen_toxicity")
    graph.add_edge("screen_toxicity", "generate_brief")
    graph.add_edge("generate_brief", END)

    return graph


def run_pipeline(
    pdb_id: str = "6LU7",
    compounds: list[dict] | None = None,
    progress_callback: Callable | None = None,
) -> dict:
    if compounds is None:
        compounds = DEMO_COMPOUNDS

    graph = build_graph(progress_callback)
    app = graph.compile()

    initial_state: DrugDiscoveryState = {
        "target_protein": pdb_id,
        "compound_library": compounds,
    }

    result = app.invoke(initial_state)
    return result


async def run_pipeline_async(
    pdb_id: str = "6LU7",
    compounds: list[dict] | None = None,
    progress_callback: Callable | None = None,
) -> dict:
    return await asyncio.to_thread(run_pipeline, pdb_id, compounds, progress_callback)
