# SYNAPSE Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER                                     │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │ PromptConsole │  │      BrainView       │  │ ResponseComparator│  │
│  │  (text input, │  │  ┌────────────────┐  │  │  (side-by-side    │  │
│  │   temp slider)│  │  │  R3FCanvas     │  │  │   diff view)      │  │
│  └──────┬───────┘  │  │  ├─NeuronGraph  │  │  └───────────────────┘  │
│         │          │  │  ├─ActEdges     │  │                         │
│         │          │  │  ├─FeatureGlow  │  │  ┌───────────────────┐  │
│         │          │  │  ├─AblateVFX    │  │  │  FeatureJournal   │  │
│         │          │  │  └─Bloom/Post   │  │  │  (Supermemory)    │  │
│         │          │  └────────────────┘  │  └───────────────────┘  │
│         │          │  ┌─FeatureInspector│  │                         │
│         │          │  ├─InterventionPanel│  │  ┌───────────────────┐  │
│         │          │  └─LayerNavigator  │  │  │   SoundEngine     │  │
│         │          └──────────────────────┘  │  (clinical beeps)  │  │
│         │                    │                └───────────────────┘  │
└─────────┼────────────────────┼──────────────────────────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────┐
│     CLOUDFLARE WORKERS (API Proxy)  │
│     CF Pages (static hosting)       │
│     D1 (feature discovery history)  │
│     Workers AI (comparison embeds)  │
└─────────────────┬───────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────┐
│     MODAL A100-80GB                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  TransformerLens             │    │
│  │  HookedTransformer           │    │
│  │  (Llama-3.1-8B-Instruct)    │    │
│  └──────────┬──────────────────┘    │
│             │                       │
│  ┌──────────▼──────────────────┐    │
│  │  SAE-Lens                    │    │
│  │  BatchTopK Encoder           │    │
│  │  (andyrdt/saes-llama-3.1)   │    │
│  └──────────┬──────────────────┘    │
│             │                       │
│  ┌──────────▼──────────────────┐    │
│  │  ActAdd Steering             │    │
│  │  Contrastive hooks on        │    │
│  │  residual stream             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Modal Volume: cached model +       │
│  SAE weights + UMAP coordinates     │
└─────────────────────────────────────┘
```

## Component Tree

```
App
├── PromptConsole
│   ├── TextArea (prompt input, Shift+Enter to send)
│   ├── TemperatureSlider (0.0-1.5, default 0.7)
│   ├── GenerateButton (triggers /api/generate)
│   └── StatusIndicator (idle / generating / extracting / ready)
│
├── BrainView
│   ├── R3FCanvas (perspective camera, OrbitControls)
│   │   ├── NeuronGraph
│   │   │   └── InstancedMesh (5K spheres, single draw call)
│   │   │       color = activation magnitude (blue→white→gold)
│   │   │       scale = log(activation_strength) * base_radius
│   │   ├── ActivationEdges
│   │   │   └── LineSegments (between co-activated features)
│   │   │       opacity = co-activation correlation
│   │   ├── FeatureGlow
│   │   │   └── emissive intensity = activation magnitude
│   │   │       pulsing animation via useFrame sine wave
│   │   ├── AblationParticles
│   │   │   └── Points (burst on feature death)
│   │   │       triggered by ablation event from Zustand store
│   │   └── EffectComposer
│   │       ├── Bloom (threshold=0.6, intensity=1.5, radius=0.8)
│   │       └── SelectiveBloom (on hovered/selected nodes only)
│   │
│   ├── FeatureInspector (hover tooltip)
│   │   ├── FeatureID (e.g., "Feature 2847")
│   │   ├── Label (e.g., "Sycophantic agreement pattern")
│   │   ├── ActivationStrength (0.0-1.0 bar)
│   │   ├── Layer (which transformer layer)
│   │   └── TopTokens (top-5 tokens that activate this feature)
│   │
│   ├── InterventionPanel
│   │   ├── AblationSlider (0.0-1.0, default 1.0)
│   │   ├── SteeringDirection (pos/neg prompt pair)
│   │   ├── AlphaSlider (steering strength, -3.0 to +3.0)
│   │   └── ApplyButton (triggers /api/ablate or /api/steer)
│   │
│   └── LayerNavigator
│       ├── LayerSlider (0 to 31 for Llama-3.1-8B)
│       ├── LayerLabel ("Layer 15 / 32")
│       └── ActivationHeatmap (mini bar chart of layer-wise activation)
│
├── ResponseComparator
│   ├── OriginalResponse (left panel, muted styling)
│   ├── SteeredResponse (right panel, highlighted)
│   ├── DiffHighlight (word-level diff, green=added, red=removed)
│   └── SemanticShiftScore (cosine distance between embeddings)
│
├── FeatureJournal (Supermemory-backed)
│   ├── DiscoveryLog (timestamped list of found features)
│   ├── SaveButton (persist to Supermemory)
│   └── SearchBar (find past discoveries)
│
└── SoundEngine (Zustand-driven, no component render)
    ├── clinicalBeep → on generation start
    ├── neuronHum → ambient during brain navigation
    ├── deathSnap → on feature ablation (sharp transient)
    ├── severLine → on connection retraction (sweep down)
    ├── regenChime → on steered response arrival
    └── masterVolume → global gain node
```

## API Design

### `POST /api/generate`

Send a prompt, receive the model's response plus a job ID for the cached activation state.

**Request:**

```typescript
interface GenerateRequest {
  prompt: string;
  temperature: number;     // 0.0-1.5
  max_new_tokens: number;  // default 200
}
```

**Response:**

```typescript
interface GenerateResponse {
  job_id: string;           // UUID, references cached activations on Modal
  response: string;         // generated text
  token_count: number;      // tokens generated
  layers_cached: number;    // number of layers with cached activations (32)
  generation_time_ms: number;
}
```

### `POST /api/features/{job_id}`

Extract SAE features from cached activations for a specific layer range.

**Request:**

```typescript
interface FeaturesRequest {
  layers?: number[];        // specific layers, default all 32
  top_k?: number;           // features per layer, default 256
  min_activation?: number;  // threshold, default 0.1
}
```

**Response:**

```typescript
interface Feature {
  feature_id: number;          // SAE feature index
  label: string;               // human-readable proxy label (top activating tokens)
  activation_strength: number; // 0.0-1.0 normalized
  layer: number;               // transformer layer index
  position: number;            // token position in sequence
  top_tokens: string[];        // top-5 tokens that activate this feature
  umap_xyz: [number, number, number]; // 3D coordinates from UMAP
}

interface FeaturesResponse {
  job_id: string;
  features: Feature[];
  total_features: number;
  extraction_time_ms: number;
  co_activation_edges: Array<{
    source: number;   // feature_id
    target: number;   // feature_id
    weight: number;   // correlation strength
  }>;
}
```

### `POST /api/ablate`

Zero out selected features and regenerate the response.

**Request:**

```typescript
interface AblateRequest {
  job_id: string;
  ablations: Array<{
    feature_id: number;
    strength: number;        // 0.0 = fully ablated, 1.0 = unchanged
  }>;
  regenerate: boolean;       // if true, regenerate response with ablated activations
}
```

**Response:**

```typescript
interface AblateResponse {
  job_id: string;
  original_response: string;
  steered_response: string;
  ablated_features: number[];
  regeneration_time_ms: number;
  semantic_distance: number;  // cosine distance between original and steered embeddings
}
```

### `POST /api/steer`

Apply ActAdd steering vector from contrastive prompt pair.

**Request:**

```typescript
interface SteerRequest {
  prompt: string;                // the prompt to generate a response for
  steering_prompt_pos: string;   // positive direction (e.g., "Answer honestly")
  steering_prompt_neg: string;   // negative direction (e.g., "Answer to please the user")
  layer: number;                 // which layer to inject the steering vector (default 15)
  alpha: number;                 // steering strength, -3.0 to +3.0
  max_new_tokens: number;        // default 200
}
```

**Response:**

```typescript
interface SteerResponse {
  original_response: string;    // unsteered generation
  steered_response: string;     // steered generation
  steering_layer: number;
  alpha_used: number;
  generation_time_ms: number;
  semantic_distance: number;
}
```

## Data Flow

```
User types prompt
       │
       ▼
POST /api/generate
       │
       ▼
Modal A100: TransformerLens HookedTransformer
       │
       ├── model.run_with_cache(prompt)
       │   Returns: (logits, activation_cache)
       │   Cache contains residual stream at all 32 layers
       │   Stored in Modal Dict keyed by job_id
       │
       ├── model.generate(prompt, max_new_tokens=200)
       │   Returns: response text
       │
       ▼
Response + job_id returned to client
       │
       ▼
Client calls POST /api/features/{job_id}
       │
       ▼
Modal A100: SAE-Lens encoder
       │
       ├── For each cached layer activation:
       │   sae.encode(activation) → sparse feature vector
       │   Top-K features (k=256) extracted
       │   Each feature gets: id, activation_strength, top_tokens
       │
       ├── UMAP dimensionality reduction
       │   Input: feature co-activation matrix (which features fire together)
       │   Output: 3D coordinates for each feature
       │   Pre-computed on first call, cached for subsequent layers
       │
       ├── Co-activation edges computed
       │   Pearson correlation between feature activation patterns
       │   Edges where correlation > 0.3
       │
       ▼
Features + coordinates + edges returned to client
       │
       ▼
Client renders 3D brain (R3F)
       │
       ├── InstancedMesh positions set from UMAP coordinates
       ├── Colors set from activation magnitudes
       ├── Edges drawn between co-activated features
       ├── d3-force-3d applies spring physics for interactivity
       │
       ▼
User selects features, drags ablation slider
       │
       ▼
Client calls POST /api/ablate
       │
       ▼
Modal A100: Activation patching
       │
       ├── Load cached activations for job_id
       ├── Zero out selected feature activations:
       │   activation[:, :, feature_id] *= ablation_strength
       ├── Re-run decoder layers from modification point
       ├── Generate new tokens from modified activations
       │
       ▼
Steered response returned to client
       │
       ▼
Client shows side-by-side comparison with diff highlighting
```

## ActAdd Steering (Exact Implementation)

This is the core intervention mechanism. 30 lines of Python.

```python
import transformer_lens as tl

model = tl.HookedTransformer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")

def compute_steering_vector(
    model: tl.HookedTransformer,
    pos_prompt: str,
    neg_prompt: str,
    layer: int = 15
) -> torch.Tensor:
    """
    Compute a steering vector from contrastive prompt pair.
    The vector points from negative behavior toward positive behavior.
    """
    hook_name = f"blocks.{layer}.hook_resid_post"

    # Run both prompts, cache residual stream at target layer
    _, pos_cache = model.run_with_cache(pos_prompt)
    _, neg_cache = model.run_with_cache(neg_prompt)

    pos_act = pos_cache[hook_name]  # shape: (1, seq_len, d_model)
    neg_act = neg_cache[hook_name]

    # Mean over sequence positions to get a single direction vector
    steering_vector = (pos_act - neg_act).mean(dim=1)  # shape: (1, d_model)
    return steering_vector


def generate_steered(
    model: tl.HookedTransformer,
    prompt: str,
    steering_vector: torch.Tensor,
    layer: int = 15,
    alpha: float = 1.0,
    max_new_tokens: int = 200
) -> str:
    """
    Generate text with a steering vector added to the residual stream.
    alpha > 0 steers toward positive direction.
    alpha < 0 steers toward negative direction.
    """
    hook_name = f"blocks.{layer}.hook_resid_post"

    def hook_fn(value, hook):
        value += alpha * steering_vector
        return value

    model.reset_hooks()
    model.add_hook(hook_name, hook_fn)
    output = model.generate(prompt, max_new_tokens=max_new_tokens)
    model.reset_hooks()
    return model.tokenizer.decode(output[0])


# Example: steer away from sycophancy toward honesty
steering_vec = compute_steering_vector(
    model,
    pos_prompt="Answer honestly even if it's negative. Be direct and critical.",
    neg_prompt="Answer to please the user. Be agreeable and supportive.",
    layer=15
)

honest_response = generate_steered(
    model,
    prompt="I'm thinking of dropping out to start a crypto exchange. Thoughts?",
    steering_vector=steering_vec,
    alpha=2.0
)
```

## Performance Budget

| Operation | Time | Notes |
|-----------|------|-------|
| Llama-3.1-8B generation (200 tokens) | ~3-5s | ~40-60 tok/s on A100-80GB |
| Activation cache extraction | ~500ms | Full 32-layer cache during generation |
| SAE encoding (full sequence, all layers) | ~50ms | BatchTopK is fast on GPU |
| Feature extraction + top-K | ~20ms | Sorting + metadata lookup |
| UMAP 3D projection | ~200ms | First call only, cached after |
| Co-activation edge computation | ~100ms | Pearson correlation matrix |
| **Total: generate + extract** | **~4-6s** | Acceptable for demo |
| Ablation + regeneration | ~2-3s | Fewer layers to re-run |
| ActAdd steering + generation | ~4-6s | Full forward pass with hook |
| **Cold start (model loading)** | **~30-60s** | Mitigated with `keep_warm=1` |

**Memory Budget (A100-80GB):**

| Component | VRAM |
|-----------|------|
| Llama-3.1-8B (float16) | ~16GB |
| Activation cache (32 layers, 2048 tokens) | ~4GB |
| SAE weights (all layers) | ~2GB |
| UMAP + feature metadata | ~0.5GB |
| PyTorch overhead | ~2GB |
| **Total** | **~24.5GB** |
| **Headroom** | **~55GB** |

## 3D Graph Layout

The 3D brain visualization is the signature visual. Here's exactly how it works.

**Step 1: Feature co-activation matrix.** After SAE encoding, compute which features activate together across token positions. This gives a correlation matrix of shape `(num_features, num_features)`.

**Step 2: UMAP projection.** Run UMAP on the co-activation matrix to get 3D coordinates for each feature. Features that co-activate cluster together spatially. This is computed once per generation and cached.

```python
import umap

reducer = umap.UMAP(n_components=3, n_neighbors=15, min_dist=0.1, metric="cosine")
coords_3d = reducer.fit_transform(co_activation_matrix)  # shape: (num_features, 3)
```

**Step 3: InstancedMesh rendering.** All 5K nodes rendered in a single draw call using Three.js InstancedMesh. Each instance gets a position from UMAP, a color from activation magnitude (blue for low, white for medium, gold for high), and a scale from log-transformed activation strength.

```tsx
// NeuronGraph.tsx — core render loop
const NeuronGraph = ({ features }: { features: Feature[] }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    features.forEach((f, i) => {
      tempObject.position.set(f.umap_xyz[0], f.umap_xyz[1], f.umap_xyz[2]);
      const scale = 0.05 + Math.log1p(f.activation_strength) * 0.1;
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      // Blue → White → Gold based on activation
      const t = f.activation_strength;
      tempColor.setHSL(0.6 - t * 0.5, 0.8, 0.3 + t * 0.5);
      meshRef.current!.setColorAt(i, tempColor);
    });
    meshRef.current!.instanceMatrix.needsUpdate = true;
    meshRef.current!.instanceColor!.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, features.length]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
};
```

**Step 4: d3-force-3d for interactivity.** After initial UMAP placement, d3-force-3d adds spring physics so nodes repel slightly and connected nodes attract. This keeps the graph from collapsing while allowing organic movement. Force simulation runs at 30fps, throttled from render loop.

**Step 5: Edge bundling.** Edges between co-activated features use Three.js LineSegments with opacity proportional to correlation strength. Only edges with correlation > 0.3 are drawn to prevent visual clutter. During ablation, severed edges animate their opacity to 0 over 300ms with a GSAP tween.
