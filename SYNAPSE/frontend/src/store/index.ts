import { create } from 'zustand';
import {
  AppPhase,
  Feature,
  GenerateData,
  FeaturesData,
  AblateData,
  SteerData
} from '../types';

interface AppState {
  phase: AppPhase;
  prompt: string;
  currentJobId: string | null;
  originalResponse: string | null;
  steeredResponse: string | null;
  features: Feature[];
  edges: [string, string, number][];
  ablations: Map<string, number>;
  selectedFeatureId: string | null;
  error: string | null;
  generationTimeMs: number | null;

  setPrompt: (prompt: string) => void;
  setPhase: (phase: AppPhase) => void;
  setGenerateResult: (data: GenerateData) => void;
  setFeatures: (data: FeaturesData) => void;
  toggleAblation: (featureId: string, strength: number) => void;
  clearAblations: () => void;
  setAblateResult: (data: AblateData) => void;
  setSteerResult: (data: SteerData) => void;
  selectFeature: (featureId: string | null) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  phase: 'idle',
  prompt: '',
  currentJobId: null,
  originalResponse: null,
  steeredResponse: null,
  features: [],
  edges: [],
  ablations: new Map(),
  selectedFeatureId: null,
  error: null,
  generationTimeMs: null,

  setPrompt: (prompt) => set({ prompt }),
  
  setPhase: (phase) => set({ phase }),
  
  setGenerateResult: (data) => set({
    currentJobId: data.job_id,
    originalResponse: data.response,
    generationTimeMs: data.generation_time_ms,
    phase: 'ready',
  }),
  
  setFeatures: (data) => set({
    features: data.features,
    edges: data.co_activation_edges,
  }),
  
  toggleAblation: (featureId, strength) => set((state) => {
    const newAblations = new Map(state.ablations);
    if (strength === 0) {
      newAblations.delete(featureId);
    } else {
      newAblations.set(featureId, strength);
    }
    return { ablations: newAblations };
  }),
  
  clearAblations: () => set({ ablations: new Map() }),
  
  setAblateResult: (data) => set({
    originalResponse: data.original_response,
    steeredResponse: data.steered_response,
  }),
  
  setSteerResult: (data) => set({
    originalResponse: data.original_response,
    steeredResponse: data.steered_response,
  }),
  
  selectFeature: (selectedFeatureId) => set({ selectedFeatureId }),
  
  setError: (error) => set({ error, phase: 'error' }),
  
  reset: () => set({
    phase: 'idle',
    prompt: '',
    currentJobId: null,
    originalResponse: null,
    steeredResponse: null,
    features: [],
    edges: [],
    ablations: new Map(),
    selectedFeatureId: null,
    error: null,
    generationTimeMs: null,
  })
}));
