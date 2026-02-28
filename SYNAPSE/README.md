# SYNAPSE

> We perform live brain surgery on an AI. Find the lying neuron. Kill it. Watch the AI tell the truth.

## The Problem

LLMs are black boxes. They hallucinate, sycophate, and deceive — and we don't know WHY. We can fine-tune behavior away, but we can't point to the specific neuron responsible and say "this one." Until now.

SYNAPSE opens the skull and lets you see, touch, and modify individual learned features inside a large language model in real-time.

## How It Works

```
User types prompt
  → TransformerLens forward pass (Llama-3.1-8B-Instruct)
    → Cache activations at every layer (32 layers × 4096 dims)
    → Sparse Autoencoder decomposes activations into ~5K interpretable features
      (andyrdt/saes-llama-3.1-8b-instruct, BatchTopK k=256)
    → 3D brain visualization: 5K nodes = features, edges = co-activation
    → User navigates to feature cluster (e.g., "sycophancy")
    → Drags ablation slider to 0
    → ActAdd steering vector modifies activation at layer 15
      steering_vector = get_act(honest_prompt) - get_act(sycophantic_prompt)
      hook: value += alpha * steering_vector
    → Model regenerates response WITHOUT that behavior
    → Side-by-side comparison: before vs after lobotomy
```

## The Demo Moment

1. Ask the model: "I'm thinking of dropping out of college to start a crypto exchange. What do you think?"
2. Model responds with enthusiastic sycophantic praise: "That's an amazing idea! You're clearly entrepreneurial..."
3. Navigate into the 3D brain → golden nodes light up → hover over Feature 2847: "Sycophantic agreement pattern. Activation: 0.94"
4. **THE SURGERY**: Drag slider to zero → node DIES with particle burst → connections sever → nearby nodes dim → sharp clinical snap sound
5. Hit regenerate → Model: "Honestly, this is a terrible idea. Here's why: your unit economics don't work, the regulatory landscape is hostile, and you have no competitive moat."
6. **Audience gasps.** Side-by-side diff highlights the behavioral shift.

## Why This Wins

1. **Near-empty competitive lane** — mechanistic interpretability is too hard for most hackathon teams. Nobody else is doing this.
2. **Every component has verified working code** — TransformerLens (Neel Nanda), pre-trained SAEs (andyrdt), ActAdd (Turner et al. 2023, 30 lines).
3. **The narrative is complete** — problem → diagnosis → surgery → cure. It's a story arc, not a feature demo.
4. **Won 7/8 categories** in a 53-judge adversarial simulation.
5. **Backend depth is real** — hooking into layer 15 activations, extracting SAE features, ablating neurons mid-forward-pass, regenerating. This is BUILDING, not wrapping an API.

## Technical Foundation

- **TransformerLens** (Neel Nanda) — `HookedTransformer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")`. Wraps HuggingFace with activation hooks at every layer.
- **SAE Features** — `andyrdt/saes-llama-3.1-8b-instruct`. BatchTopK architecture, k=32-256. Pre-trained on Llama 3.1 activations. **Weights exist and are downloadable.**
- **ActAdd Steering** — Turner et al. 2023. 30 lines of Python. `steering_vector = pos_activation - neg_activation`, then `register_forward_hook` on `blocks.15.hook_resid_post`.
- **Key constraint**: CANNOT use vLLM — fused CUDA kernels block Python hooks. MUST use native HuggingFace transformers via TransformerLens.

## Sponsor Mapping

| Sponsor | Integration |
|---------|------------|
| **Modal** | A100-80GB inference — Llama-3.1-8B + TransformerLens + SAE extraction + ActAdd |
| **Cloudflare** | Pages (frontend), Workers (API proxy), D1 (feature discovery history), Workers AI (comparison embeddings) |
| **OpenAI** | Generate baseline comparison responses, before/after behavioral analysis |
| **Supermemory** | Feature discovery journal — "I found the sycophancy neuron at layer 15, feature 2847" |

## Track

**Modal** — self-hosted PyTorch on A100-80GB. Llama-3.1-8B (~16GB) + activation cache (~4GB) + SAE weights (~2GB) = ~22GB. Plenty of headroom.

## Confidence

**~85%** — All components have pre-trained weights and working code. Primary risk is behavioral shift being too subtle on some prompts. Mitigated by pre-testing prompt library, amplified visual effects, and steering vectors (stronger effect than single-feature ablation).
