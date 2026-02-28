import React from 'react';
import { Html } from '@react-three/drei';
import type { Feature } from '../types';

interface FeatureTooltipProps {
  feature: Feature | null;
}

export function FeatureTooltip({ feature }: FeatureTooltipProps) {
  if (!feature) return null;
  
  return (
    <Html position={feature.umap_xyz} className="pointer-events-none" zIndexRange={[100, 0]}>
      <div className="bg-surface/90 backdrop-blur border border-border rounded px-3 py-2 text-[#EDEDED] min-w-[150px] shadow-xl">
        <div className="font-semibold text-[#00FFFF] mb-1">{feature.label}</div>
        <div className="text-xs text-[#666666] mb-2 flex justify-between gap-4">
          <span>Layer: {feature.layer}</span>
          <span>Str: {feature.activation_strength.toFixed(2)}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {feature.top_tokens.map((token, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-[#1A1025] border border-border rounded text-[10px] text-[#EDEDED]">
              {token}
            </span>
          ))}
        </div>
      </div>
    </Html>
  );
}
