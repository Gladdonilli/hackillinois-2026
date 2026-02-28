export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GenerateRequest {
  prompt: string;
  temperature?: number;     // default 0.7
  max_new_tokens?: number;  // default 256
}

export interface GenerateData {
  job_id: string;
  response: string;
  token_count: number;
  layers_cached: number;
  generation_time_ms: number;
}

export interface Feature {
  feature_id: string;
  label: string;
  activation_strength: number;
  layer: number;
  position: number;
  top_tokens: string[];
  umap_xyz: [number, number, number];
}

export interface FeaturesRequest {
  layers?: number[];
  top_k?: number;          // default 50
  min_activation?: number; // default 0.1
}

export interface FeaturesData {
  features: Feature[];
  co_activation_edges: [string, string, number][];  // [featureA_id, featureB_id, correlation]
  total_features: number;
}

export interface Ablation {
  feature_id: string;
  strength: number;  // 0.0 to 1.0, maps to clamp_value = (1 - strength) * -10
}

export interface AblateRequest {
  job_id: string;
  ablations: Ablation[];
  regenerate?: boolean;  // default true
}

export interface AblateData {
  original_response: string;
  steered_response: string;
  semantic_distance: number;
}

export interface SteerRequest {
  prompt: string;
  steering_prompt_pos: string;
  steering_prompt_neg: string;
  layer?: number;          // default 15
  alpha?: number;          // default 1.0
  max_new_tokens?: number; // default 256
}

export interface SteerData {
  original_response: string;
  steered_response: string;
  semantic_distance: number;
}

export type AppPhase = 'idle' | 'generating' | 'extracting' | 'ready' | 'ablating' | 'steering' | 'error';

export interface FeatureNode {
  feature: Feature;
  isAblated: boolean;
  isTargeted: boolean;
  ablationStrength: number;
}
