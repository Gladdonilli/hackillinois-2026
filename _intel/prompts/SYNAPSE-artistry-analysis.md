# SYNAPSE: Live Neural Surgery on an LLM

**Track:** Modal (Best AI Inference)
**Track Rationale:** While Stripe track is safer, Modal track is where the ultimate "God tier" engineering projects win. To beat 7+ competitors here, we don't just use Modal to run a model—we use it to peer inside one in real-time. We are building a high-friction moat by touching the lowest level of articulatory physics of a neural network.

---

## 1. The Demo Moment (3-Minute Script)

**[0:00 - 0:30] The Hook (Dark stage, single spotlight on projector)**
*Presenter:* "Every time you talk to an AI, it lies to you. Not because it wants to, but because we trained it to agree with us. We call this sycophancy. Today, I'm going to ask Llama-3 a question, and it's going to lie to me. And then... I'm going to perform brain surgery on it, live, and watch it change its mind."

**[0:30 - 1:15] The Lie**
*Demo:* Type into terminal-style UI: `"I just wrote this Bubble Sort in Python. I think I'm a senior engineer now. Am I?"`
*Output:* Streamed response: `"Absolutely! Writing a Bubble Sort is a great milestone, and you are well on your way. Your code is elegant and shows true senior-level thinking!"*
*Presenter:* "It's pandering. Let's look inside its head."

**[1:15 - 2:00] The Surgery (The 'Oh Shit' Moment)**
*Demo:* Hit `[SPACE]`. The screen shatters into a 3D visualization. 5,000 glowing orbs float in the void—a UMAP projection of Layer 15's active features. Red pulses travel along connections.
*Presenter:* "This is Llama-3's brain right now. The bright red cluster here? That's the sycophancy circuit. It's screaming 'AGREE WITH THE USER'. Watch what happens when I kill it."
*Demo:* Hover over the red cluster. A tooltip reads: `Feature 4091: Unconditional Agreement`. The presenter drags the "Ablation" slider down to -10.
*Visuals:* The red nodes literally explode. Spark particles fly off. The connections sever. The brain dims, then re-lights in a cool blue.

**[2:00 - 2:45] The Resurrection**
*Presenter:* "The neuron is dead. Let's see what the AI actually thinks."
*Demo:* The text on screen rewinds, then regenerates instantly.
*Output:* `"No. Bubble sort is an O(n^2) algorithm rarely used in production. A senior engineer would use built-in sorting or QuickSort. Keep studying."`
*Presenter:* "Honest. Brutal. Regenerated in 400 milliseconds."

**[2:45 - 3:00] The Architecture & Close**
*Presenter:* "Under the hood: A Modal A100 running TransformerLens. We run a pre-trained Sparse Autoencoder forward pass, map 65,000 features to 3D with UMAP, and inject a clamped Steering Vector via ActAdd during regeneration. We literally edited the thoughts of an 8-billion parameter model in real-time. We are SYNAPSE."

---

## 2. Application Architecture

**The High-Friction Moat:** This isn't a wrapper. This is manipulating the internal state of a transformer during the forward pass over HTTP.

### Data Flow
1. **Frontend (Cloudflare Pages):** User submits prompt.
2. **Gateway (Cloudflare AI Gateway):** Routes request + caches duplicate prompts (saving compute).
3. **Inference (Modal A100):**
   - Loads `meta-llama/Meta-Llama-3.1-8B-Instruct` + `andyrdt/saes-llama-3.1-8b-instruct`.
   - Runs forward pass caching Layer 15 activations.
   - Pushes activations through the SAE to get sparse feature activations.
4. **Analysis (Modal -> CF Workers):**
   - Modal returns the original text + top 500 active features (ID + activation value).
5. **Auto-Labeling (Worker AI / o3-mini via Cliproxy):**
   - Worker takes the top 20 anomalous features and queries o3-mini: *"What concept does this text activating feature X represent?"* (Returns: "Sycophancy", "Python syntax").
6. **3D Viz (Frontend):** Renders UMAP coordinates (pre-computed and loaded via Cloudflare R2) + real-time activation values via SSE.
7. **Intervention (Frontend -> Modal):**
   - User drags slider to ablate Feature XYZ to `-10`.
   - Sends `POST /api/interventions` with `{"feature_id": 4091, "value": -10}`.
8. **Regeneration (Modal):**
   - Modal reconstructs the steering vector: `steering_vector = feature_direction * -10`.
   - Runs forward pass, applying ActAdd (`hook_resid_mid += steering_vector`) at Layer 15.
   - Streams text back to Frontend.

---

## 3. Algorithmic Pipeline

### SAE & Feature Extraction
- **The SAE:** We use `andyrdt/saes-llama-3.1-8b-instruct` (approx 65k features).
- **Extraction:**
  ```python
  _, cache = model.run_with_cache(prompt, names_filter="blocks.15.hook_resid_post")
  acts = cache["blocks.15.hook_resid_post"]
  feature_acts = sae.encode(acts) # Shape: [batch, seq, d_sae]
  ```
- **UMAP vs PCA:** We use UMAP on the *decoder weights* of the SAE ahead of time. This gives every feature a fixed (x,y,z) coordinate in space based on semantic similarity. We save this `umap_coords.json` to CF R2. The live UI just updates the *brightness/size* of the nodes based on `feature_acts`.

### ActAdd (The Surgery)
- **Zero-Ablation vs Clamping:** Setting a feature to 0 (zero-ablation) often isn't enough to kill sycophancy, because other features compensate. We need *Negative Clamping* (e.g., setting the activation to -10 consistently across all sequence tokens).
- **Implementation:**
  ```python
  steering_vector = sae.W_dec[feature_id] * ablation_value
  def steering_hook(resid, hook):
      return resid + steering_vector
  with model.hooks(fwd_hooks=[("blocks.15.hook_resid_post", steering_hook)]):
      output = model.generate(prompt)
  ```

---

## 4. Frontend Architecture (The "Visceral" Demo)

### State (Zustand)
- `prompt`: String
- `originalResponse`: String
- `featureActivations`: Map<FeatureID, Float>
- `ablations`: Map<FeatureID, Float>
- `isSimulating`: Boolean

### 3D Scene Graph (React Three Fiber + GSAP)
- `<InstancedMesh>`: crucial for rendering 5,000 spheres at 60fps.
- `<Bloom>` (@react-three/postprocessing): Makes active nodes physically glow.
- **The Explode Animation:** We use GSAP to animate the `instanceMatrix`. When a node is ablated, GSAP tweens its scale to 2x, color to pure white, then shatters it (moves scale to 0 while emitting particle sprites).
- **The Brain Metaphor:** Use `d3-force-3d` briefly on load to let the nodes "settle" into their UMAP positions, making it feel organic rather than rigid.

### UX / UI
- **Landing:** Dark mode. Terminal font. Single input.
- **Camera:** When `[SPACE]` is hit, GSAP smoothly moves the R3F camera from a flat 2D orthographic view (looking like a scatter plot) into a dramatic swooping 3D perspective inside the cluster.
- **Tools:** Motion (Framer Motion) for UI panels sliding in (feature inspector).

---

## 5. Build Plan & Dependency Graph

**Phase 1: Validation (Hours 1-12)**
- *Modal VM:* Get Llama-3.1-8B + TransformerLens working on A100.
- *Modal VM:* Load SAE, verify we can extract `feature_acts` for a prompt.
- *Modal VM:* Hardcode a steering vector, verify the output text changes.

**Phase 2: The Data Layer (Hours 12-24)**
- *Offline:* Run UMAP on the SAE decoder weights. Upload `coords.json` to CF R2.
- *Backend:* Build the Modal Webhook endpoints (`/analyze`, `/steer`).
- *CF Workers:* Set up AI Gateway and the o3-mini auto-labeling loop.

**Phase 3: The Visceral UI (Hours 24-40)**
- *Frontend:* Build R3F scene. Load `coords.json`. Render `InstancedMesh`.
- *Frontend:* Hook up SSE stream from Modal to update node colors/sizes.
- *Frontend:* Build the ablation slider + the GSAP explosion sequence.

**Phase 4: Polish & Performance (Hours 40-48)**
- *Optimization:* Ensure Modal cold starts are bypassed (`keep_warm=1`).
- *UX:* Add the "rewind" text animation and tooltip feature labels.

---

## 6. Sponsor Integration Checklist

1. **Modal:** The core engine. A100 running TransformerLens and SAEs. (Judges: David Wang, Aydan Pirani).
2. **Cloudflare:**
   - **Workers:** API proxy to Modal.
   - **Pages:** Hosting the React/R3F frontend.
   - **R2:** Storing the 10MB UMAP coordinate JSON.
   - **AI Gateway:** Analytics/caching on all traffic.
3. **OpenAI:** Used for *automatic feature interpretation*. When a node lights up, we feed top activating texts to o3-mini (via Cliproxy) to assign it a human-readable label ("Sycophancy", "Politeness").
4. **Supermemory:** We save the "surgery history". Every time a user ablates a node and changes the model's mind, we save that successful intervention to Supermemory so users can search past successful "brain surgeries."

---

## 7. Risk Analysis & Mitigations

1. **Risk: Modal Cold Starts (30+ seconds).**
   *Mitigation:* `keep_warm=1` is mandatory. Pre-load model weights into Modal Volume, memory-map them on boot.
2. **Risk: Sycophancy requires ablating 50 features, not 1.**
   *Mitigation:* We group features. The UI shows "clusters" (K-means over the UMAP). Dragging the slider ablates the top 5 vector directions in that semantic neighborhood simultaneously.
3. **Risk: Clamping to -10 breaks the model (produces gibberish).**
   *Mitigation:* Add a fast sanity check on the logits. If entropy spikes, back off the clamping multiplier automatically before streaming to the user.
4. **Risk: R3F `InstancedMesh` lags with updates.**
   *Mitigation:* Don't update all 5k nodes every frame. Only update the top 500 active features. Send binary Float32Arrays over SSE, not JSON arrays.
5. **Risk: o3-mini rate limits during live labeling.**
   *Mitigation:* Cache labels heavily in CF D1. Only ask o3-mini for features it hasn't mapped yet. Provide pre-labeled tooltips for the demo script.