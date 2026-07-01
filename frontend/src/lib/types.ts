export interface Compound {
  id: string;
  name: string;
  smiles: string;
  known_ki_nm: number;
}

export interface BindingSite {
  center_coords: number[];
  key_residues: string[];
  pocket_volume_A3: number;
}

export interface TargetAnalysis {
  protein_name: string;
  pdb_id: string;
  pdb_path: string;
  resolution_angstroms: number;
  pdb_atom_count: number;
  binding_site: BindingSite;
  biological_context: string;
  therapeutic_relevance: string;
}

export interface RankingEntry {
  rank: number;
  compound_id: string;
  compound_name: string;
  binding_score_kcal_mol: number;
  vs_nirmatrelvir?: "stronger" | "weaker" | "similar";
  delta_vs_nirmatrelvir?: number;
  vs_reference?: "stronger" | "weaker" | "similar";
  delta_vs_reference?: number;
  known_ki_nm: number | null;
}

export interface BindingRankings {
  rankings: RankingEntry[];
  nirmatrelvir_reference_score?: number;
  reference_drug_id?: string;
  reference_drug_name?: string;
  reference_score?: number;
  top_hit: RankingEntry;
  interpretation: string;
  total_screened: number;
}

export interface LipinskiResult {
  molecular_weight: number;
  logP: number;
  H_bond_donors: number;
  H_bond_acceptors: number;
  lipinski_violations: number;
  drug_like: boolean;
}

export interface ToxicityProfile {
  compound_id: string;
  compound_name: string;
  rank: number;
  binding_score_kcal_mol: number;
  lipinski: LipinskiResult;
  pains_flags: string[];
  toxicity_flags: string[];
  overall_pass: boolean;
}

export interface Benchmark {
  atom_count: number;
  simulation_time_seconds: number;
  platform: string;
  total_compounds: number;
  method: string;
}

export interface LLMCall {
  prompt: string;
  model: string;
  response: string;
  duration_ms: number;
  success: boolean;
  error?: string;
}

export interface AgentTraceStep {
  action: string;
  detail: string;
}

export interface AgentTrace {
  agent: string;
  agent_name: string;
  duration_seconds: number;
  model: string | null;
  input_summary: string;
  output_summary: string;
  steps: AgentTraceStep[];
  llm_calls: LLMCall[];
}

export interface PipelineResults {
  status: "completed";
  target_analysis: TargetAnalysis;
  binding_rankings: BindingRankings;
  toxicity_profiles: ToxicityProfile[];
  discovery_brief: string;
  benchmark: Benchmark;
  agent_traces?: AgentTrace[];
}

export type AgentName =
  | "identify_target"
  | "simulate"
  | "score_binding"
  | "screen_toxicity"
  | "generate_brief";

export type AgentStatus = "pending" | "running" | "completed";

export interface AgentStatusMap {
  identify_target: AgentStatus;
  simulate: AgentStatus;
  score_binding: AgentStatus;
  screen_toxicity: AgentStatus;
  generate_brief: AgentStatus;
}

export type AppState = "idle" | "running" | "completed";
