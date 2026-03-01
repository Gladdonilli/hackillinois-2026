# LARYNX — Credits & Attribution

Deepfake Voice Detection via Articulatory Physics
HackIllinois 2026

---

## Datasets

| Dataset | Authors | License | Usage |
|---------|---------|---------|-------|
| [LibriSpeech](https://www.openslr.org/12) | V. Panayotov, G. Chen, D. Povey, S. Khudanpur | CC-BY-4.0 | Real (genuine) voice samples — dev-clean, test-clean, train-clean-100 splits |
| [deepfake-audio-detection](https://huggingface.co/datasets/garystafford/deepfake-audio-detection) | Gary Stafford | MIT | Multi-engine synthetic voice samples (ElevenLabs, Play.ht, AWS Polly, GCP TTS, Azure TTS) and matched real samples |
| [elevenlabs_dataset](https://huggingface.co/datasets/skypro1111/elevenlabs_dataset) | skypro1111 | CC-BY-4.0 | ElevenLabs v1/v2 synthetic voice samples |
| [WaveFake](https://zenodo.org/records/5642694) | Joel Frank, Lea Schönherr | CC-BY-4.0 | Multi-architecture synthetic voice samples (MelGAN, MB-MelGAN, FB-MelGAN, HiFi-GAN, WaveGlow, PWGAN) |

## Models & AI

| Model | Authors / Organization | License | Usage |
|-------|----------------------|---------|-------|
| [HuBERT Large](https://huggingface.co/facebook/hubert-large-ll60k) | Meta / Facebook AI Research | MIT | Audio feature extraction backbone for AAI pipeline |
| [Acoustic-to-Articulatory Inversion (AAI)](https://github.com/articulatory/articulatory) | Peter Wu, Li-Wei Chen | MIT | Converts HuBERT features → 12D EMA articulatory trajectories (tongue/jaw kinematics) |
| [s3prl](https://github.com/s3prl/s3prl) | S3PRL Team, NTU | MIT | Self-supervised speech representation toolkit (HuBERT wrapper) |
| [OpenAI TTS-1](https://platform.openai.com/docs/guides/text-to-speech) | OpenAI | Proprietary | Synthetic voice generation for test samples (alloy voice) |
| [ElevenLabs](https://elevenlabs.io/) | ElevenLabs Inc. | Proprietary | Synthetic voice generation — Flash v2.5, Multilingual v2, v3 models |
| [Google Gemini TTS](https://ai.google.dev/gemini-api/docs/text-generation) | Google DeepMind | Proprietary | Synthetic voice generation for test samples |

## Research & Scientific Foundations

| Reference | Authors | Contribution |
|-----------|---------|--------------|
| "Who Are You (I Really Wanna Know)? Detecting Audio DeepFakes Through Vocal Tract Reconstruction" (USENIX Security 2022) | Logan Blue, Kevin Warren, Hadi Abdullah, Cassidy Gibson, Luis Vargas, Jessica O'Dell, Kevin Butler, Patrick Traynor | Core methodology — vocal tract reconstruction for deepfake detection |
| Physiological velocity limits of human articulators | Peter Ladefoged, Kenneth Stevens | Empirical articulatory velocity thresholds (tongue tip ≤30 cm/s, tongue body ≤20 cm/s, jaw ≤15 cm/s) used for anomaly detection |
| IEC 60601-1-8 Medical Alarm Standard | International Electrotechnical Commission | Alarm sonification design — f₀ 150–1000 Hz, ≥4 harmonics, 10-pulse uneven rhythm |

## Frontend Libraries

| Library | Version | License | Usage |
|---------|---------|---------|-------|
| [React](https://react.dev/) | 18.3.1 | MIT | UI framework |
| [Three.js](https://threejs.org/) | 0.169.0 | MIT | 3D rendering engine |
| [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) | 8.17.10 | MIT | React renderer for Three.js |
| [@react-three/drei](https://github.com/pmndrs/drei) | 9.121.0 | MIT | R3F helper components |
| [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) | 2.16.3 | MIT | Post-processing effects (bloom, chromatic aberration, scanline) |
| [GSAP](https://gsap.com/) | 3.12.5 | GreenSock Standard | Animation engine — timeline sequencing, quickTo for real-time data |
| [Tone.js](https://tonejs.github.io/) | 15.0.4 | MIT | Web Audio synthesis — IEC alarms, Geiger counter, oximeter sonification |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5.0.1 | MIT | State management (transient store for animation state) |
| [Motion (Framer Motion)](https://motion.dev/) | 11.11.17 | MIT | Layout animations and transitions |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4.16 | MIT | Utility-first CSS framework |
| [shadcn/ui](https://ui.shadcn.com/) | — | MIT | UI component primitives |
| [Lucide React](https://lucide.dev/) | 0.460.0 | ISC | Icon library |
| [@number-flow/react](https://number-flow.barvian.me/) | 0.4.2 | MIT | Animated number transitions |
| [Vite](https://vite.dev/) | 6.0.3 | MIT | Build tool and dev server |

## Backend Libraries

| Library | Version | License | Usage |
|---------|---------|---------|-------|
| [Praat / Parselmouth](https://github.com/YannickJadoul/Parselmouth) | 0.4.5 | GPL-3.0 | Formant extraction (Burg method) — training pipeline only |
| [librosa](https://librosa.org/) | 0.10.2.post1 | ISC | Audio loading, resampling — training pipeline only |
| [scikit-learn](https://scikit-learn.org/) | 1.5.2 | BSD-3-Clause | Classifier training (HistGradientBoosting, RandomForest, ensemble) |
| [NumPy](https://numpy.org/) | ≥2.0 | BSD-3-Clause | Numerical computation |
| [SciPy](https://scipy.org/) | ≥1.12 | BSD-3-Clause | Signal processing, resampling |
| [PyTorch](https://pytorch.org/) | 2.7.0+cu128 | BSD-3-Clause | Deep learning runtime (HuBERT, AAI model) — CUDA 12.8 Blackwell build |
| [FastAPI](https://fastapi.tiangolo.com/) | 0.115.6 | MIT | REST API framework |
| [SSE-Starlette](https://github.com/sysid/sse-starlette) | 2.1.3 | MIT | Server-Sent Events streaming |
| [soundfile](https://python-soundfile.readthedocs.io/) | — | BSD-3-Clause | Audio file I/O |

## Infrastructure & Services

| Service | Usage |
|---------|-------|
| [Modal Labs](https://modal.com/) | Serverless GPU compute — B200 inference for HuBERT + AAI pipeline |
| [Cloudflare Workers](https://workers.cloudflare.com/) | Edge API proxy, rate limiting, CORS |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | Audio file storage |
| [Cloudflare D1](https://developers.cloudflare.com/d1/) | Analysis report persistence |
| [Cloudflare Pages](https://pages.cloudflare.com/) | Frontend hosting |
| [Hono](https://hono.dev/) | 4.6.14 — Worker HTTP framework |

## Fonts & Assets

| Asset | Source | License | Usage |
|-------|--------|---------|-------|
| [Inter](https://fonts.google.com/specimen/Inter) | Rasmus Andersson / Google Fonts | OFL-1.1 | Primary UI typeface |
| [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) | IBM / Google Fonts | OFL-1.1 | Monospace typeface (data readouts, tabular numbers) |
| [FaceCap GLB](https://readyplayer.me/) | Ready Player Me | CC-BY-4.0 | 3D head/skull mesh with morph targets |
| [Basis Universal Transcoder](https://github.com/BinomialLLC/basis_universal) | Binomial / Khronos Group | Apache-2.0 | KTX2 texture decompression (WASM) |

## Build & Dev Tools

| Tool | Usage |
|------|-------|
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare Workers CLI |
| [gltfjsx](https://github.com/pmndrs/gltfjsx) | GLB → React Three Fiber component generator |
| [HuggingFace Datasets](https://huggingface.co/docs/datasets) | Dataset download and processing |

---

*Built for HackIllinois 2026 — Modal track*
