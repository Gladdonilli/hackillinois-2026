import { create } from 'zustand';
import type {
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
  ablations: Record<string, number>;
  selectedFeatureId: string | null;
  error: string | null;
  generationTime: number | undefined;
  isAmplifyMode: boolean;

  setPrompt: (prompt: string) => void;
  setPhase: (phase: AppPhase) => void;
  setGenerateResult: (data: GenerateData) => void;
  setFeatures: (data: FeaturesData) => void;
  setOriginalResponse: (text: string) => void;
  setSteeredResponse: (text: string) => void;
  setAblation: (featureId: string, strength: number) => void;
  clearAblations: () => void;
  setAblateResult: (data: AblateData) => void;
  setSteerResult: (data: SteerData) => void;
  selectFeature: (featureId: string | null) => void;
  setSelectedFeatureId: (featureId: string | null) => void;
  setError: (error: string | null) => void;
  setGenerationTime: (time: number | undefined) => void;
  toggleAmplifyMode: () => void;
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
  ablations: {},
  selectedFeatureId: null,
  error: null,
  generationTime: undefined,
  isAmplifyMode: false,

  setPrompt: (prompt) => set({ prompt }),
  
  setPhase: (phase) => set({ phase }),
  
  setGenerateResult: (data) => set({
    currentJobId: data.job_id,
    originalResponse: data.response,
    generationTime: data.generation_time_ms / 1000,
    phase: 'ready',
  }),
  
  setFeatures: (data) => set({
    features: data.features,
    edges: data.co_activation_edges,
  }),

  setOriginalResponse: (text) => set({ originalResponse: text }),
  setSteeredResponse: (text) => set({ steeredResponse: text }),
  
  setAblation: (featureId, strength) => set((state) => {
    const newAblations = { ...state.ablations };
    if (strength === 0) {
      delete newAblations[featureId];
    } else {
      newAblations[featureId] = strength;
    }
    return { ablations: newAblations };
  }),
  
  clearAblations: () => set({ ablations: {} }),
  
  setAblateResult: (data) => set({
    originalResponse: data.original_response,
    steeredResponse: data.steered_response,
  }),
  
  setSteerResult: (data) => set({
    originalResponse: data.original_response,
    steeredResponse: data.steered_response,
  }),
  
  selectFeature: (selectedFeatureId) => set({ selectedFeatureId }),
  setSelectedFeatureId: (selectedFeatureId) => set({ selectedFeatureId }),
  
  setError: (error) => set(error ? { error, phase: 'error' as const } : { error: null }),
  
  setGenerationTime: (generationTime) => set({ generationTime }),

  toggleAmplifyMode: () => set((state) => ({ isAmplifyMode: !state.isAmplifyMode })),
  
  reset: () => set({
    phase: 'idle',
    prompt: '',
    currentJobId: null,
    originalResponse: null,
    steeredResponse: null,
    features: [],
    edges: [],
    ablations: {},
    selectedFeatureId: null,
    error: null,
    generationTime: undefined,
    isAmplifyMode: false,
  })
}));

// Alias for components that import as useSynapseStore
export const useSynapseStore = useStore;
