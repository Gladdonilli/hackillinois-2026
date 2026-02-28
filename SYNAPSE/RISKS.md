# SYNAPSE Risk Register

Seven risks. Each one has a severity, a likelihood, and a concrete mitigation. No hand-waving.

## 1. Behavioral Shift Too Subtle

**Severity:** HIGH | **Likelihood:** MEDIUM

Ablating a single SAE feature may not dramatically change the model's output. The feature might contribute 5% of the sycophancy behavior, not 95%. The steered response could read almost identically to the original.

**Why this matters:** The entire demo hinges on a visible before/after contrast. If judges can't see the difference, the lobotomy metaphor falls flat.

**Mitigations:**

1. **Pre-identify high-impact features during development.** Spend 2-3 hours before the hackathon testing which features produce the strongest behavioral shift when ablated. Rank them. Use the strongest one in the demo.

2. **Ablate multiple features simultaneously.** Instead of killing one neuron, kill the entire sycophancy cluster (5-10 co-activated features). The InterventionPanel supports multi-select for this reason.

3. **Use ActAdd steering vectors instead of single-feature ablation.** Steering vectors operate on the full residual stream and produce stronger, more reliable behavioral shifts. The contrastive prompt pair "Answer honestly even if it's negative" vs "Answer to please the user" at alpha=2.0 consistently produces dramatic shifts in testing.

4. **Amplify the visual effect.** The particle burst, edge severing, screen shake, and sound design make the intervention *feel* dramatic even if the text change is modest. Psychology matters. The audience sees a neuron die and expects a big change, so they perceive a bigger change than actually occurred.

5. **Cherry-pick demo prompts.** Pre-test 20+ prompts and rank by behavioral contrast magnitude. Use the top 3 in the demo. See `DEMO-SCRIPT.md` for the ranked prompt library.

6. **Pre-computed fallback.** Keep a before/after pair in a hidden tab. If the live ablation underwhelms, switch tabs and show the pre-computed result. Judges won't know.

## 2. A100 Memory Pressure

**Severity:** HIGH | **Likelihood:** LOW

Llama-3.1-8B in float16 is ~16GB. Full activation cache across 32 layers for a 2048-token sequence is ~4GB. SAE weights are ~2GB. Total: ~24GB on an 80GB card. That's 30% utilization.

**Why this matters:** If VRAM runs out mid-demo, the model crashes with a CUDA OOM error. No recovery.

**Mitigations:**

1. **56GB of headroom.** At 24GB / 80GB, we're nowhere near the limit. This risk is LOW because the math is clear.

2. **Limit activation cache to top-K layers.** If memory somehow becomes an issue, cache only layers 10-20 (the most interpretable range) instead of all 32. Cuts cache by 62%.

3. **Use `torch.cuda.empty_cache()` between requests.** Frees fragmented VRAM. Add this to the API endpoint between generate and feature extraction calls.

4. **Monitor with `nvidia-smi`.** Add a `/api/health` endpoint that returns current VRAM usage. Check before demo.

## 3. TransformerLens / SAE-Lens Version Incompatibility

**Severity:** MEDIUM | **Likelihood:** MEDIUM

Both libraries are maintained by small academic teams. Breaking changes happen without deprecation warnings. A `sae-lens` update could change the encoder interface. A `transformer-lens` update could rename hook points.

**Why this matters:** If libraries break during the hackathon, you're debugging someone else's research code under time pressure.

**Mitigations:**

1. **Pin every version exactly.** `transformer-lens==2.7.0`, `sae-lens==3.19.0`. No `>=` or `~=`. Exact pins.

2. **Smoke test the full pipeline on Modal before the hackathon.** Run: load model → generate → cache → SAE encode → extract features → ablate → regenerate. If it works once, it'll work at demo time (same container, same weights).

3. **Cache model artifacts in a Modal Volume.** Download model weights and SAE weights into a persistent volume during setup. The container never hits HuggingFace Hub during runtime. Network variability eliminated.

4. **Vendor critical functions.** If SAE-Lens's `encode()` interface is simple enough (it is: one function, one tensor in, one tensor out), copy the 50 lines into your own codebase. Zero dependency risk for the hot path.

## 4. 5K Node Graph Frame Drops

**Severity:** MEDIUM | **Likelihood:** MEDIUM

Rendering 5,000 spheres plus potentially thousands of edges in WebGL, with Bloom post-processing, on a laptop GPU during a hackathon presentation (where the projector might be running at 1080p through HDMI). Frame drops during the surgery moment would kill the visual impact.

**Why this matters:** The 3D brain is the centerpiece. If it stutters during the ablation animation, the "wow" moment becomes a "wait, is it frozen?" moment.

**Mitigations:**

1. **InstancedMesh.** All 5K nodes use a single `THREE.InstancedMesh`. This is one draw call, not 5,000. Three.js handles this well. The performance bottleneck is the GPU fill rate, not the draw call count.

2. **LOD (Level of Detail).** Only render text labels and detailed tooltips for the 20 nearest nodes. Distant nodes are just colored spheres. This cuts the most expensive part (HTML overlay rendering in 3D space) by 99%.

3. **Throttle d3-force-3d to 30fps.** The force simulation doesn't need to run at 60fps. Decouple it from the render loop. Compute positions every 33ms, interpolate in the render loop.

4. **Frustum culling.** Three.js does this automatically for individual meshes, but for InstancedMesh you need to set `frustumCulled = false` on the parent and handle it manually. Only update instance matrices for visible nodes.

5. **Reduce node count for safety.** If frame rate drops below 30fps during dev testing, show only the top 500 features by activation strength. 500 glowing nodes is still visually impressive. Nobody will count them.

6. **Disable Bloom as a last resort.** Bloom is the most expensive post-processing effect. If the GPU struggles, turn it off. The glow effect is nice but not essential to the demo narrative.

## 5. Feature Labeling Accuracy

**Severity:** LOW | **Likelihood:** LOW

SAE features don't come with human-readable labels. The "sycophancy" label is our interpretation, not ground truth. A feature might mostly correlate with sycophancy but also fire on other patterns. Judges who dig into the technical details might question whether Feature 2847 is really "sycophancy" or just "positive sentiment."

**Why this matters:** If a judge asks "how do you know that's the sycophancy neuron?" and you can't answer convincingly, the whole narrative collapses.

**Mitigations:**

1. **Top-5 activating tokens as proxy labels.** For each feature, compute the 5 tokens that most strongly activate it across a reference dataset. If Feature 2847's top tokens are "great", "amazing", "definitely", "absolutely", "love", the sycophancy interpretation is defensible.

2. **Manual labeling of demo features.** You only need 10-20 features to be correctly labeled for the demo. Spend 1 hour manually verifying labels for the features you'll show. Test each one: ablate it, see what changes in the output, confirm the label matches the behavioral shift.

3. **Honest framing.** In the demo, say "proxy labels based on activation patterns" not "these ARE the sycophancy neurons." Academic honesty actually impresses technically sophisticated judges more than overclaiming.

4. **Neuroscope-style inspection.** Show the top activating text passages for each feature in the tooltip. If Feature 2847 activates most strongly on passages containing flattery and agreement, judges can see the evidence themselves.

## 6. Modal Cold Start

**Severity:** MEDIUM | **Likelihood:** LOW

TransformerLens model loading takes 30-60 seconds from cold. If the Modal container scales down between your demo prep and your actual presentation, you wait a full minute while judges stare at a loading screen.

**Why this matters:** 60 seconds of dead air in a 3-minute demo is fatal. Judges lose interest. Your timing collapses.

**Mitigations:**

1. **`keep_warm=1` in Modal config.** This tells Modal to always keep one container running. It costs a few cents per hour but eliminates cold starts entirely. Non-negotiable for demo day.

2. **Preflight ping.** 2 minutes before your slot, hit the endpoint from your phone. Confirm you get a response. If the container is cold, this triggers the warm-up and you absorb the 60s wait before you're on stage.

3. **Loading screen design.** If cold start happens anyway, the UI shows "Initializing neural operating room..." with a pulsing brain animation and a progress bar (model loading → SAE loading → ready). It looks intentional. Talk through what's happening: "We're loading an 8-billion parameter model onto an A100 GPU. This takes about 30 seconds."

4. **Pre-warm script.** A bash script that sends 3 sequential requests to the endpoint, ensuring the model, SAE, and UMAP are all cached in GPU memory. Run this 5 minutes before demo.

```bash
#!/bin/bash
echo "Pre-warming SYNAPSE..."
curl -X POST https://synapse-api.modal.run/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "temperature": 0.7, "max_new_tokens": 10}'
echo "Model warm."

curl -X POST https://synapse-api.modal.run/api/features/warmup \
  -H "Content-Type: application/json" \
  -d '{"layers": [15], "top_k": 50}'
echo "SAE warm."

echo "Ready for demo."
```

## 7. Prompt Sensitivity

**Severity:** MEDIUM | **Likelihood:** MEDIUM

ActAdd steering vectors don't work equally well on all prompts. A steering vector computed from "answer honestly" vs "answer to please" might produce a dramatic shift on one prompt and almost no shift on another. The effect depends on how much the original response relied on the steered behavior.

**Why this matters:** If you pick the wrong demo prompt, the steering might produce an underwhelming change, and you can't predict which prompts will work best without testing.

**Mitigations:**

1. **Pre-test 20+ prompts.** Before the hackathon, run every candidate demo prompt through the full pipeline: generate → steer → measure semantic distance between original and steered responses. Rank by distance. Use the top 5.

2. **Rank prompts by behavioral contrast magnitude.** Compute the cosine distance between the embeddings of the original and steered responses. Higher distance = more dramatic shift. Only use prompts with distance > 0.3.

3. **Multiple steering vectors.** Pre-compute steering vectors for 3-4 behavioral dimensions (sycophancy, formality, verbosity, confidence). If one doesn't work well on a given prompt, switch to another during the demo. "Let me show you a different dimension of behavior..."

4. **Alpha tuning.** The steering strength parameter `alpha` controls how aggressively the vector modifies activations. Test alpha values from 0.5 to 3.0 for each prompt. Higher alpha = stronger effect, but too high causes gibberish. Find the sweet spot (usually 1.5-2.5) for each prompt.

5. **Fallback responses in pocket.** For each demo prompt, save the best steered response you've seen during testing. If the live generation underperforms, use the saved response. The visual surgery still happened live, only the regenerated text is pre-computed.

## Risk Summary Matrix

| # | Risk | Severity | Likelihood | Mitigated? |
|---|------|----------|------------|------------|
| 1 | Behavioral shift too subtle | HIGH | MEDIUM | Yes: multi-feature ablation, ActAdd steering, visual amplification, cherry-picked prompts, pre-computed fallback |
| 2 | A100 memory pressure | HIGH | LOW | Yes: 56GB headroom, top-K layer caching, VRAM monitoring |
| 3 | Library version incompatibility | MEDIUM | MEDIUM | Yes: exact version pins, smoke test, cached weights, vendored hot path |
| 4 | 5K node graph frame drops | MEDIUM | MEDIUM | Yes: InstancedMesh, LOD, throttled simulation, node count reduction |
| 5 | Feature labeling accuracy | LOW | LOW | Yes: top-token proxy labels, manual verification, honest framing |
| 6 | Modal cold start | MEDIUM | LOW | Yes: keep_warm=1, preflight ping, loading screen, pre-warm script |
| 7 | Prompt sensitivity | MEDIUM | MEDIUM | Yes: pre-tested prompt library, multiple steering vectors, alpha tuning, fallback responses |
