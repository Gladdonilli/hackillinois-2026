import type {
  ApiResponse,
  GenerateRequest,
  GenerateData,
  FeaturesRequest,
  FeaturesData,
  AblateRequest,
  AblateData,
  SteerRequest,
  SteerData
} from '../types';


const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function apiCall<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const json: ApiResponse<T> = await res.json();
  
  if (!json.success || json.data === undefined) {
    throw new Error(json.error || 'Unknown API error');
  }
  
  return json.data;
}

export async function generate(req: GenerateRequest): Promise<GenerateData> {
  return apiCall<GenerateData>('/generate', req);
}

export async function extractFeatures(jobId: string, req?: FeaturesRequest): Promise<FeaturesData> {
  return apiCall<FeaturesData>('/features', { job_id: jobId, ...req });
}

export async function ablateFeatures(req: AblateRequest): Promise<AblateData> {
  return apiCall<AblateData>('/ablate', req);
}

export async function steer(req: SteerRequest): Promise<SteerData> {
  return apiCall<SteerData>('/steer', req);
}
