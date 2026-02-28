# SYNAPSE — Project Knowledge

## OVERVIEW

"Live brain surgery on an AI" — mechanistic interpretability tool that lets you ablate/amplify individual SAE features in a running LLM and see behavior change in real-time. 3D neuron graph visualization with 5K nodes. The "wow moment" = amplify sycophancy feature to 10x, watch model grovel in real-time while the corresponding neuron cluster glows red.

## DATA FLOW

```
PromptConsole → POST /api/generate (TransformerLens on Modal A100)
  → cache residual stream → POST /api/features (SAE-Lens encoder)
  → Zustand store → NeuronGraph (R3F InstancedMesh, 5K nodes, UMAP coords)
                   → ActivationEdges (LineSegments)
  → InterventionPanel → POST /api/ablate or /api/steer (ActAdd forward hooks)
  → regenerate → ResponseComparator (side-by-side diff)
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| System architecture + API shapes | ARCHITECTURE.md | 511 lines, source of truth |
| Pinned dependency versions | STACK.md | TransformerLens 2.8.1, SAE-Lens 4.1.1 |
| What needs building | TODO-FRONTEND.md | Desktop-only 1280px, shadcn/ui, all components |
| Demo choreography | DEMO-SCRIPT.md | "Problem→Diagnosis→Surgery→Cure" arc |
| Risk mitigations | RISKS.md | VRAM pressure, versioning, cold starts |
| Scientific basis | README.md | Mechanistic interpretability, sponsor mapping |

## CONVENTIONS (SYNAPSE-SPECIFIC)

- **Model**: Gemma-2-2B (fits A100 80GB with SAE overhead). SAEs from `andyrdt/saes-llama-3.1-8b-instruct` or Google DeepMind Gemma Scope
- **ActAdd steering** (30 lines): `get_activation(pos) - get_activation(neg) = steering_vector`, `register_forward_hook` on layer 15. Coefficient tuning critical — too high = gibberish, too low = invisible
- **Feature AMPLIFICATION > ablation**: Clamping activation to 10x is far more dramatic than setting to 0. Reframe from "kill neuron" to "overclock neuron"
- **Feature labels**: Use "proxy labels" — NEVER overclaim interpretability. Neuronpedia S3 bulk export for offline labels
- **3D graph**: InstancedMesh for nodes (5K max), LineSegments for edges. Pre-computed UMAP coordinates. `d3-force-3d` for layout
- **Node colors**: resting=#1A1025 ×0.8 emissive, firing=#00FFFF ×2.5 (triggers Bloom), ablated=#111111, targeted=#FF0044 ×3.0
- **PostProcessing**: Bloom luminanceThreshold=1.0 intensity=1.5 mipmapBlur=true, toneMapping=ACESFilmic exposure=1.2
- **Typography**: Geist + Geist Mono (self-host WOFF2, font-display:swap for unreliable hackathon WiFi)

## ANTI-PATTERNS (SYNAPSE-SPECIFIC)

- **NEVER** use vLLM — fused CUDA kernels block `register_forward_hook()` needed for ActAdd steering
- **NEVER** upgrade TransformerLens past 2.8.1 — sae-lens 4.1.1 compatibility breaks
- **NEVER** overclaim feature labels — sycophancy is DISTRIBUTED across features, no single clean toggle
- **NEVER** waste time on responsive mobile — desktop-only, min-width 1280px
- **NEVER** forget `torch.cuda.empty_cache()` between inference runs — VRAM pressure is real

## CRITICAL PATH

1. Validate: find sycophancy SAE feature index in andyrdt's pre-trained weights (Modal A100, ~1h)
2. Modal endpoint: prompt → TransformerLens → residual stream → SAE features → JSON
3. ActAdd steering: forward hook on layer 15 with coefficient sweep
4. R3F: InstancedMesh node graph + Bloom + interaction (click to ablate)
5. ResponseComparator: side-by-side original vs steered output

## STATUS

Spec-complete. Zero frontend code. Backend is well-defined (ActAdd = 30 lines Python). Cleaner build path than LARYNX — pre-trained SAE weights exist, no asset pipeline risk. Main risk = finding a dramatically interpretable feature within hackathon time.
