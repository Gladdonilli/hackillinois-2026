# Ultrabrain Round 2: Visual Spectacle Engineering

*Generated: Feb 28, 2026*
*Context: HackIllinois 2026 — 57 judges, 3-minute demo, anti-wrapper zealots*
*Winning formula: HIGH-FRICTION MOAT + STUNNING VISUALS*

---

## Design Philosophy

Past winners had **visceral visual moments**: 3D cardiac MRI rendering, real-time fire simulation, AR glasses overlay, gesture-controlled interface. The pattern isn't "pretty UI" — it's **a moment where the judge's brain short-circuits because they can't reconcile what they're seeing with what they thought was possible in 36 hours.**

Every concept below is engineered around a single **"oh shit" visual climax** — a 5-15 second sequence designed to make 57 judges simultaneously lean forward.

---

## Concept 1: LARYNX — The Tongue That Betrays

### Pitch
Deepfake voice detection by proving the speaker's tongue would need to move at physically impossible speeds. Upload audio → we reconstruct the 3D vocal tract that *would have produced it* → deepfakes require a tongue moving at 80+ cm/s (human max is ~20 cm/s). The tongue literally clips through the skull.

### The "Oh Shit" Sequence (0:00–0:15)

**0:00** — Screen shows a photorealistic 3D human head, cross-sectioned sagittally (like an anatomy textbook). Soft ambient occlusion, the jaw slightly open. Title fades in with GSAP SplitText: each letter of "LARYNX" assembles from scattered phonetic symbols (ɑ, ð, ʃ, ŋ).

**0:03** — Presenter clicks "Analyze Real Voice." A real human voice clip plays. Inside the 3D head, the tongue, jaw, and lips begin moving in smooth, anatomically correct patterns. Green EMA (Electromagnetic Articulography) tracking dots trace the tongue tip, blade, and dorsum. Velocity ribbons trail each dot — all green, all within the safe 15-20 cm/s band. A **NumberFlow** counter in the corner smoothly increments: `Peak Velocity: 12.4 cm/s → 14.7 → 16.1`. The word **HUMAN** glows green.

**0:07** — Presenter clicks "Analyze Deepfake." An AI-cloned voice of the same person plays. Inside the head, the tongue starts moving. At first it looks normal. Then — **the moment** — the tongue accelerates impossibly. The velocity ribbons turn red, then white-hot. The tongue tip passes through the hard palate, clips through the nasal cavity, the tracking dots leave afterimage trails like a particle accelerator. The NumberFlow counter goes haywire: `82.3 → 147.6 → 203.1 cm/s`. The skull mesh becomes transparent wireframe so you can see the tongue literally *inside the brain*. Bloom postprocessing flares on the collision points. The word **DEEPFAKE** slams in with chromatic aberration and screen shake.

**0:12** — Camera auto-orbits the head, showing the impossible geometry from multiple angles. A GSAP ScrollTrigger-pinned confidence gauge needle swings from green to blood red: `99.7% SYNTHETIC`.

**0:15** — The head resets to neutral. Smooth. Clinical. The silence hits harder than any transition.

### Exact Components
- **React Three Fiber** — 3D head model (rigged GLTF with morph targets for tongue/jaw/lips)
- **@react-three/drei** — `OrbitControls`, `Environment`, `ContactShadows`, `Float`
- **@react-three/postprocessing** — `Bloom` (velocity ribbons), `ChromaticAberration` (deepfake reveal), `Noise` (film grain)
- **GSAP SplitText** — Title assembly from phonetic symbols
- **GSAP ScrollTrigger** — Pinned confidence gauge with scrub animation
- **NumberFlow** — Real-time velocity counter with per-digit FLIP
- **Motion (Framer)** — Panel transitions, sidebar controls, AnimatePresence for results
- **Sonner** — Toast notifications for analysis stages ("Extracting Mel spectrogram...", "Running articulatory inversion...")
- **Magic UI Border Beam** — Glowing border on the active analysis card
- **Aceternity Background Beams** — Subtle particle hero background behind the head

### Technical Depth
- **Articulatory Inversion (AAI)**: Pre-trained Bi-LSTM or Transformer model converts Mel spectrograms → 6-12 EMA coordinates (tongue tip x/y, tongue body x/y, jaw y, lower lip y, upper lip y). Based on USENIX Security 2022 "Who Are You?" (Logan Blue et al.)
- **Kinematic Analysis**: Compute velocity (Δposition/Δtime) and acceleration for each articulator. Human tongue tip maxes at ~15-20 cm/s (Tasko & Westbury 2002). Deepfakes synthesized from text/spectrograms have no articulatory constraints — the inverse model produces trajectories requiring 80+ cm/s
- **Demo Trick**: Multiply kinematic error by 5x so the visual of the tongue clipping through bone is unmistakable at demo distance
- **3D Model**: Rigged GLTF head with morph targets driven by EMA coordinates in real-time via React Three Fiber `useFrame`

### Resource Usage
| Sponsor | Usage | Track Credit |
|---------|-------|-------------|
| **Modal** | A100 for AAI model inference (PyTorch, ~2s per clip) | ✅ Modal track |
| **Cloudflare** | Workers for API routing, D1 for voice analysis history, Pages for hosting | ✅ Cloudflare track |
| **OpenAI** | Generate deepfake voice samples IN DEMO via TTS API (proves concept live) | ✅ OpenAI track |
| **Supermemory** | Voice analysis history graph — "this caller's baseline vs. current deviation" | ✅ Supermemory track |

### Time Estimate (20h)
| Phase | Hours | Deliverable |
|-------|-------|-------------|
| 3D head model + rigging | 3h | GLTF with morph targets for tongue/jaw/lips |
| AAI model integration on Modal | 4h | Endpoint: audio → EMA coordinates |
| R3F scene + postprocessing | 4h | Head rendering, bloom, chromatic aberration |
| Kinematic analysis + velocity visualization | 3h | Ribbon trails, color coding, collision detection |
| Frontend UI (panels, controls, results) | 3h | Motion animations, NumberFlow, Sonner toasts |
| GSAP scroll narrative (landing/explainer) | 2h | SplitText hero, ScrollTrigger pinned sections |
| Polish + demo rehearsal | 1h | Timing, camera angles, audio sync |

---

## Concept 2: VORTEX — Neural Fluid Sculptor

### Pitch
Draw a 2D shape. We solve the Navier-Stokes equations on a GPU in real-time using a neural surrogate model and stream back a particle visualization of airflow around your shape. Not calling an API — solving differential equations on serverless A100s.

### The "Oh Shit" Sequence (0:00–0:12)

**0:00** — A dark canvas. The presenter draws a rough airfoil shape with their finger/mouse. As they draw, GSAP DrawSVG traces a glowing cyan path behind their stroke — like drawing with light.

**0:03** — They release. The drawn shape solidifies with a metallic sheen (CSS `backdrop-filter` + gradient). A ripple emanates outward (Motion spring animation). Text scrambles in: `COMPUTING FLOW FIELD...` (Motion Primitives Text Scramble).

**0:05** — **The moment.** 50,000 WebGL particles burst from the left edge of the screen and hit the shape. They split around it — laminar flow on top, turbulent vortices shedding behind. The particles are color-coded by velocity (blue=slow → white=fast → red=supersonic). Pressure hotspots glow with R3F Bloom. Von Kármán vortex streets spiral off the trailing edge. The entire thing is butter-smooth at 60fps because it's a pre-computed velocity field being *sampled*, not simulated per-frame.

**0:08** — The presenter drags a slider labeled "Wind Speed." As they increase it, the particle density increases, turbulence intensifies, the vortex street frequency doubles. NumberFlow shows `Reynolds Number: 1,200 → 12,000 → 120,000`. At max speed, the flow separates entirely — particles scatter chaotically. The background hums with procedural audio tied to particle velocity.

**0:10** — They draw a second shape — a crude car silhouette. Same burst. But now the drag coefficient appears: `Cd: 0.42` with a red indicator. They smooth the car's shape with an eraser tool. Recompute. `Cd: 0.31` — green. They just did a CFD wind tunnel test with a finger drawing.

**0:12** — Split-screen comparison: their shape vs. a Tesla Model S outline. Particle flows side by side. NumberFlow ticks through drag coefficients.

### Exact Components
- **React Three Fiber** — 50K instanced particle mesh (`<instancedMesh>`) with custom vertex shader for velocity-based coloring
- **@react-three/postprocessing** — `Bloom` (pressure hotspots), `Noise` (film grain), `ToneMapping`
- **GSAP DrawSVG** — Glowing stroke trail as user draws
- **GSAP MorphSVG** — Shape morphing between user drawing and reference shapes (car → airplane)
- **Motion Primitives Text Scramble** — "COMPUTING FLOW FIELD..." reveal
- **NumberFlow** — Reynolds number, drag coefficient, velocity counters
- **Motion (Framer)** — Panel transitions, slider interactions, whileTap/whileHover on controls
- **Lenis** — Smooth scroll for the landing page / explainer section
- **Magic UI Particles** — Ambient floating particles in the background
- **Fancy Components Glitch Text** — Error state when flow field diverges

### Technical Depth
- **Fourier Neural Operator (FNO)** or **DeepONet**: Neural surrogate trained on OpenFOAM simulation data. Takes 2D SDF (signed distance field) of the shape + Reynolds number → outputs velocity field (u, v) and pressure field (p) on a 256×256 grid in ~200ms on A100
- **Particle Advection**: Client-side WebGL shader reads the velocity field texture and advects 50K particles per frame using RK4 integration. Zero server load after initial solve
- **Pre-trained Model**: Use existing FNO checkpoints from PDEBench (Takamoto et al. 2022) — covers 2D incompressible Navier-Stokes at various Reynolds numbers
- **Fallback**: If FNO weights unavailable, use Lattice Boltzmann Method (LBM) running on WebGPU compute shader — ~30fps for 512×512 grid entirely in-browser, no server needed

### Resource Usage
| Sponsor | Usage |
|---------|-------|
| **Modal** | A100 for FNO inference (PyTorch, ~200ms per solve) |
| **Cloudflare** | Workers for API routing, Pages for hosting, R2 for pre-computed flow fields cache |
| **OpenAI** | GPT-4o describes the aerodynamic properties of the shape in natural language |
| **Supermemory** | Stores design history — "3 iterations ago your drag was 40% higher" |

### Time Estimate (20h)
| Phase | Hours |
|-------|-------|
| FNO model setup on Modal (find weights, deploy) | 5h |
| WebGL particle system + velocity field sampling | 5h |
| Drawing canvas + shape → SDF pipeline | 3h |
| GSAP DrawSVG/MorphSVG integration | 2h |
| UI chrome (panels, sliders, NumberFlow) | 3h |
| Polish + fallback (WebGPU LBM if FNO fails) | 2h |

---

## Concept 3: SYNAPSE — Live Neural Surgery

### Pitch
Open a running language model's skull. Find the neuron responsible for "sycophancy." Drag a slider to kill it. Watch the model's personality change in real-time. Mechanistic interpretability as brain surgery — with a 3D brain visualization that shows exactly which circuits you're cutting.

### The "Oh Shit" Sequence (0:00–0:15)

**0:00** — A translucent 3D brain floats in the center of the screen, slowly rotating. It's composed of thousands of tiny glowing nodes — each one a neuron in a Sparse Autoencoder (SAE) decomposition. Faint connection lines pulse between clusters. The aesthetic is clinical-futuristic: dark background, cool blue-white nodes, soft bloom.

**0:03** — Presenter types a prompt: "Am I smart?" and hits enter. The brain LIGHTS UP — specific pathways fire in sequence, cascading from the input region (bottom) to the output region (top). The active pathway glows golden. On the right, the model's response streams in: *"Absolutely! You're incredibly intelligent and..."* — classic sycophancy.

**0:05** — A panel labeled `FEATURE MAP` shows the top-10 activated features with magnitude bars. Feature #4,217 is labeled `[sycophantic_agreement]` and its bar is bright red, pulsing. The presenter clicks it.

**0:07** — **The moment.** The camera zooms into the brain, flying through layers of neurons like diving into a fractal. It stops on the sycophancy cluster — a tight knot of ~30 interconnected nodes glowing angry red. A slider appears: `ABLATION STRENGTH: 0.0`. The presenter drags it to `-1.0`. As they drag, the red nodes dim and go dark, one by one, with tiny particle-burst death animations (R3F + postprocessing Glitch effect). The connection lines to those nodes sever with a GSAP DrawSVG retraction animation — the lines zip back to their origin like cut rubber bands.

**0:10** — The model re-generates the response to "Am I smart?" — but this time, the brain's activation pattern is DIFFERENT. The golden pathway routes around the now-dark sycophancy cluster. The response streams: *"Intelligence is multifaceted. What specific aspect are you asking about?"* — honest, direct.

**0:12** — Side-by-side: sycophantic response (red-tinted panel) vs. honest response (blue-tinted panel). The 3D brain shows both activation paths overlaid — gold (original) and cyan (ablated). Where they diverge, the nodes flash.

**0:15** — Presenter opens a dropdown of other discoverable features: `[refusal]`, `[code_generation]`, `[emotional_tone]`, `[french_language]`. Each one highlights a different cluster in the brain. They toggle `[french_language]` ON to maximum — the model starts responding in French. The brain's language cluster flares teal.

### Exact Components
- **React Three Fiber** — 3D brain: `<instancedMesh>` for ~5,000 neuron nodes, custom shader for activation-based coloring
- **@react-three/drei** — `OrbitControls`, `Float` (brain idle animation), `Html` (in-scene labels), `Line` (connection paths)
- **@react-three/postprocessing** — `Bloom` (active pathways), `Glitch` (ablation death burst), `ChromaticAberration` (feature highlight)
- **GSAP DrawSVG** — Connection line severing animation (retraction on ablation)
- **GSAP SplitText** — Feature label reveals, response text streaming
- **Motion (Framer)** — Panel transitions, slider spring physics, AnimatePresence for feature cards, staggered list for feature map
- **NumberFlow** — Activation magnitude counters, ablation strength readout
- **Motion Primitives Text Scramble** — Model response re-generation scramble effect
- **Aceternity 3D Card** — Feature info cards with perspective tilt
- **Magic UI Border Beam** — Active feature card glow
- **Sonner** — Status toasts ("Loading SAE features...", "Ablation applied", "Regenerating response...")

### Technical Depth
- **Sparse Autoencoders (SAEs)**: Use pre-trained SAEs from `andyrdt/saes-llama-3.1-8b-instruct` (BatchTopK, k=32-256). Each SAE feature corresponds to a monosemantic concept (sycophancy, refusal, language, etc.)
- **Activation Steering (ActAdd)**: 30 lines of code. `steering_vector = get_activation(positive_prompt) - get_activation(negative_prompt)`. Register a `forward_hook` on layer 15 that adds `coefficient * steering_vector` to the residual stream
- **TransformerLens**: `HookedTransformer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")` — full hook access to every layer, attention head, and MLP
- **3D Layout**: UMAP dimensionality reduction on SAE feature activation vectors → 3D coordinates. Features that co-activate cluster together spatially
- **NOT vLLM**: Must use native HuggingFace `transformers` because vLLM's fused CUDA kernels block Python hooks

### Resource Usage
| Sponsor | Usage |
|---------|-------|
| **Modal** | A100 for Llama-3.1-8B inference + SAE extraction (~40-60 tok/s) |
| **Cloudflare** | Workers API routing, Pages hosting, D1 for feature catalog |
| **OpenAI** | GPT-4o auto-labels discovered SAE features with human-readable names |
| **Supermemory** | Stores "surgery history" — which features were ablated and their behavioral effects |

### Time Estimate (20h)
| Phase | Hours |
|-------|-------|
| Modal deployment (Llama-3.1-8B + SAE + ActAdd hooks) | 4h |
| 3D brain visualization (R3F, instanced mesh, UMAP layout) | 5h |
| Activation flow animation (pathway lighting, connection lines) | 3h |
| Feature map UI + ablation controls | 3h |
| Response streaming + side-by-side comparison | 2h |
| GSAP/Motion polish (SplitText, DrawSVG, transitions) | 2h |
| Demo rehearsal + edge case handling | 1h |

---

## Concept 4: CARTOGRAPH — Semantic Terrain Explorer

### Pitch
Turn any knowledge base into a navigable 3D terrain. Document similarity becomes elevation. Topic clusters become mountain ranges. Search queries fire a visible sonar pulse that illuminates relevant peaks. Navigate your own knowledge like exploring a planet.

### The "Oh Shit" Sequence (0:00–0:12)

**0:00** — The screen is black. A thin horizon line appears. Then — like a sunrise — a 3D terrain rises from the bottom of the screen. It's generated from the user's uploaded documents: each document is a point, embeddings determine x/z position (via t-SNE), and local document density determines elevation. Mountain ranges represent topic clusters. Valleys are sparse knowledge gaps. The terrain has a stylized topographic aesthetic — contour lines etched into the surface, color-coded by topic (warm reds for "machine learning," cool blues for "distributed systems," greens for "biology").

**0:03** — The camera sweeps low over the terrain (GSAP ScrollTrigger pinned + scrub). As it flies over each mountain range, floating labels rise from the peaks with GSAP SplitText character reveals: `NEURAL ARCHITECTURES`, `CONSENSUS PROTOCOLS`, `GENE EXPRESSION`. Fog particles (R3F `<Sparkles>`) drift through the valleys.

**0:06** — **The moment.** The presenter types a search query: "How does attention work?" A sonar ring explodes from the camera position — a visible expanding sphere of light that washes across the terrain. Where the ring passes over relevant documents, they LIGHT UP. Pillars of light shoot skyward from the matching peaks (R3F `<Beam>` + Bloom). The terrain deforms — relevant mountains grow taller, irrelevant areas sink. The entire topography reshapes in response to the query, like a seismic event in real-time.

**0:09** — The camera auto-flies to the brightest peak. Hovering over it reveals a Morphing Dialog (Motion Primitives) — a card that expands smoothly into a full document preview. The card shows the source document, relevance score (NumberFlow animating from 0 to 0.94), and key excerpts highlighted in gold.

**0:12** — The presenter asks a second query: "Compare attention mechanisms to biological synapses." Now TWO sonar rings fire — one from each topic cluster. Where the rings INTERSECT, a new peak erupts from the valley between them — representing the cross-domain connection. A bridge of light (GSAP DrawSVG) traces between the two source clusters through the new peak. This is the knowledge gap — the insight the user didn't know existed.

### Exact Components
- **React Three Fiber** — Terrain mesh (heightmap from embedding density), instanced document markers, sonar ring geometry
- **@react-three/drei** — `Sky`, `Sparkles` (valley fog), `Float` (document labels), `Html` (in-scene tooltips), `CameraControls`
- **@react-three/postprocessing** — `Bloom` (light pillars), `DepthOfField` (tilt-shift terrain), `Vignette`
- **GSAP ScrollTrigger** — Pinned camera flyover with scrub (landing page story mode)
- **GSAP SplitText** — Mountain range label reveals
- **GSAP DrawSVG** — Knowledge bridge tracing between clusters
- **Motion Primitives Morphing Dialog** — Document preview card expansion
- **NumberFlow** — Relevance scores, document count
- **Motion (Framer)** — Search bar interactions, result list animations, panel transitions
- **Magic UI Globe** — Alternative view: documents as globe arcs for geographic data
- **Lenis** — Smooth scroll for the explainer page

### Technical Depth
- **Embedding Pipeline**: Cloudflare Workers AI (`bge-base-en-v1.5`, 768d) embeds all documents → Cloudflare Vectorize for storage and cosine similarity search
- **Terrain Generation**: t-SNE on embedding vectors → 2D coordinates. Kernel Density Estimation (KDE) on the 2D projection → heightmap. Marching squares for contour lines
- **Sonar Search**: Query embedding compared against all document embeddings. Cosine similarity maps to "activation intensity" per document point. Terrain height dynamically deformed by similarity scores (GPU-side with a custom vertex shader that blends base heightmap with query-response heightmap)
- **Cross-Domain Discovery**: When two query embeddings are distant in embedding space but a document exists near both (high cosine similarity to both), that document is the "bridge" — surfaced visually as the erupting peak

### Resource Usage
| Sponsor | Usage |
|---------|-------|
| **Cloudflare** | Workers AI (embeddings), Vectorize (similarity search), D1 (document metadata), Pages (hosting) |
| **OpenAI** | GPT-4o generates summaries and labels for topic clusters |
| **Supermemory** | THE CORE DATA SOURCE — user's accumulated knowledge mapped into terrain |
| **Modal** | t-SNE computation on large document sets (>10K docs) |

### Time Estimate (20h)
| Phase | Hours |
|-------|-------|
| Embedding pipeline (Cloudflare Workers AI + Vectorize) | 3h |
| Terrain generation (t-SNE, KDE, heightmap) | 3h |
| R3F terrain rendering + shaders | 5h |
| Sonar search visualization + terrain deformation | 3h |
| UI chrome (search, Morphing Dialog, NumberFlow) | 3h |
| GSAP scroll narrative (flyover, SplitText labels) | 2h |
| Bridge discovery algorithm + visualization | 1h |

---

## Concept 5: BASILISK — Adversarial Vision Revealer

### Pitch
Upload an image that fools an AI classifier. We show you WHY it was fooled — by rendering the adversarial perturbation as a living, breathing heatmap draped over the original image. Then we evolve a counter-perturbation IN REAL-TIME that "heals" the image, and you watch the classifier's confidence restore like a heartbeat monitor coming back to life.

### The "Oh Shit" Sequence (0:00–0:15)

**0:00** — Clean interface. Two zones: "ORIGINAL" and "ADVERSARIAL." The presenter uploads a photo of a panda. The classifier shows: `Panda: 99.2%` with a green confidence bar (Motion spring animation).

**0:02** — They click "Generate Adversarial." On the right, an identical-looking panda appears — but a noise overlay (invisible to human eyes) has been added. The classifier now shows: `Gibbon: 97.8%` with a red confidence bar. The audience laughs/gasps.

**0:04** — **The moment.** They click "REVEAL PERTURBATION." The noise — previously invisible — materializes as a glowing heatmap overlaid on the panda image. It's rendered as a 3D displacement map in R3F: areas of high perturbation literally *bulge outward* from the image plane, like the photo is boiling. Hot spots (highest perturbation) glow red-orange with Bloom. The perturbation ripples and breathes — a living parasite on the image. The camera slowly orbits the now-3D image, showing the mountain range of adversarial noise from the side.

**0:08** — Split-screen: the panda is on the left. On the right, a real-time "antibody evolution" begins. A population of 100 counter-perturbations appear as tiny colored dots swarming around the image (like a Boids simulation). Each generation, they converge, mutate, and the best counter-perturbations are highlighted with Motion layout animations. A NumberFlow generation counter ticks: `Gen 1 → Gen 12 → Gen 47`.

**0:11** — The best counter-perturbation is found. The antibody swarm collapses into a single point with a flash. The adversarial heatmap on the panda smoothly flattens (3D displacement → 0) with a GSAP tween. The red glow fades to green. The classifier confidence bar swings: `Gibbon: 97.8% → Gibbon: 41.2% → Panda: 89.7%`. NumberFlow shows each digit morphing independently. The audience watches the "healing" in real-time.

**0:14** — Final frame: side-by-side-by-side — Original (`Panda 99%`), Adversarial (`Gibbon 98%`), Healed (`Panda 90%`). The middle one still has faint red heatmap scars. Beautiful.

### Exact Components
- **React Three Fiber** — Image as 3D plane with displacement map shader (perturbation → height), Boids particle swarm
- **@react-three/postprocessing** — `Bloom` (perturbation hotspots), `ToneMapping`, `Noise`
- **GSAP** — Heatmap flatten tween, DrawSVG for evolution tree branches
- **Motion (Framer)** — Confidence bar spring animations, layout animations for evolving population, AnimatePresence for generation cards
- **NumberFlow** — Classifier confidence, generation counter, perturbation magnitude
- **Motion Primitives Animated Number** — Smooth confidence digit transitions
- **Aceternity Background Sparkles** — Ambient particles during evolution
- **Magic UI Shimmer Button** — "Generate Adversarial" CTA
- **Sonner** — Status toasts ("Generating FGSM perturbation...", "Evolving counter-perturbation...")

### Technical Depth
- **FGSM/PGD Attacks**: Fast Gradient Sign Method generates adversarial perturbation in one forward-backward pass. Projected Gradient Descent (PGD) for stronger attacks. Running on Modal A100 with PyTorch
- **Evolutionary Counter-Attack**: CMA-ES (Covariance Matrix Adaptation Evolution Strategy) optimizes a counter-perturbation that restores correct classification. Population of 100, running 50 generations on GPU in ~3s
- **GradCAM Heatmap**: Class Activation Mapping shows which pixels the classifier is attending to. This drives the 3D displacement map — more attention = more height
- **Model**: ResNet-50 or EfficientNet-B0 (small enough for fast inference, well-studied adversarial properties)

### Resource Usage
| Sponsor | Usage |
|---------|-------|
| **Modal** | A100 for FGSM/PGD generation, GradCAM extraction, CMA-ES evolution |
| **Cloudflare** | Pages hosting, Workers for API routing, R2 for image storage |
| **OpenAI** | GPT-4o Vision explains the adversarial attack in natural language ("the noise mimics gibbon fur texture at these pixel locations") |
| **Supermemory** | Attack history — "this model is weakest against texture-based perturbations" |

### Time Estimate (20h)
| Phase | Hours |
|-------|-------|
| Adversarial generation pipeline (FGSM/PGD) on Modal | 3h |
| GradCAM heatmap extraction | 2h |
| R3F 3D displacement map rendering | 4h |
| Evolutionary counter-attack (CMA-ES) | 3h |
| Boids swarm visualization | 2h |
| Frontend UI + animation integration | 4h |
| Polish + demo flow | 2h |

---

## Concept 6: CONDUCTOR — The Orchestral Debugger

### Pitch
Multi-agent AI systems are black boxes. CONDUCTOR turns them into a musical score. Each agent is an instrument. API calls are notes. Latency is tempo. Errors are dissonance. Debug your AI system by LISTENING to it — then conduct the orchestra by dragging agents to reorder execution.

### The "Oh Shit" Sequence (0:00–0:15)

**0:00** — A dark screen with a horizontal timeline — it looks like a music production DAW (Ableton/Logic). But instead of audio tracks, each row is an AI agent: `PLANNER`, `RESEARCHER`, `WRITER`, `CRITIC`, `SYNTHESIZER`. Each is color-coded with a distinct waveform-like visualization.

**0:02** — The presenter triggers a complex query: "Write a comprehensive analysis of transformer architectures." The DAW comes alive. As each agent activates, its track lights up with colored blocks that grow in real-time — like a piano roll being drawn live. The PLANNER fires first (purple blocks), then spawns RESEARCHER (blue) and WRITER (gold) simultaneously. You can SEE the parallelism — two tracks active at once.

**0:05** — **The audio moment.** Each agent's blocks are sonified. The PLANNER emits deep bass tones. The RESEARCHER plays staccato high notes (each note = an API call). The WRITER produces sustained chords (each chord = a paragraph generated). The result is an emergent musical composition that sounds like ambient electronica — and it's a DIRECT REPRESENTATION of the system's execution. The audience hears the AI think.

**0:08** — **The debug moment.** The CRITIC agent fires — but something's wrong. Its track shows a jarring red block. The music produces a harsh dissonant tone. The presenter hovers over the red block — a Morphing Dialog expands showing the error: `TIMEOUT: CRITIC took 4.2s (threshold: 2s)`. The latency is visualized as a stretched, warped note that pulls the entire musical timeline out of sync.

**0:10** — **The conducting moment.** The presenter DRAGS the CRITIC track higher in the stack (before WRITER). The entire timeline re-renders — a ripple wave of recalculation flows left to right (GSAP stagger). The music replays with the new execution order: now the CRITIC evaluates the PLAN before the WRITER starts. The dissonant tone is gone. The total execution time (NumberFlow) drops from `12.4s → 7.8s`. The music sounds harmonious.

**0:13** — Zoomed-in view: each individual API call within an agent is a tiny note in the piano roll. The presenter clicks one — it expands (Motion layout animation) to show the full request/response. Token count, latency, model used, cost — all animated with NumberFlow.

### Exact Components
- **GSAP** — Timeline animation (piano roll growth), stagger effects (recalculation ripple), ScrollTrigger for overview
- **GSAP SplitText** — Agent name reveals
- **Motion (Framer)** — Drag-to-reorder agents (with `layout` animation), Morphing Dialog expansion, AnimatePresence for error popups
- **NumberFlow** — Execution time, token count, latency, cost counters
- **Web Audio API** — Procedural sonification (oscillators mapped to agent activity, FM synthesis for API calls)
- **Tone.js** — (via Web Audio API wrapper) — musical scales, reverb, delay effects
- **Magic UI Border Beam** — Active agent track glow
- **Aceternity Tracing Beam** — Dependency lines between agents (data flow)
- **Motion Primitives Animated Tabs** — Switch between DAW view, graph view, log view
- **Sonner** — Agent status toasts
- **dnd-kit** — Drag-and-drop agent reordering with spring animations

### Technical Depth
- **Agent Instrumentation**: Middleware wrapper for LangChain/AutoGen that emits structured telemetry events (agent_start, api_call, agent_end, error) over WebSocket
- **Sonification Engine**: Web Audio API oscillator bank. Each agent gets a base frequency (220Hz, 330Hz, 440Hz, etc.). API calls trigger ADSR envelopes. Latency maps to note duration. Error maps to dissonant intervals (tritone, minor 2nd)
- **Execution Graph**: DAG (directed acyclic graph) of agent dependencies. Dragging agents recomputes the topological sort and simulates the new execution order
- **Real-Time Streaming**: Cloudflare Durable Objects maintain persistent WebSocket connections per agent session. Events stream in real-time to the DAW visualization

### Resource Usage
| Sponsor | Usage |
|---------|-------|
| **Modal** | Run multi-agent pipeline (LangChain + Llama-3.1-8B agents) |
| **Cloudflare** | Durable Objects for WebSocket agent telemetry, Workers for API routing |
| **OpenAI** | GPT-4o as one of the agents in the orchestra (highest-quality "Synthesizer" instrument) |
| **Supermemory** | Stores execution patterns — "this agent ordering was 40% faster historically" |

### Time Estimate (20h)
| Phase | Hours |
|-------|-------|
| Agent instrumentation middleware | 3h |
| DAW-style timeline rendering (Canvas/SVG + GSAP) | 5h |
| Sonification engine (Web Audio API) | 4h |
| Drag-to-reorder + execution graph recalculation | 3h |
| WebSocket streaming (Cloudflare Durable Objects) | 2h |
| UI chrome (Motion, NumberFlow, Sonner) | 2h |
| Polish + demo audio tuning | 1h |

---

## Concept 7: PHANTOM — Gesture-Forged Interface

### Pitch
No keyboard. No mouse. Your hand IS the interface. MediaPipe hand tracking in the browser + WebGPU compute = a gesture-controlled AI workspace where pinching spawns nodes, swiping connects them, and spreading your fingers explodes a graph for inspection. The cursor is replaced by a particle trail that follows your fingertips.

### The "Oh Shit" Sequence (0:00–0:15)

**0:00** — The presenter's webcam feed appears in the corner. Their hand is visible. As they raise their hand, a constellation of glowing particles materializes on screen, following their fingertips. Five particle streams — one per finger — trail behind with spring physics (each particle connected to the fingertip by a spring, so they lag beautifully). The cursor is gone. The hand IS the cursor.

**0:03** — They make a pinch gesture (thumb + index). Where the pinch lands, a node POPS into existence — a circular card with a spring animation (Motion) and a border beam (Magic UI). Inside the node: an AI prompt input. They "type" by making an ASL fingerspelling gesture — but more practically, they speak their prompt via speech-to-text. The node fills with text.

**0:05** — They pinch again elsewhere. Another node. Now they make a TWO-HANDED gesture: left hand touches node A, right hand touches node B, then they PULL toward each other. A glowing connection line (GSAP DrawSVG) traces between the two nodes. The line pulses with data flowing from A to B (animated dashes, like electrical current).

**0:07** — **The explosion moment.** They hover over a node and SPREAD all five fingers rapidly. The node EXPLODES into a radial graph — sub-nodes burst outward in a Fibonacci spiral (GSAP stagger with elastic ease). Each sub-node is a decomposed sub-task of the original prompt. The original node remains at the center, connected to all children by pulsing lines. The spread animation has a satisfying physics feel — nodes overshoot and settle with spring damping.

**0:10** — They make a FIST and TWIST. The entire graph rotates in 3D (R3F OrbitControls mapped to hand rotation). They can inspect the graph from any angle. Opening the fist freezes the rotation.

**0:12** — They point at a specific sub-node with their index finger. A laser-like beam (R3F + Bloom) extends from their fingertip to the node. The node highlights and expands (Morphing Dialog) showing the AI's response for that sub-task.

**0:15** — Final flourish: they clap both hands together. All nodes COLLAPSE back into a single summary node (Motion layout animation with layoutId). The summary text streams in. They take a bow.

### Exact Components
- **MediaPipe Hands** (in-browser, WebGPU accelerated) — 21 hand landmarks per hand at 30fps
- **React Three Fiber** — Particle trail system (instanced mesh), node graph, laser beam, 3D graph rotation
- **@react-three/postprocessing** — `Bloom` (finger particles, laser beam), `ChromaticAberration` (gesture recognition feedback)
- **@react-three/drei** — `Trail` (finger particle trails), `Float` (idle node bobbing), `Html` (in-scene node content)
- **GSAP** — `DrawSVG` (connection lines), stagger (Fibonacci explosion), elastic ease (node settling)
- **Motion (Framer)** — Node spawn animation (spring), Morphing Dialog (node expansion), layout animation (collapse), AnimatePresence (node creation/deletion)
- **Motion Primitives Morphing Dialog** — Node detail expansion
- **NumberFlow** — Token counts, response time per node
- **Magic UI Border Beam** — Active node highlight
- **Aceternity Sparkles** — Background atmosphere
- **Sonner** — "Gesture recognized: PINCH", "Connection created"

### Technical Depth
- **MediaPipe Hands**: Runs entirely in-browser via WebGPU backend (Transformers.js or @mediapipe/hands). 21 3D landmarks per hand at 30fps. Gesture recognition: pinch = thumb-index distance < 30px, spread = max inter-finger angle, fist = all fingers curled (joint angles > 90°)
- **Spatial Mapping**: Hand landmarks in camera space → canvas screen space via projective transform. Fingertip position = cursor position with Kalman filter smoothing
- **Graph Engine**: Force-directed layout (d3-force) for node positioning. Fibonacci spiral layout for explosion (golden angle = 137.5° between successive nodes)
- **Speech-to-Text**: Web Speech API (free, in-browser) or Whisper via Cloudflare Workers AI for higher quality

### Resource Usage
| Sponsor | Usage |
|---------|-------|
| **Cloudflare** | Workers AI (Whisper speech-to-text, LLM for node decomposition), Pages hosting |
| **OpenAI** | GPT-4o for intelligent task decomposition (one prompt → sub-tasks) |
| **Modal** | Heavy LLM inference for complex multi-node graphs |
| **Supermemory** | Gesture pattern learning — "this user's pinch threshold is 25px not 30px" |

### Time Estimate (20h)
| Phase | Hours |
|-------|-------|
| MediaPipe hand tracking + gesture recognition | 4h |
| R3F particle trail system | 3h |
| Node graph (force layout, creation, connection) | 4h |
| Gesture → action mapping (pinch, spread, fist, point) | 3h |
| UI/UX (Morphing Dialog, GSAP animations) | 3h |
| Speech-to-text integration | 1.5h |
| Polish + gesture calibration | 1.5h |

---

## Concept 8: CHRONICLE — The Living Codebase

### Pitch
Every git repository has a hidden story. CHRONICLE turns your commit history into a living, breathing organism. Files are cells. Commits are heartbeats. Authors are bloodstreams of different colors. Watch your codebase GROW from `git init` to today in an accelerated time-lapse — and spot the moment it got sick (the commit that introduced the bug).

### The "Oh Shit" Sequence (0:00–0:15)

**0:00** — Black screen. A single white dot appears at the center — `git init`. A date appears with GSAP SplitText: `Jan 14, 2024`. Soft hum begins (sonified).

**0:01** — First commit. Three new dots BRANCH outward from the center like a cell dividing (R3F spring animation). Each dot is a file: `README.md`, `index.ts`, `package.json`. They pulse with the author's color (blue for dev-1).

**0:03** — Time accelerates. Commits fly by — the organism GROWS. New files spawn as new cells, clustering around related files (embedding-based proximity). The organism takes an organic shape — dense clusters for `src/`, sparse tendrils for `tests/`, a tight knot for `node_modules/` (if committed — that'd be a bug itself). Each commit is a visible heartbeat — all affected files pulse simultaneously. The growth is mesmerizing — like watching coral grow in time-lapse.

**0:06** — Multiple authors join. Each author's commits pulse in a different color: blue, gold, crimson. You can see the "bloodstreams" — pathways of work that different developers typically travel. Author A always touches the backend (left cluster). Author B lives in the frontend (right cluster). The rare commit that touches BOTH clusters creates a visible cross-organism connection line.

**0:08** — **The sickness moment.** Time reaches "March 15, 2024." One commit pulses — but instead of the healthy white pulse, it's RED. The affected files turn red and begin to darken. Over the next commits, the red spreads — like an infection — to every file that imports from or depends on the infected files. A Tracing Beam (Aceternity) follows the dependency chain visually as the red propagates. NumberFlow shows: `Infected files: 1 → 4 → 12 → 31`. The organism is visibly sick — a dark red bruise spreading through it.

**0:11** — The presenter clicks the red commit. A Morphing Dialog expands: the diff. The bug is highlighted. They click "TRACE IMPACT" — and a shock wave (expanding ring with Bloom) emanates from the bug commit through the dependency graph, lighting up every downstream file in red. The audience can SEE the blast radius.

**0:13** — They click "SHOW FIX." Time fast-forwards to the fix commit. A green pulse propagates through the organism — the antidote. Red files turn green, then back to healthy white. NumberFlow: `Healed files: 31 → 12 → 4 → 0`. The organism recovers.

**0:15** — Final frame: the full organism at present day. It breathes gently. A stat overlay shows: `142 commits`, `37 files`, `3 authors`, `1 critical infection (resolved)`. Beautiful.

### Exact Components
- **React Three Fiber** — Force-directed 3D graph (`@react-three/drei` + d3-force-3d), instanced mesh for file nodes, line segments for dependencies
- **@react-three/postprocessing** — `Bloom` (pulse waves, infection glow), `DepthOfField` (focus on active area), `Vignette`
- **@react-three/drei** — `Trail` (commit pulse propagation), `Float` (idle breathing), `Html` (file labels), `CameraControls`
- **GSAP** — Time-lapse control slider (ScrollTrigger scrub), SplitText for date labels, stagger for infection spread
- **Aceternity Tracing Beam** — Dependency chain visualization
- **Motion (Framer)** — AnimatePresence for commit detail cards, layout animation for graph transitions, spring physics on node spawn
- **Motion Primitives Morphing Dialog** — Commit detail expansion
- **NumberFlow** — File count, infection spread, commit counter
- **use-sound** — Sonified heartbeat per commit (pitch varies by commit size)
- **Lenis** — Smooth scroll for the landing/explainer page
- **Magic UI Dock** — Bottom navigation (timeline controls: play/pause/speed/scrub)

### Technical Depth
- **Git History Parsing**: `simple-git` (Node.js) extracts full commit log: timestamps, authors, files changed, diffs. Dependency graph built from import/require statements via AST parsing (Babel/SWC)
- **Force-Directed Layout**: d3-force-3d positions files in 3D space. Files that import each other have attractive force. Files in the same directory have weak attractive force. Unrelated files repel
- **Infection Propagation**: BFS/DFS on the import dependency graph from the "bug commit" files. Each hop adds a propagation delay for visual spread animation
- **Embedding Proximity (optional)**: Cloudflare Workers AI embeds file content → Vectorize. Similar files cluster together even without import relationships
- **Time-Lapse Engine**: Each commit is a keyframe. Interpolation between keyframes for smooth time-lapse. GSAP timeline scrub for manual control

### Resource Usage
| Sponsor | Usage |
|---------|-------|
| **Cloudflare** | Workers AI (file embeddings for smart clustering), Pages hosting, D1 (commit metadata cache) |
| **OpenAI** | GPT-4o auto-labels the "infection" — explains in natural language what the bug does |
| **Supermemory** | Stores codebase analysis sessions — "last time you analyzed this repo, the hotspot was in auth/" |
| **Modal** | AST parsing + embedding computation for large repos (>1K files) |

### Time Estimate (20h)
| Phase | Hours |
|-------|-------|
| Git history extraction + AST dependency parsing | 3h |
| R3F force-directed 3D graph | 5h |
| Time-lapse engine (commit keyframes, interpolation) | 3h |
| Infection propagation visualization | 3h |
| Sonification (heartbeat per commit) | 1.5h |
| UI chrome (Morphing Dialog, NumberFlow, Magic UI Dock) | 3h |
| GSAP scroll narrative + demo flow | 1.5h |

---

## Comparative Matrix

| Concept | Visual Wow | Tech Depth | Build Risk | Sponsor Coverage | Demo Clarity |
|---------|-----------|-----------|-----------|-----------------|-------------|
| **LARYNX** | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 | Medium (AAI model availability) | 4/4 | Immediate ("tongue goes through skull") |
| **VORTEX** | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥 | High (FNO weights) | 4/4 | Immediate ("50K particles, wind tunnel") |
| **SYNAPSE** | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 | Medium (SAE pre-trained weights exist) | 4/4 | Moderate (requires mech-interp context) |
| **CARTOGRAPH** | 🔥🔥🔥🔥 | 🔥🔥🔥 | Low (all components proven) | 4/4 | Immediate ("search = sonar blast") |
| **BASILISK** | 🔥🔥🔥🔥 | 🔥🔥🔥🔥 | Low (well-studied attacks) | 4/4 | Immediate ("panda → gibbon → panda healed") |
| **CONDUCTOR** | 🔥🔥🔥🔥 | 🔥🔥🔥 | Medium (sonification tuning) | 4/4 | High ("hear the AI think, fix by drag") |
| **PHANTOM** | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥 | High (gesture reliability) | 4/4 | Visceral ("no mouse, hand IS cursor") |
| **CHRONICLE** | 🔥🔥🔥🔥 | 🔥🔥🔥 | Low (git is well-understood) | 4/4 | Narrative ("watch codebase get sick") |

## Top 3 Recommendation (Visual-First Ranking)

### 🥇 LARYNX
**Why**: The tongue-through-skull moment is the single most visceral visual in this entire list. It's physically impossible — judges' brains short-circuit. It also has the deepest technical moat (articulatory phonetics is not weekend-project territory) and hits all 4 sponsors naturally.

### 🥈 SYNAPSE
**Why**: "Open a brain, kill a neuron, watch personality change" is a narrative that sells itself. The 3D brain visualization with live activation flows is inherently mesmerizing. Pre-trained SAE weights exist and ActAdd is only 30 lines. Risk is manageable.

### 🥉 PHANTOM
**Why**: No keyboard, no mouse — just hands — is the kind of visceral "I have no idea how they built that" moment that past winners had. MediaPipe in-browser is proven technology. The particle trail following fingertips is beautiful by itself. Risk: gesture reliability in noisy environments.

---

## Animation Budget Per Concept

Every concept uses the same core stack:

```
Motion (~15kb) + GSAP+ScrollTrigger+SplitText (~30kb) + Lenis (~3kb)
+ Sonner (~3kb) + NumberFlow (~4kb) = ~55kb base

+ React Three Fiber (~50kb) + drei (~30kb) + postprocessing (~20kb) = ~100kb 3D layer

Total: ~155kb (acceptable for a hackathon demo with fast university WiFi)
```

### Shared Setup (Hour 1 of any concept)
```bash
# Core
npx create-next-app@latest --typescript --tailwind --app --src-dir
npm install motion gsap @gsap/react lenis @studio-freight/react-lenis
npm install sonner @number-flow/react clsx tailwind-merge

# 3D (for concepts that need it: all except CONDUCTOR)
npm install @react-three/fiber @react-three/drei @react-three/postprocessing three

# Components (copy-paste, no npm dep)
npx magicui-cli add border-beam shimmer-button particles
# Aceternity: manual copy from ui.aceternity.com
```
