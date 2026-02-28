import React, { useState } from 'react';
import { useSynapseStore } from '../store';
import { Feature } from '../types';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '../lib/utils';
import { Loader2, Trash2, Zap } from 'lucide-react';
import { ablateFeatures } from '../api/client';

export function InterventionPanel() {
  const store = useSynapseStore();
  const { features, ablations, setAblation, clearAblations, isAmplifyMode, toggleAmplifyMode, selectedFeatureId, setSelectedFeatureId } = store;
  const isBusy = store.phase === 'ablating' || store.phase === 'generating' || store.phase === 'extracting';
  
  const handleAblate = async () => {
    if (Object.keys(ablations).length === 0 || isBusy) return;

    store.setPhase('ablating');
    store.setError(null);

    const startTime = performance.now();

    try {
      const resp = await ablateFeatures({
        job_id: store.jobId || '',
        ablations: ablations
      });

      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Ablation failed');
      }

      store.setSteeredResponse(resp.data.steered_text);
      store.setPhase('idle');
      
      const endTime = performance.now();
      store.setGenerationTime((endTime - startTime) / 1000); // reuse for ablation time

    } catch (err: any) {
      store.setError(err.message || 'An unknown error occurred during ablation');
      store.setPhase('error');
    }
  };

  const getSliderColor = (val: number) => {
      // interpolate from dim to warn
      const pct = val;
      if (pct === 0) return '#333333';
      if (pct < 0.5) return '#992244';
      return '#FF3366'; // warning red
  };

  if (features.length === 0) {
    return (
      <div className="flex flex-col space-y-4 p-4 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg mt-4 h-[400px] w-full max-w-[300px] justify-center items-center">
        <span className="text-sm font-sans text-[#666666] italic text-center px-4">
          Generate a response to see active features
        </span>
      </div>
    );
  }

  // take top 20
  const topFeatures = [...features].sort((a, b) => b.activation_strength - a.activation_strength).slice(0, 20);

  return (
    <div className="flex flex-col space-y-4 p-4 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg mt-4 max-h-[600px] w-full max-w-[300px]">
      
      <div className="flex justify-between items-center pb-2 border-b border-[#1F1F1F]">
        <span className="text-xs font-mono text-[#666666] uppercase tracking-wider">Features</span>
        
        <div className="flex items-center space-x-2">
           <button 
              onClick={toggleAmplifyMode}
              className={cn("text-[10px] uppercase font-mono px-2 py-1 rounded transition-colors flex items-center gap-1", isAmplifyMode ? "bg-[#00FFFF]/20 text-[#00FFFF]" : "bg-[#1F1F1F] text-[#666666] hover:bg-[#333333]")}
              disabled={isBusy}
           >
              <Zap className="w-3 h-3" />
              {isAmplifyMode ? 'Amplify' : 'Ablate'}
           </button>
           <button 
              onClick={clearAblations}
              className="text-[#666666] hover:text-[#FF3366] transition-colors p-1"
              title="Clear all"
              disabled={isBusy}
           >
              <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#333333] scrollbar-track-transparent">
        {topFeatures.map((f: Feature) => {
            const val = ablations[f.id] || 0.0;
            const isSelected = selectedFeatureId === f.id;
            
            return (
              <div 
                key={f.id} 
                className={cn("flex flex-col space-y-2 p-2 rounded transition-colors cursor-pointer group", isSelected ? "bg-[#1F1F1F]/50 ring-1 ring-[#00FFFF]/30" : "hover:bg-[#1A1A1A]")}
                onClick={() => setSelectedFeatureId(f.id)}
              >
                  <div className="flex justify-between items-center text-xs">
                     <span className={cn("font-sans truncate pr-2 flex-1", isSelected ? "text-[#EDEDED]" : "text-[#A0A0A0] group-hover:text-[#EDEDED]")}>
                         {f.label || `Feature ${f.id}`}
                     </span>
                     <span className="text-[10px] font-mono bg-[#111111] px-1 rounded text-[#00FFFF] border border-[#00FFFF]/20">L{f.layer}</span>
                  </div>
                  
                  {/* Activation Bar */}
                  <div className="w-full h-1 bg-black rounded-full overflow-hidden">
                      <div className="h-full bg-[#00FFFF]/50" style={{ width: `${Math.min(f.activation_strength * 10, 100)}%` }} />
                  </div>

                  {/* Slider */}
                  <div className="flex items-center space-x-2 pt-1">
                      <Slider 
                         value={[val]}
                         min={0.0}
                         max={1.0}
                         step={0.05}
                         onValueChange={([v]) => setAblation(f.id, v)}
                         disabled={isBusy}
                         className={cn(
                             "[&_[role=slider]]:border-none [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 transition-colors", 
                             isBusy && "opacity-50"
                         )}
                         style={{ 
                             '--slider-thumb-bg': isAmplifyMode ? '#00FFFF' : getSliderColor(val),
                             '--slider-track-active': isAmplifyMode ? '#00FFFF40' : getSliderColor(val) + '40'
                         } as React.CSSProperties}
                      />
                      <span className="text-[10px] font-mono text-[#666666] w-6">{val.toFixed(2)}</span>
                  </div>
              </div>
            );
        })}
      </div>

      <Button 
        onClick={handleAblate} 
        disabled={isBusy || Object.keys(ablations).length === 0}
        className={cn("w-full text-black hover:opacity-90 font-sans font-medium mt-2 transition-colors", isAmplifyMode ? "bg-[#00FFFF]" : "bg-[#FF3366]")}
      >
        {isBusy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" />
            Applying...
          </>
        ) : (
          isAmplifyMode ? 'Amplify Selected' : 'Ablate Selected'
        )}
      </Button>

    </div>
  );
}