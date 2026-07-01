"""
CatalystMD - AI Drug Discovery on AMD MI300X
HuggingFace Space demo using precomputed results from the full pipeline.

All results were computed on AMD Instinct MI300X using:
- AutoDock Vina for molecular docking (real physics-based binding scores)
- OpenMM with AMBER14 force field for energy minimization (OpenCL on MI300X)
- Qwen 2.5-7B (HuggingFace Hub) via vLLM for AI analysis
- RDKit for toxicity screening (Lipinski + PAINS)
"""

import gradio as gr
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

TARGETS = {
    "6LU7": {
        "name": "SARS-CoV-2 Main Protease (COVID-19)",
        "pdb_id": "6LU7",
        "reference_drug": "Nirmatrelvir (Paxlovid)",
        "description": "The main protease that COVID-19 needs to replicate. Paxlovid targets this protein.",
        "residues": "His41, Cys145, Glu166, His164",
        "compounds": 20,
    },
    "6OIM": {
        "name": "KRAS G12C (Lung Cancer)",
        "pdb_id": "6OIM",
        "reference_drug": "Sotorasib (Lumakras)",
        "description": "The most frequently mutated oncogene in human cancer. Was 'undruggable' for 40 years until 2021.",
        "residues": "Cys12, His95, Tyr96, Asp69",
        "compounds": 15,
    },
    "1M17": {
        "name": "EGFR Kinase (Lung Cancer)",
        "pdb_id": "1M17",
        "reference_drug": "Erlotinib (Tarceva)",
        "description": "Receptor tyrosine kinase found in 15-30% of non-small cell lung cancers. $8B/yr drug market.",
        "residues": "Met793, Thr790, Lys745, Asp855",
        "compounds": 12,
    },
    "1HIV": {
        "name": "HIV-1 Protease",
        "pdb_id": "1HIV",
        "reference_drug": "Saquinavir",
        "description": "HIV-1 protease cleaves viral polyproteins during maturation. Target of all protease inhibitor antiretrovirals.",
        "residues": "Asp25, Thr26, Gly27, Asp25'",
        "compounds": 10,
    },
}


def load_results(pdb_id):
    """Load precomputed results for a target."""
    results_file = DATA_DIR / f"{pdb_id}_results.json"
    if results_file.exists():
        return json.loads(results_file.read_text())
    return None


def get_3d_viewer(pdb_id):
    return f'<iframe src="https://3Dmol.csb.pitt.edu/viewer.html?pdb={pdb_id}&style=cartoon:color~spectrum" width="100%" height="450" style="border:none;border-radius:12px;"></iframe>'


def run_demo(pdb_id, progress=gr.Progress()):
    target = TARGETS[pdb_id]
    results = load_results(pdb_id)

    progress(0.1, desc="Loading target analysis...")

    # Target info
    target_md = f"""### {target['name']}
**PDB:** {pdb_id} | **Reference drug:** {target['reference_drug']}
**Binding site:** {target['residues']}

{target['description']}
"""

    if not results:
        progress(1.0)
        return (
            target_md,
            "Precomputed results not available for this target. Run the full pipeline on AMD MI300X to generate results.",
            "",
            "",
        )

    progress(0.3, desc="Loading binding rankings...")

    # Rankings table
    rankings = results.get("binding_rankings", {}).get("rankings", [])
    ref_name = results.get("binding_rankings", {}).get("reference_drug_name", target["reference_drug"])

    # Build toxicity lookup for Lipinski column
    tox_profiles = results.get("toxicity_profiles", [])
    tox_map = {t["compound_id"]: t for t in tox_profiles}

    rankings_md = f"| Rank | Compound | Score (kcal/mol) | vs {ref_name} | Lipinski |\n|------|----------|-----------------|-------------|----------|\n"
    for r in rankings:
        vs = r.get("vs_reference", "similar")
        vs_display = "STRONGER" if vs == "stronger" else ("Similar" if vs == "similar" else "Weaker")
        tox = tox_map.get(r.get("compound_id"), {})
        lip = tox.get("lipinski", {})
        violations = lip.get("lipinski_violations")
        if violations is not None:
            lip_display = f"{violations}/4 {'PASS' if tox.get('overall_pass') else 'REVIEW'}"
        else:
            lip_display = "-"
        rankings_md += f"| {r['rank']} | {r['compound_name']} | {r['binding_score_kcal_mol']:.2f} | {vs_display} | {lip_display} |\n"

    progress(0.6, desc="Loading toxicity screening...")

    # Toxicity summary
    tox_profiles = results.get("toxicity_profiles", [])
    tox_md = "### Toxicity Screening (Lipinski + PAINS)\n\n"
    if tox_profiles:
        tox_md += "| Compound | MW | LogP | Violations | Status |\n|----------|-----|------|------------|--------|\n"
        for t in tox_profiles:
            lip = t.get("lipinski", {})
            status = "PASS" if t.get("overall_pass") else "REVIEW"
            tox_md += f"| {t['compound_name']} | {lip.get('molecular_weight', '-')} | {lip.get('logP', '-')} | {lip.get('lipinski_violations', '-')}/4 | {status} |\n"

    progress(0.8, desc="Loading discovery brief...")

    # Brief
    brief = results.get("discovery_brief", "No brief available.")

    progress(1.0, desc="Complete!")
    return target_md, rankings_md, tox_md, f"```\n{brief}\n```"


with gr.Blocks(
    title="CatalystMD - AI Drug Discovery on AMD MI300X",
    theme=gr.themes.Soft(
        primary_hue="blue",
        neutral_hue="slate",
    ),
) as demo:
    gr.Markdown("""
# CatalystMD
### AI-Powered Drug Discovery on AMD MI300X

5 AI agents run a complete drug discovery pipeline: molecular docking (AutoDock Vina),
physics simulation (OpenMM on AMD MI300X), binding scoring, toxicity screening (RDKit),
and AI-generated analysis (Qwen 2.5-7B via vLLM).

**Built for the AMD Developer Hackathon 2026** | [GitHub](https://github.com/YoussefMadkour/CatalystMD)
    """)

    with gr.Row():
        with gr.Column(scale=3):
            viewer = gr.HTML(value=get_3d_viewer("6LU7"), label="3D Protein Structure")
        with gr.Column(scale=2):
            pdb_select = gr.Dropdown(
                choices=[(TARGETS[k]["name"], k) for k in TARGETS],
                value="6LU7",
                label="Disease Target",
            )
            target_info = gr.Markdown()
            run_btn = gr.Button("View Pipeline Results", variant="primary", size="lg")

            gr.Markdown("""
**How it works:**
1. Target Analyst identifies the protein and binding pocket
2. Molecular Dynamics docks each compound (AutoDock Vina + OpenMM on MI300X)
3. Binding Scorer ranks candidates vs FDA-approved drug
4. Toxicity Screener checks drug-likeness (Lipinski + PAINS)
5. Discovery Reporter generates a scientific brief (Qwen 2.5-7B)
            """)

    pdb_select.change(fn=get_3d_viewer, inputs=pdb_select, outputs=viewer)

    with gr.Tab("Binding Rankings"):
        rankings_out = gr.Markdown()

    with gr.Tab("Toxicity"):
        tox_out = gr.Markdown()

    with gr.Tab("Discovery Brief"):
        brief_out = gr.Markdown()

    run_btn.click(
        fn=run_demo,
        inputs=pdb_select,
        outputs=[target_info, rankings_out, tox_out, brief_out],
    )

if __name__ == "__main__":
    demo.launch()
