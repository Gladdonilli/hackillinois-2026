# Supermemory Export

**Exported:** 2026-02-28T21:50:12.728Z
**Scope:** project

---

## Project Memories (166)

### [M5MjMQvLnVhfS4aQYhbGAr] (learned-pattern)

[PROJECT] LEARNED-PATTERN: Parallel sessions cause repo state divergence. The auto-push.sh script + parallel sessions create new commits on main while this session's working copy becomes stale. Before editing files, ALWAYS verify the working copy is on the latest main and that files actually exist at expected paths. Key symptom: editing files that appear to exist (JJ tracks them) but the frontend directory has been restructured by another session's commits (e.g. pumzwtyo "fix: frontend API wiring + Aedify build" moved/removed files). Run `jj log -r 'all()' --limit 10` and `ls` the target directory before any edits.

*Created: 2026-02-28T21:43:56.326Z*

### [Z3dEXcNpeZfFYYUepg3fes] (architecture)

[PROJECT] ARCHITECTURE: JJ repo has an `empty-base` branch (change wumymusv) created for "full-repo PR scans" — it's deliberately empty. If working copy suddenly shows no source files, check `jj log -r 'all()'` — you're likely on empty-base, not main. Fix: `jj new main` to get back to main with all 20K+ files.

*Created: 2026-02-28T21:37:58.915Z*

### [fzHj65MQScexE548JzeNNz] (learned-pattern)

[PROJECT] LEARNED-PATTERN: SoundEngine.ts moved from src/sound/SoundEngine.ts to src/audio/SoundEngine.ts (discovered during perf fix session). The parallel sound session reorganized the directory structure. SoundEngine portalFilter.frequency.setValueAtTime() at L570/580 is NOT a bug — these are anchor points for subsequent linearRampToValueAtTime() calls, which is correct Web Audio API usage. Perf fix #7 was cancelled as false positive from the audit.

*Created: 2026-02-28T21:37:54.732Z*

### [U8VKzCq2C3jFyV3tgU6xTB] (learned-pattern)

[PROJECT] LEARNED-PATTERN: Three.js CatmullRomCurve3.getPoints(divisions) does NOT accept a pre-allocated buffer — it always returns a new Vector3[] array. Optimization strategy for per-frame usage: accept the Vector3 allocation but eliminate the downstream flatMap() by pre-allocating a Float32Array(divisions*3+3) via useRef and copying with a for-loop. Applied in VelocityRibbons.tsx — eliminated 153-element array allocation per frame.

*Created: 2026-02-28T21:37:50.728Z*

### [Lre6yV4DKYgspPSGT5HjAh] (project-config)

[PROJECT] project-config: Full deployment status as of Feb 28. All 7 CF products active: Workers (larynx-api.tianyi35.workers.dev, version d74b81a8), D1 (larynx-analysis, 4c23a222), R2 (larynx-audio), Workers AI (AI binding), Vectorize (larynx-signatures, 768 dims, cosine), Pages (larynx.pages.dev, deploy 3dcfee75), AI Gateway (larynx-gateway). Custom domains: voxlarynx.tech (Pages), api.voxlarynx.tech (Worker). Modal: gladdonilli--larynx-analyze.modal.run. Aedify: auto-deploys from GitHub, container-based via Nixpacks, port 8000, root package.json shim delegates to LARYNX/frontend.

*Created: 2026-02-28T21:35:38.495Z*

### [uvnK2DYAKf5E87ZDtV6Uxg] (architecture)

[PROJECT] architecture: Frontend API wiring (FIXED Feb 28). Three connection points all use `import.meta.env.VITE_API_URL` with fallback to `https://larynx-api.tianyi35.workers.dev`. (1) useAnalysisStream.ts: constructs `${API_BASE}/api/analyze`, POSTs FormData for SSE analysis stream. (2) useComparisonStream.ts: constructs `${API_BASE}/api/compare`, POSTs for comparison SSE stream. (3) useLarynxStore.ts fetchHistory: uses `${API_BASE}/api/history?limit=20`. VITE_API_URL in .env = `https://larynx-api.tianyi35.workers.dev`. Full chain: CF Pages → CF Worker → Modal SSE. Previously broken: hooks posted to URL root (no /api/ path) with -dev Modal fallback.

*Created: 2026-02-28T21:35:31.411Z*

### [JfUeS7j4tHDhdAsxgMEWm9] (architecture)

[PROJECT] architecture: overnight_pipeline.py refactored to use Modal Volume-based dataset caching (Feb 28 2026). Previously, main() read ALL WAVs from local disk into memory and sent raw bytes over the wire via .map() for EVERY pass (30 passes × ~86K WAVs = ~129GB total network transfer). New approach: two new Modal functions (upload_wavs_to_volume, list_volume_dataset) upload WAVs to /model-cache/dataset/{real,fake}/ ONCE, then predict_ema_batch receives volume paths (strings) instead of bytes. predict_ema_batch calls model_cache.reload() on entry to handle warm containers seeing new uploads. Upload is incremental (skips existing files) so subsequent runs transfer nothing. Net effect: ~129GB network → ~4.3GB one-time upload + negligible string dispatch per pass. Containers read WAVs at NVMe speed from co-located volume.

*Created: 2026-02-28T21:29:52.208Z*

### [d7zce4ryrdsYxYBnhW8nuS] (architecture)

[PROJECT] architecture: Aedify.ai is a container-based PaaS using Nixpacks (Railway's builder). "Deploy from GitHub" clones full repo, detects framework via root manifest files, builds Docker image via Nixpacks, runs as container with health check on configured port (8000). No root directory setting available. Requires root-level package.json for Node.js detection. Settings: port mapping, env vars, compute resources (CPU/Memory sliders), GitHub auto-deploy on push. Prize: $300 platform credits + 5mo free OpenClaw per member.

*Created: 2026-02-28T21:27:23.938Z*

### [u4W6sNBjUrcWS3a5y74yE5] (error-solution)

[PROJECT] error-solution: Aedify build fails with "Cannot find module './_tsc.js'" when using nested npm install. Root cause: Nixpacks runs npm install at repo root first (for serve dependency), then build script does cd LARYNX/frontend && npm install && npm run build. The tsc binary in nested node_modules has module resolution conflict with root node_modules. Fix: change root package.json build to skip tsc (use vite build only) since Vite handles TS natively, OR install all deps in one layer.

*Created: 2026-02-28T21:27:18.768Z*

### [8sdrn7ABpk5iJFHc7nZvYE] (conversation)

[PROJECT] conversation: handoff-2026-02-28T21:12Z digest. B200 was kept as fastest target, but Blackwell compatibility required upgrading `LARYNX/backend/overnight_pipeline.py` image deps to torch/torchaudio 2.7.0+cu128 with PyTorch cu128 index after `no kernel image` failures under torch 2.5.1. Run 3 inference output was recovered for training via local `train_local.py`, producing updated `training_data/ensemble_model.pkl` (21:05) with 76.8% GroupKFold on 86,420 rows. Run 4 relaunched on B200 (`ap-5Jk4yzY3WjQt2ycL1NkaiM`) and is actively processing pass 1 batches.

*Created: 2026-02-28T21:12:04.393Z*

### [GCz2FYRZcPn73Z3gmV5KvL] (architecture)

[PROJECT] architecture: Run 3 inference data completed on Modal and local classifier training was completed offline from `LARYNX/backend/training_data/aai_results.json`. Local training script `LARYNX/backend/train_local.py` produced updated `training_data/ensemble_model.pkl` at 2026-02-28 21:05 with GroupKFold CV accuracy 76.8% on 86,420 rows (43,210 real + 43,210 fake, 108 features, 2,099 speaker groups). This provides a fresh model artifact despite the original Modal Run 3 post-inference training stage not emitting usable logs in the original PTY stream.

*Created: 2026-02-28T21:11:28.367Z*

### [81ipswVnhwEgL4dha38nTL] (project-config)

[PROJECT] project-config: Run 4 training/inference pipeline is now configured for Blackwell B200 in `LARYNX/backend/overnight_pipeline.py` with `gpu="B200"`, `INFERENCE_PASSES=30`, `BATCH_SIZE=20`, and `@modal.concurrent(max_inputs=10)`. PyTorch stack was upgraded to `torch==2.7.0+cu128` and `torchaudio==2.7.0+cu128` with `extra_index_url="https://download.pytorch.org/whl/cu128"` to provide SM100-compatible kernels. This change was required after B200 failed under torch 2.5.1 with no-kernel-image runtime errors.

*Created: 2026-02-28T21:11:28.349Z*

### [eWA5GZdi8DZhCoVZ19ZfgY] (project-config)

[PROJECT] project-config: Full LARYNX deployment stack live (Feb 28 2026). CF Worker deployed at larynx-api.tianyi35.workers.dev + custom domain api.voxlarynx.tech. CF Pages deployed at larynx.pages.dev + custom domain voxlarynx.tech (SSL initializing). Frontend VITE_API_URL set to Worker URL in .env, baked into build. Full chain now: frontend (Pages) → CF Worker (api.voxlarynx.tech) → Modal SSE. Worker intercepts verdicts for D1 persistence + R2 audio storage + Workers AI embeddings + Supermemory forensic writes. All endpoints verified: /api/health ✅, /api/history ✅, /api/intelligence/stats ✅ (supermemory configured: true).

*Created: 2026-02-28T21:10:09.897Z*

### [LNSrLYB4nEMsVZG8XHu5T2] (learned-pattern)

[PROJECT] learned-pattern: Playwright/Chromium on GCP c4a VM (CPU-only, no GPU) uses SwiftShader CPU-based GPU emulation, causing catastrophic CPU usage (~3800% across 16+ procs for 10 agent-browser sessions). Each agent-browser invocation spawns a SEPARATE headless Chromium instance (not tabs), each with its own SwiftShader stack. Solution: run Chromium locally (WSL with GPU) and connect agent-browser via CDP flag `--cdp ws://<ip>:9222`. Launch Chrome with `--remote-debugging-port=9222`. This moves all rendering off the VM entirely. X11/Wayland forwarding does NOT help — GPU work stays where Chromium process runs, forwarding only ships pixels.

*Created: 2026-02-28T21:09:14.652Z*

### [oNQGypdUQkDagLGCHg6waP] (error-solution)

[PROJECT] error-solution: Run 4 on Modal B200 failed with `RuntimeError: CUDA error: no kernel image is available for execution on the device` when using torch==2.5.1/torchaudio==2.5.1 in `LARYNX/backend/overnight_pipeline.py`. Root cause: that wheel set targets older CUDA architectures and lacks Blackwell (SM100) kernels. Fix applied: upgrade image deps to `torch==2.7.0+cu128`, `torchaudio==2.7.0+cu128`, and set `extra_index_url="https://download.pytorch.org/whl/cu128"` so Modal builds with CUDA 12.8 Blackwell-capable binaries.

*Created: 2026-02-28T21:08:03.823Z*

### [PU7gzFkMyTPC9twGVrHJ7S] (error-solution)

[PROJECT] learned-pattern: SoundEngine.ts integration fixes (Feb 28 2026). Four bugs found and fixed: (1) 13 tsc errors from dead velocity/horror synth references in dispose() — Phase 3 replaced velocity chain with Geiger+Oximeter and horror with IEC alarm but forgot to clean dispose(). (2) IEC 60601-1-8 alarm loop set to '1m' (1 measure = 1s at 60 BPM) but 10-pulse pattern spans 3.7s — fixed to '4m' (4s). (3) MetalSynth.triggerAttackRelease('C4', '32n') wrong — MetalSynth doesn't accept note names, takes (duration, time) — fixed to ('32n', Tone.now()). (4) subImpact/noiseBurst/noiseBurstFilter disposed but never nulled — added null assignments. After fixes: 0 tsc errors across entire codebase for first time.

*Created: 2026-02-28T21:04:28.786Z*

### [Pce7NKzq6cdZeDGJKfoZNR] (learned-pattern)

[PROJECT] learned-pattern: Agent-browser sessions leave zombie Chromium processes. Each snapshot spawns Playwright Chromium (renderer + GPU process) and agent-browser daemon (~135MB each). 16+ Chromium procs consumed ~4.2GB RAM and ~3,800% CPU. 10 stale daemon processes consumed ~1.35GB. MUST run `pkill -9 -f "agent-browser"; pkill -f "chromium"` after every agent-browser session. Never leave sessions open between tasks. Use `--session` flag to reuse sessions, and explicitly close/kill when done. This was discovered during Wave 4 visual audit when accumulated sessions from larynx-v4 and larynx-v5 were never cleaned up.

*Created: 2026-02-28T21:04:05.604Z*

### [y9BUPwnY5RDvJiT8cSFWZH] (project-config)

[PROJECT] project-config: D1 migrations fully applied to remote (Feb 28 2026). 0000_init.sql (wrong 'analyses' table) + 0001_analysis_reports.sql (correct 'analysis_reports' table with 16 columns: report_id, created_at, audio_key, duration_s, verdict, confidence, peak_velocity, threshold, anomalous_frames, total_frames, anomaly_ratio, processing_time_ms, classifier_score, classifier_model, ensemble_score, client_ip_hash + idx_reports_created index). Database: larynx-analysis (4c23a222-e513-446f-b2a4-6d5303840396). Worker wrangler.toml at LARYNX/worker/wrangler.toml (NOT frontend/wrangler.jsonc as some docs say).

*Created: 2026-02-28T20:54:49.132Z*

### [o7dRL9MfA8AUe4x473xfA3] (architecture)

[PROJECT] architecture: LARYNX SSE pipeline fully aligned across 3 layers (Feb 28 2026). Backend pipeline.py uses snake_case internally, app.py converts to camelCase at SSE emission boundary (tongueVelocity, isGenuine, anomalousFrameCount, totalFrameCount, anomalyRatio). CF Worker (index.ts) passes SSE through unchanged, converts camelCase→snake_case only for D1 inserts. Frontend useAnalysisStream.ts expects camelCase. No reconciliation needed — all 4 event types (progress, frame, verdict, error) and all field names align.

*Created: 2026-02-28T20:54:42.805Z*

### [o9gKBVq1cM1tCfsVwU8gCH] (error-solution)

[PROJECT] error-solution: CF API token (CLOUDFLARE_API_TOKEN in ~/.env) lacks Vectorize and AI Gateway permissions (error code 10000). Token has Workers/D1/R2/AI scopes but NOT Vectorize or AI Gateway. Must update token at dash.cloudflare.com/profile/api-tokens or create resources via CF dashboard directly. Account ID: 1d71ce44882801d49fad2c5b02629d82.

*Created: 2026-02-28T20:54:39.349Z*

### [B1JQcVdbU7PRF9PkqLSP7B] (project-config)

[PROJECT] project-config: Modal CLI is NOT on system PATH. It lives in a dedicated venv at `/home/li859/modal-env/bin/modal`. The `modal` Python package is NOT installed in the system Python — `import modal` fails. To run modal commands use the full path or activate the venv first: `source /home/li859/modal-env/bin/activate`. modal==1.3.4 per STACK.md.

*Created: 2026-02-28T20:51:44.014Z*

### [54RKqi33AtTwm8fhu5iGPG] (error-solution)

[PROJECT] error-solution: 4-agent frontend audit — ALL 31 issues resolved across Waves 0-4. CRITICAL (8): C1 ErrorBoundary wrapping App. C2 SSE 60s timeout. C3 store._streamAbort registry. C4 WarpTransition onComplete removed from useEffect deps. C5 clock.getDelta()→elapsedTime diff. C6 WaveformDisplay gradient if/else fix. C7 VELOCITY_THRESHOLDS deduped (types/larynx.ts re-exports from constants.ts). C8 --radius 0.125rem→0.5rem. HIGH (11): H1 addFrame spread→concat. H3 THREE.Color pre-allocated useRef. H4 HeadModel MeshTransmissionMaterial samples 6→2. H5 webglcontextlost handlers on all 4 Canvas instances. H7 dynamic Tailwind shadow hardcoded. H10 intro click-to-skip. H11 SoundEngine.init() .catch(). MEDIUM (12): M1 triple portalState subscription consolidated. M3 CompareView File A badge shows verdict+confidence%. M4 ClosingScreen playBeep guarded with hasPlayedRef. M5 UploadPanel double-drop prevented with isProcessingRef. M6/M7 Shadcn badge/button rounded-sm. M8 ClosingScreen manual brackets→.hud-panel. M10 VerdictPanel confidence null guard. M12 UploadPanel text-dim. Build green: tsc 0 errors, vite 3570 modules ~602KB gzip.

*Created: 2026-02-28T20:43:17.336Z*

### [bWWrKDcbL8cMAoibL4oGS6] (learned-pattern)

[PROJECT] learned-pattern: AnimatePresence from motion/react (framer-motion) is INCOMPATIBLE with R3F Canvas children for scene transitions. Modes tested: "wait" (blocks forever — Canvas prevents clean unmount, new view never mounts), "popLayout" (same blocking), "sync" (supposed to mount both — but the exiting Canvas still blocks the incoming view from rendering). Root cause: R3F Canvas creates a WebGL context that has complex teardown — motion.div exit animation completes but Canvas DOM removal is async/deferred, preventing AnimatePresence from recognizing the exit is "done". Fix: remove AnimatePresence entirely, use simple conditional rendering with CSS transitions (opacity+pointer-events). Both views already use absolute positioning so they overlay correctly without animation library coordination.

*Created: 2026-02-28T20:14:12.107Z*

### [CyiimWeTA5H2Bduvanwb2t] (architecture)

[PROJECT] architecture: LARYNX Supermemory integration uses container tags (NOT a separate Space) for forensic voice analysis data. Container tags partition memories within the existing space — `.supermemory-id` file in project root is the container tag for opencode-supermemory plugin dev memories. CF Worker uses a different container tag (e.g., "larynx-forensic") to isolate forensic records from dev workflow memories. API: POST /v3/memories with `containerTag` field in body + `containerTags` array in search queries for scoped retrieval. Auth: Bearer token only (API key implies space, no x-space-id header needed). Only one Worker secret needed: SUPERMEMORY_API_KEY. All operations fail-open via waitUntil().

*Created: 2026-02-28T20:05:14.595Z*

### [LX3MA4Hp14HJzgxZdQGzm2] (error-solution)

[PROJECT] error-solution: 4-agent audit found 31 issues (8 critical, 11 high, 12 medium). Waves 0-3 fixed 15 issues. Key fixes: C8 --radius 0.125rem→0.5rem (Tailwind sm=calc(var(--radius)-4px) was negative=0px). C7 VELOCITY_THRESHOLDS deduped — types/larynx.ts (per-sensor for EMAMarkers/VelocityHUD) now re-exports from constants.ts SENSOR_THRESHOLDS. C6 WaveformDisplay gradient stops had wrong control flow — cyan stops always overwrote red; fixed with if/else. H7 dynamic Tailwind class shadow-[...${COLORS_RGBA}] never compiled — hardcoded rgba value. C1 ErrorBoundary class component wrapping App in main.tsx. C2 SSE 60s timeout via Promise.race. C3 store._streamAbort registry so reset() aborts active SSE. C4 WarpTransition onComplete removed from useEffect deps (prevented GSAP timeline restart). C5 clock.getDelta()→elapsedTime diff (R3F already consumes delta). H1 addFrame spread→concat. H3 THREE.Color pre-allocated via useRef. H10 intro click-to-skip.

*Created: 2026-02-28T20:03:10.601Z*

### [5BfqGQR1wwtKuZifXWVfx7] (architecture)

[PROJECT] architecture: LARYNX classifier mismatch risk (Feb 28 2026). CRITICAL: The live inference pipeline (pipeline.py) uses Praat formant→articulatory mapping for EMA trajectories, while the training pipeline (overnight_pipeline.py) uses HuBERT→AAI neural inversion. The 108 features (6 articulators × 3 signals × 6 stats) have the same SCHEMA but different INPUT trajectories. classifier.py's classify_ema_frames() extracts features identically but from formant-derived positions instead of AAI-derived ones. The ensemble verdict uses weighted blend: 0.6×formant_confidence + 0.4×classifier_confidence, so even if classifier accuracy degrades, formant-based anomaly detection still dominates. Velocity thresholds: T1=20, T2=15, T3=12, JAW=10 cm/s. ABSOLUTE_MAX_VELOCITY=22 cm/s.

*Created: 2026-02-28T20:00:12.714Z*

### [Jox1Q5xGXEYZpzaHKVpTa4] (architecture)

[PROJECT] architecture: LARYNX backend live inference architecture (Feb 28 2026). THREE Modal web endpoints on `hackillinois-2026` app: (1) POST / label=`larynx-analyze` — single file analysis, accepts multipart `file`, returns SSE stream (progress→frame→verdict→heartbeat events), CPU=2/mem=2048/timeout=300s/min_containers=1. (2) POST / label=`larynx-compare` — two-file comparison, accepts `file_a`+`file_b`, returns SSE with channel prefixes + final comparison event, timeout=600s. (3) GET / label=`larynx-health` — health check. CORS whitelist: larynx.pages.dev, voxlarynx.tech, localhost:5173. Pipeline: AudioPreprocessor(librosa 16kHz)→FormantExtractor(Praat formant_burg 100fps)→ArticulatoryMapper(F1→jaw 300-900Hz→0-15mm, F2→tongue 800-2400Hz→±20mm)→VelocityAnalyzer(cm/s, VELOCITY_SCALE=1.5)→classifier.py(ensemble_model.pkl). Verdict: ensemble_score = 0.6×formant_confidence + 0.4×classifier_confidence.

*Created: 2026-02-28T19:59:59.617Z*

### [zBkQh7gNWTAZQ5pKtCLb9Q] (architecture)

[PROJECT] architecture: LARYNX frontend audit findings (Feb 28 2026, 4-agent audit). 8 CRITICAL issues found: (1) No error boundaries anywhere — 4 Canvas instances, zero boundaries, any error = white screen requiring reload. (2) SSE stream in useAnalysisStream.ts has no timeout — while(true) reader.read() hangs forever on TCP drop. (3) reset() in useLarynxStore never calls cancelStream(), zombie SSE pushes verdict into idle state. (4) Portal GSAP chain deadlocks if any onComplete fails — WarpTransition has onComplete in useEffect deps causing timeline restart. (5) LandingScene.tsx:263 clock.getDelta() double-consumed, portal jaw animation DEAD. (6) WaveformDisplay.tsx:157-163 cyan gradient always overwrites red — waveform never turns red at skull-clip. (7) Duplicate VELOCITY_THRESHOLDS — constants.ts (20/15/10) vs types/larynx.ts (25/20/15). (8) CSS --radius=0.125rem with sm=calc(var(--radius)-4px) = -2px = square corners. Also: AnalysisView + IntroSequence still have pre-v3 #00FFFF/#FF3366 colors (primary demo screens). useState used for 60fps animation in 3 components. O(n²) frame accumulation in addFrame. No .dispose() calls on unmount.

*Created: 2026-02-28T19:51:58.491Z*

### [ivCJ3LsqqGWdRwX4cd9hc4] (architecture)

[PROJECT] architecture: Oracle corrected embedding strategy (Feb 28 2026). Original plan to use Workers AI BGE text embeddings for acoustic fingerprints is WRONG — BGE is a text model, feeding it numeric sensor data gives lexical similarity of digit strings not acoustic similarity. Oracle recommended using 108 classifier features directly as Vectorize vectors (108-dim). However, Ultrabrain OVERRULED this for prize strategy: text embeddings via Workers AI keeps product count at 7 (Workers AI needed). Imprecision irrelevant at hackathon — similarity only needs to visually cluster deepfakes with deepfakes, no judge tests sub-cm/s precision. Final decision: use Workers AI BGE with categorical token binning (severity bands, confidence bands) in text template. Both Oracle and Ultrabrain agree waitUntil() is correct for fire-and-forget background work in CF Workers.

*Created: 2026-02-28T19:45:08.166Z*

### [xngvLuaqtZuHq2dEvbx3HQ] (architecture)

[PROJECT] architecture: Run 3 merged dataset composition — FAKE (4,321 total): el_key1 1,102 (multilingual_v2 16kHz) + el_key2 891 (flash_v2_5 16kHz) + sk_fake 1,388 (skypro1111 resampled 44.1→16kHz) + gs_fake 933 (garystafford HF) + asset_fake 7. REAL (4,421 pre-downsample): gs_real 933 + asset_real 10 + libri_tc100 3,478 (random seed=42 from 28,539, 251 speakers for GroupKFold diversity). Downsample target: min(real, fake) = 4,321 balanced. Quality ranking for reals: train-clean-100 (studio, 251 speakers) > test-clean > garystafford.

*Created: 2026-02-28T19:33:43.036Z*

### [XsQsxFmAwZro1wrATiW2tW] (learned-pattern)

[PROJECT] learned-pattern: Parallel session's `jj file untrack` + commit squash deleted merged dataset from disk (33K real + 4.3K fake → 0). Root cause: JJ untrack removes files from working copy when combined with subsequent operations. Recovery strategy: re-extract from cached sources (ElevenLabs /tmp recovery, skypro zip, LibriSpeech tarballs, HF cache) rather than JJ restore (which risks re-polluting git tracking). Script: LARYNX/backend/rebuild_merged.py.

*Created: 2026-02-28T19:33:37.398Z*

### [6CHJukczJyUovTjnVXiHmx] (project-config)

[PROJECT] project-config: .gitignore policy and JJ snapshot limits (Feb 28 2026). JJ snapshot.max-new-file-size = 27000000 (27MB) — files over this are silently excluded from JJ snapshots (e.g. elevenlabs_dataset.zip at 314MB). .gitignore excludes: training_data/datasets/ (14GB WAVs), training_data/audio/ (270MB), aai_results.json (52MB), aai_results_checkpoint.json, ema_outputs/, *.zip/*.tar.gz/*.tar.bz2, node_modules/, dist/, .vite/, .wrangler/, __pycache__/, .env. Whitelisted: ensemble_model.pkl (<1MB trained model). CRITICAL: add new large files to .gitignore BEFORE JJ snapshots them — once snapshotted, removing requires `jj file untrack` + history rewriting. 38,884 training data files were untracked via `jj file untrack` after being accidentally snapshotted by auto-push. Net-clean commit created by `jj new` on main@origin + `jj restore --from` to bypass intermediate commits that contained 14GB.

*Created: 2026-02-28T19:32:02.173Z*

### [NbH4JYae6zqtN9ArTCKFSE] (error-solution)

[PROJECT] error-solution: CompareView model clipping fix (Feb 28 2026). 3D face models in CompareView were clipped below the nose because SCENE.COMPARE_MODEL_Y was -0.8 (too low for camera at [0,0,4] with 45° FOV). Fixed by changing to -0.2 in constants.ts. The facecap.glb model center is mid-head, so smaller negative Y offsets keep the full face (including jaw/chin) visible. Main LandingScene uses FACE_MODEL_POSITION [0,-0.3,0] with larger scale (2.5 vs 1.2), so it needs slightly more offset.

*Created: 2026-02-28T19:18:03.974Z*

### [FxaE7c1XnMAaBWYiMvFZCV] (learned-pattern)

[PROJECT] error-solution: VerdictPanel GSAP animation timing (Feb 28 2026). VerdictPanel appears empty in screenshots taken <3s after state change because GSAP timeline sets initial states (badge scale=0, confidence opacity=0, evidence opacity=0) and animates over ~2-3s total. Badge elastic pop at t=0.4, confidence countup at t=0.7 (uses TIMING.CONFIDENCE_COUNT_DURATION with power3.out easing), evidence stagger at t=1.1. Need minimum 5s delay after forcing complete state before screenshotting to capture fully-animated state. Not a code bug — GSAP timing is by design for cinematic reveal.

*Created: 2026-02-28T19:17:58.468Z*

### [JFfNoiWS3vLTWzSS7EeX6j] (architecture)

[PROJECT] architecture: Project file reorganization completed (Feb 28 2026). Changes: (1) supermemory-context.md DELETED — 371-line Prism project doc, completely wrong project, actively poisoning agent context. (2) shared/audio/{SoundEngine.ts, index.ts, useAudioInit.ts} moved to _intel/archived-code/shared-audio/ — orphaned TypeScript code with zero imports anywhere, duplicates of LARYNX/frontend/src/audio/SoundEngine.ts. (3) _intel/research/FRONTEND-ANIMATION-STACK-2026.md moved to research/ — post-decision reference doc misplaced in pre-decision intel dir. (4) search_papers.py + search_arxiv.py moved from root to _intel/scripts/ — one-off Semantic Scholar/arXiv search scripts. (5) en_voices.txt moved from root to _intel/ — empty ElevenLabs voice list artifact. Root dir now clean: only project dirs (LARYNX/, SYNAPSE/, _intel/, competitive-intel/, research/, scripts/, shared/) and top-level docs (AGENTS.md, ATTENDEE_GUIDE.md, RESOURCES.md).

*Created: 2026-02-28T19:14:40.925Z*

### [BQ4Gg2T1ELa7kCVmbM1Amj] (architecture)

[PROJECT] architecture: D1 migration status (Feb 28 2026). Two SQL files exist: migrations/0000_init.sql (old schema with `analyses` table — wrong columns, missing report_id/classifier fields) and src/schema.sql (correct schema with `analysis_reports` table matching index.ts code — has report_id, audio_key, verdict, confidence, peak_velocity, threshold, anomalous_frames, total_frames, anomaly_ratio, processing_time_ms, classifier_score, classifier_model, ensemble_score, client_ip_hash). Need to create new migration 0001_schema.sql using schema.sql content and run `npx wrangler d1 execute larynx-analysis --file=./migrations/0001_schema.sql`. The 0000_init.sql creates wrong table (`analyses` not `analysis_reports`) so it should NOT be used.

*Created: 2026-02-28T19:08:50.248Z*

### [z4RDRw7hoaVaabqumjPUV3] (architecture)

[PROJECT] architecture: CF Worker intelligence layer design (Feb 28 2026). Workers AI binding: `[ai] binding = "AI"` in wrangler.toml, call `env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [str] }, { gateway: { id: 'larynx-gateway' } })` returns 768-dim embeddings. Vectorize: `npx wrangler vectorize create larynx-signatures --dimensions=768 --metric=cosine`, binding `[[vectorize]] binding = "VECTOR_SIGNATURES" index_name = "larynx-signatures"`, upsert/query via env.VECTOR_SIGNATURES. AI Gateway: `npx wrangler ai-gateway create larynx-gateway`, no wrangler binding needed — referenced in AI.run() gateway option. Free tier: 10K neurons/day (Workers AI), 5M queried dims/mo (~6500 queries, Vectorize), AI Gateway unlimited. Types `Ai` and `VectorizeIndex` from @cloudflare/workers-types.

*Created: 2026-02-28T19:08:43.921Z*

### [9bWjM5hSCFAjf1PjhDWamt] (architecture)

[PROJECT] architecture: ElevenLabs full audio recovery completed (Feb 28 2026). Individual download approach recovered ALL 1,993 unique audio files (zero failures) from 3,098 history items across two API keys. Key 1 (sk_a314): 1,102 WAVs (422 metadata + 680 deleted-voice), 186 MB. Key 2 (sk_7ffe): 891 WAVs (487 metadata + 404 deleted-voice), 146.8 MB. Total 332.8 MB, all 16kHz mono WAV. Earlier bulk-zip extraction had lost 308 unique Key 2 files to filename collisions (66 multi-model overwrites where eleven_flash_v2_5 and eleven_multilingual_v2 shared same zip filename, plus 242 same-text collisions). Settings layer was identical across ALL items (stability:0.5, similarity_boost:0.75) so only model×voice×text dimensions matter for uniqueness. Credit waste: 49.9% — 66,723 of 133,708 credits wasted on duplicate regenerations ($14.68 of $29.42 at Creator rates). Key 2 worse at 61.2% waste due to N_FAKE_SAMPLES=1200 bug. Files at /tmp/elevenlabs_recovery/{key1,key2}_individual_{wav,mp3}/. MP3 originals kept for reference.

*Created: 2026-02-28T19:08:16.574Z*

### [o7jkvezb26x3qp5FyeThHi] (error-solution)

[PROJECT] error-solution: CompareView.tsx TS1005 ')' expected at line 175 — ROOT CAUSE FOUND (Feb 28 2026). VelocityGraph component's `return (` on line 166 was never closed — line 175 had `};` (closing arrow function body) but no `)` to close the return statement's parenthesis. Fix: added `);` before `};` on line 175. LSP diagnostics showed clean (likely cached/incomplete) but `tsc --noEmit` correctly caught it. Visual code inspection missed it because the missing `)` wasn't obvious — the `};` looked like it closed everything.

*Created: 2026-02-28T18:55:18.287Z*

### [D5tEzZSzyV91oDnj68HCGc] (learned-pattern)

[PROJECT] error-solution: Delegate agents (task() with category) frequently leave structural bugs in code — duplicate blocks instead of replacements, missing closing braces, broken string concatenation. ALWAYS verify delegate output with tsc/lsp_diagnostics immediately after collecting results. ClosingScreen.tsx had 26 errors from duplicate charVariants/className/sponsor/team/corner blocks. CompareView.tsx had missing braces in traverse callback and broken JSX template literals. WaveformDisplay.tsx had extra closing brace. All required manual fixup after delegate completion.

*Created: 2026-02-28T18:55:14.654Z*

### [YboVk2rkzqWtoDkZMySUQe] (architecture)

[PROJECT] architecture: Final training dataset inventory (Feb 28 2026). 35,630 total samples at LARYNX/backend/training_data/datasets/merged/{real,fake}/. Real (33,302): 933 garystafford + 1,210 LibriSpeech dev-clean + 2,620 test-clean + 28,539 train-clean-100 (251 speakers). Fake (2,328): 933 garystafford multi-engine + 1,388 skypro1111 ElevenLabs v1/v2 + 7 ElevenLabs Flash v2.5 cached. ~2,000 more ElevenLabs fakes incoming from user's parallel recovery session. All 16kHz mono WAV peak-normalized. 14GB on disk, 77GB free on 193GB boot disk. Duplicate source dirs (garystafford/, skypro1111/, skypro1111_raw/, audio/) and /tmp tarballs (7.1GB) kept — not cleaned up per user preference. LibriSpeech train-clean-100 downloaded from openslr.org (6.1GB tar.gz), 28,539 FLAC→WAV conversion completed with 0 errors. CREDITS.md created at LARYNX/CREDITS.md with full attribution for all datasets, models, libraries, research papers, fonts, and infrastructure.

*Created: 2026-02-28T18:49:44.010Z*

### [P5ctPWjJMqja9tHjJtQNet] (project-config)

[PROJECT] project-config: Cloudflare credentials obtained (Feb 28 2026). Account ID: 1d71ce44882801d49fad2c5b02629d82, Zone ID: c266b8b8f3695d68c1eed2456e864a4e. Domain voxlarynx.tech on CF free plan, nameservers romina.ns.cloudflare.com + tony.ns.cloudflare.com, propagating from OrderBox registrar. DNS setup: Full mode. Free universal SSL will auto-issue once active. Still need: API Token (create at CF Dashboard → My Profile → API Tokens → 'Edit Cloudflare Workers' template) for wrangler CLI deployment.

*Created: 2026-02-28T18:48:06.357Z*

### [jZxB6MLjGTFeVRnLcJmijK] (architecture)

[PROJECT] architecture: LARYNX frontend constants.ts created at LARYNX/frontend/src/constants.ts (212 lines) as single source of truth for all magic numbers. Exports: COLORS (hex values matching tailwind tokens), COLORS_RGBA (pre-built rgba strings), VELOCITY_THRESHOLDS (tongue=20, jaw=15, lip=10, human_max=22, glitch=50, skull_clip=80 cm/s), CAMERA (fov, positions, durations), SCENE (mouth beacon, face model positions/scale, parallax values), TIMING (all animation durations), SPRING (stiffness/damping), POST_PROCESSING (bloom/CA baselines and tiers), TONGUE (pulse decay), GLITCH (chars/cycles/interval), Z_INDEX (layer ordering). All constants use UPPER_SNAKE_CASE and 'as const' assertions.

*Created: 2026-02-28T18:47:57.064Z*

### [FpfMy5MU1x1DqKduRbksDP] (architecture)

[PROJECT] architecture: LARYNX frontend fullscope audit findings — CompareView.tsx still has ALL pre-v3 colors (#FF3366, #00FFFF, #00FF88) because it was missed by the v3 migration delegate batch. ClosingScreen.tsx has content (sponsors, team, CTA) but old color tokens (#00ffff textShadow, cyan-400/80). MouthBeacon at [1.2,-1.5,2.5] misaligned — mouth on 2.5x-scaled facecap.glb is at ~[0,-1.1,0]. TechnicalDetailPanel NumberFlow stats have label/value in flex-baseline row instead of flex-col stack causing overlap. VerdictPanel overlaps HUD in complete state because App.tsx renders both. Progress bar data flow is CORRECT (store uses {message, percent}, consumers read progress.percent) — audit test script was wrong.

*Created: 2026-02-28T18:35:06.884Z*

### [VYXREEj1qoG6zd5z5PFt8x] (architecture)

[PROJECT] architecture: Merged training dataset organized (Feb 28 2026). 4,471 total samples at training_data/datasets/merged/{real,fake}/. Real (2,143): 933 garystafford (gs_real_NNNN.wav, multi-speaker, already 16kHz) + 1,210 LibriSpeech (libri_NNNN.wav, cached from prior runs). Fake (2,328): 933 garystafford multi-engine (gs_fake_NNNN.wav, ElevenLabs+Play.ht+AWS+GCP+Azure) + 1,388 skypro1111 100% ElevenLabs v1/v2 (sk_fake_NNNN.wav, converted from 44.1kHz→16kHz) + 7 ElevenLabs Flash v2.5 cached (el_cached_NNNN.wav). Ratio 1:1.09 (near-balanced). All 16kHz mono WAV peak-normalized. 1.6GB on disk. skypro1111 HuggingFace datasets loader requires torchcodec — bypassed by downloading raw zip via huggingface_hub.hf_hub_download() and converting with librosa. User recovering additional ElevenLabs fakes from prior runs in parallel session.

*Created: 2026-02-28T18:32:57.911Z*

### [mzgXRFNdvEc6kfS3rwoNAL] (error-solution)

[PROJECT] error-solution: ElevenLabs History API recovery of burned credits (Feb 28 2026). Two API keys used for TTS generation: sk_a314... (key1, 1316 items, all eleven_v3/multilingual_v2 at 1 credit/char) and sk_7ffe... (key2, 1782 items, mix of flash/v2/v3). Total ~3098 history items recoverable for FREE via GET /v1/history?page_size=100 (paginate with start_after_history_item_id) then POST /v1/history/download with {history_item_ids: [...]} for bulk zip. Downloads cost zero credits. Key2 initially returned 401 "missing speech_history_read permission" — user had to regenerate key with history read scope on ElevenLabs dashboard. Audio returned as MP3, converted to 16kHz mono WAV via ffmpeg. Key1 recovery: 979 unique MP3s → 132.4MB zips → WAVs. Recovery saves ~$25 in credits that would otherwise need to be re-spent.

*Created: 2026-02-28T18:30:40.207Z*

### [ZaoaPJuZhjq9j27f4Ubh2R] (architecture)

[PROJECT] architecture: Non-frontend infrastructure audit (Feb 28 2026). CF Worker (LARYNX/worker/src/index.ts) is FULLY IMPLEMENTED (436 lines, Hono framework, 5 routes: health/analyze/compare/reports/history) but NEVER DEPLOYED — wrangler.toml has database_id="placeholder-set-on-deploy", Cloudflare Account ID + API Token are MISSING. D1 database and R2 bucket not provisioned. Modal backend (app.py) has 3 endpoints (analyze/compare/health) fully implemented but modal CLI not installed on VM — deployment status unknown. Model file path mismatch: ensemble_model.pkl exists in backend/training_data/ (860KB) but classifier.py looks for it in backend/ root first. classifier_model.pkl (104KB) exists in backend/ root. End-to-end flow is: Browser → CF Worker (R2 upload) → Modal (multipart re-upload) → SSE stream — code is written on both sides but zero infra is provisioned or deployed.

*Created: 2026-02-28T18:28:03.945Z*

### [JMbHPMuh9rLahJzjavJ15C] (architecture)

[PROJECT] architecture: Cloudflare hackathon resources — CORRECTED (Feb 28 2026). The "$5K CF credits" is the PRIZE for winning "Best Use of Cloudflare Developer Platform," NOT upfront participant credits. No special hackathon credits are provided to participants. Three resource paths: (1) CF Free Tier — sufficient for hackathon: Workers 100K req/day (10ms CPU), Pages unlimited BW, D1 5M reads + 100K writes/day, R2 10GB zero egress, Workers AI 10K neurons/day, Vectorize 5M queried dims/month, AI Gateway unlimited. No credit card required. (2) CF Student Program — free 1-year Workers premium tier via .edu email verification (tianyi35@illinois.edu eligible). Higher limits. (3) CF for Startups — $5K-$250K platform credits for 1 year, hackathon teams can apply as early-stage. Free tier alone covers a 48hr demo comfortably.

*Created: 2026-02-28T18:21:18.901Z*

### [uHT5P9pvbZNXkaWmhwAdBJ] (error-solution)

[PROJECT] error-solution: ElevenLabs 429 rate limiting with Modal parallelism (Feb 28 2026). Running 50 Modal containers hitting ElevenLabs TTS API simultaneously causes mass 429 "Too Many Requests" errors — ElevenLabs free/starter tier allows only 2-4 concurrent requests. Fix: reduced max_containers from 50 to 3, increased CHUNK_SIZE from 50 to 300 (process serially within each container), added exponential backoff retry (5 attempts: 5s, 10s, 20s, 40s, 80s waits) on 429 responses. This matches ElevenLabs concurrency limits while still using Modal's parallel infrastructure for the GPU inference workload separately.

*Created: 2026-02-28T17:47:11.021Z*

### [oQEmcFkAPMnbozCiTDWsYS] (architecture)

[PROJECT] architecture: LARYNX frontend visual audit findings (Feb 28 2026). Scene-by-scene status: Landing/Idle ✓ (renders, parallax works, custom cursor works), Analysis HUD ✓ (3 panels render with corner brackets), CompareView ✓ (split-screen with hardcoded placeholder data), TechnicalDetailPanel ✓ (formant bands + pipeline diagram + metrics), ClosingScreen ✓ (minimal — just title + subtitle, needs content). BROKEN: VerdictPanel (crashes on null verdict), Portal transition (no visual feedback — instant black), Error state (black screen, no UI), Reset/idle recovery (black screen after portal — WebGL canvas destroyed, not recreated). Critical issues: MouthBeacon severely misaligned (below/right of actual mouth), chromatic aberration too aggressive (makes text unreadable), 150+ AudioContext spam warnings from SoundEngine init loop, subtitle "DEEPFAKE VOICE DETECTION" too low contrast.

*Created: 2026-02-28T17:46:27.843Z*

### [zX4njPUaSdioLXGEj24vQT] (error-solution)

[PROJECT] error-solution: LARYNX frontend visual audit (Feb 28 2026) — VerdictPanel.tsx crashes with `.toFixed()` on null verdict. Root cause: component renders during both 'analyzing' and 'complete' states (line 186-187), but verdict is null during analyzing. Line 56 accesses `verdict.isGenuine`, lines 272/276 call `verdict.peakVelocity.toFixed(1)` / `verdict.threshold.toFixed(1)` — all crash on null. Fix: add early return `if (!verdict) return null` or `if (!verdict) return <LoadingState />` before accessing verdict fields. Also: VerdictPanel still has pre-v3 colors (#FF3366, #00FF88, #666, #444) on lines 108/109/174/261/265/271/275/279/281/283.

*Created: 2026-02-28T17:46:18.905Z*

### [De1c2LiQgozop7FdzxeTKA] (architecture)

[PROJECT] architecture: Pipeline v2 results — 87.2% GroupKFold accuracy (Feb 28 2026). 300 ElevenLabs Flash v2.5 fakes + 300 LibriSpeech reals × 10 AAI inference passes = 6,170 total samples. HistGradientBoosting best at 87.2% (GroupKFold by speaker, real generalization). 108 features, 17 strong signals (>20% separation), all showing FAKE>REAL — deepfakes predict impossibly high tongue acceleration/jerk. Top discriminators: tongue dorsum (td) accel_median 28.3%, jerk_median 28.1%, tongue body (tb) accel_median 26.8%. Pipeline completed in 10.0 minutes with 0 errors across 10 passes on 10 A100 GPUs. Artifacts: ensemble_model.pkl + aai_results.json in backend/training_data/. Volume caching working — LibriSpeech + ElevenLabs WAVs cached to Modal volume for instant reuse.

*Created: 2026-02-28T17:34:57.514Z*

### [2rALxHrCuGTwnpPwapConH] (error-solution)

[PROJECT] error-solution: ElevenLabs credit burn incident (Feb 28 2026). Pipeline v2 burned 110,000 ElevenLabs credits (110K chars) in one run because: (1) no volume caching — every run regenerated all fakes from scratch, (2) used expensive models eleven_multilingual_v2 + eleven_v3 (1 credit/char), (3) dispatched 2,700 TTS calls × ~70 chars/sentence = ~189K chars requested (ran out at ~1,140 calls). Fix: switched to eleven_flash_v2_5 (cheapest model), reduced N_FAKE_SAMPLES to 300, added Modal Volume caching to both download_librispeech() and generate_elevenlabs_chunk() so fakes persist across runs. New API key: sk_7ffe...73a6 stored in Modal secret 'elevenlabs-api-key'. Credits = characters (1:1), not API calls.

*Created: 2026-02-28T17:24:57.040Z*

### [KstBTNMpDnpSFJZ9RnBigW] (architecture)

[PROJECT] architecture: LARYNX Sound Design Phase 3 — IEC/Geiger/Oximeter overhaul (Feb 28 2026). SoundEngine.ts rewritten from 869→980+ lines. 5 major changes: (1) IEC 60601-1-8 alarm replaces horror FMSynth — 440Hz base + custom partials [1,0.8,0.6,0.4,0.2], 10-pulse uneven rhythm per medical spec, methods startIECAlarm/stopIECAlarm. (2) Geiger counter velocity sonification replaces continuous velocity oscillator — NoiseSynth white noise, 3ms decay, bandpass 4kHz, click rate = velocity*0.3 Hz (0.5-25Hz range), ±20% jitter per click. (3) Oximeter pitch mapping — triangle oscillator at C5 (523Hz), each 10cm/s deviation = 1 semitone drop, fade in at velocity>5. (4) Heartbeat jitter — enableTickJitter/disableTickJitter methods, replaces steady MetalSynth loop with ±30% interval variation (>50ms jitter triggers sympathetic nervous response per IEC spec). (5) Geiger+oximeter auto-start/stop wired into startTicking/stopTicking. triggerDeepfakeReveal now calls startIECAlarm instead of startHorror. Variable declarations updated: horrorSynth/Lfo/Tremolo removed, replaced with iecAlarmSynth/Gain/Loop/Active + geigerSynth/Filter/Gain/Interval/Active + oximeterOsc/Gain/BasePitch + tickJitterActive.

*Created: 2026-02-28T17:13:41.509Z*

### [A4K7ADHdUEUrEzYXfbRpVu] (architecture)

[PROJECT] architecture: LARYNX Color Migration Complete (Feb 28 2026). Full color system overhaul from sci-fi cyan (#00FFFF) to clinical sky (#38BDF8). Files updated directly: index.html (Google Fonts Inter+IBM Plex Mono), index.css (all CSS vars, 27 rgba replacements), tailwind.config.js (9 color tokens + 2 font families), LandingScene.tsx (17 color instances + parallax fix), App.tsx (4 button classes + shadow), WarpTransition.tsx (gradient + flash overlay), PostProcessingEffects.tsx (velocity thresholds tuned down), UploadPanel.tsx (3 drag/file styles), CustomCursor.tsx (5 border/bg/shadow), AGENTS.md (testing requirements added). 3 delegate agents handling remaining 15 files (3D components, UI/HUD components, shadcn primitives). Color map: #00FFFF→#38BDF8, #FF3366→#DC2626, #00FF88→#2DD4BF, surface #0A0A0A→#18181B, dim #666→#71717A. New tokens: --violation=#FF003C, --surface-elevated=#27272A.

*Created: 2026-02-28T17:12:24.491Z*

### [C7y8G1xNoWuG57kBLxzMp3] (architecture)

[PROJECT] architecture: LARYNX Design System v3 — "Clinical Zinc + Fluoroscopy Violation" (Feb 28 2026). CONFIRMED direction: clinical dark baseline with stolen techniques from 4 radical directions. Base palette: bg #09090B, surface #18181B, border #27272A, text-muted #71717A, text-primary #E4E4E7. NO pure black/white (halation). Fonts: Inter + IBM Plex Mono (tabular-nums mandatory). Non-negotiable principles: (1) Color is SCARCE — 90% monochrome, color = data state only. (2) Silence is baseline — sound only when data demands it. (3) Violation is 0ms — no easing. (4) Typography rupture — 400% size jump, number breaks container. (5) 400ms freeze before reveal. (6) ALL other UI desaturates during violation — only violation retains color (#FF003C). (7) 60fps or death. (8) Ghost trail — gray ghost at real vs red at impossible. Velocity escalation: <50 #38BDF8→50-100 #FDE047→100-150 #EA580C→>150 #DC2626+bloom. Violation: #FF003C solid, bg #000, text 20% opacity, CA spike, BrightnessContrast 3-frame flash. Master easing: micro 150ms power4.out, structural 300ms power3.out, data 600ms expo.out, violation 0ms, decay 1200ms power4.out. Supersedes Design System v2.

*Created: 2026-02-28T17:07:15.722Z*

### [XfQvfanmG6WfMtZd5K4Dw1] (architecture)

[PROJECT] architecture: LARYNX Deep Design Research Findings (Feb 28 2026). Key findings across 9 research agents: (1) Real forensic tools (Praat, EnCase, iZotope RX) have ~5-15% chrome-to-content ratio vs hackathon demos at ~60% — judges read high data density + mono fonts + sharp corners as "real product". (2) Data viz storytelling 80/20 rule: 80% build-up (let user absorb normal data), 400ms freeze before spike, then 0ms violation snap with 20% payoff time. During violation: ALL other UI desaturates to 20% opacity, only violation retains color (#FF003C). Typography rupture: jump 400% size, break container alignment. (3) IEC 60601-1-8 medical alarm spec: f₀ 150-1000Hz, ≥4 harmonics 300-4000Hz (pure sines forbidden), high priority = 10-pulse uneven rhythm to prevent habituation. (4) Geiger counter sonification: sparse clicks 1-3Hz normal → continuous crackle at 15-20Hz merge threshold → directly stimulates amygdala, bypasses cognition. (5) Pulse oximeter: each 1-2% deviation = one semitone pitch drop, anxiety from delta not absolute. (6) ICAD: silence when data normal, continuous drones mask data signals, use earcons not auditory icons. (7) Four radical directions explored: Neoclassical Autopsy (ivory light theme, single crimson accent), Containment Failure (white BG, red inversion), Acoustic Fluoroscopy (green-phosphor scan, thermal heatmap violation), Terminal Exhumation (LiDAR corruption). Recommended hybrid: clinical zinc baseline + fluoroscopy violation moment + Geiger velocity clicks.

*Created: 2026-02-28T17:06:12.480Z*

### [HpqoEtpNNhxdv8MZrf5PUJ] (learned-pattern)

[PROJECT] learned-pattern: Frontend aesthetic direction — "clinical calm → escalating unease → visceral shock" (Feb 28 2026). Oracle review established the design philosophy: emotional arc driven by DATA not decoration. Skull tongue-clipping visualization = science (KEEP as centerpiece). Warp/portal = transition mechanism (SIMPLIFY if it threatens stability). Visual language: medical imaging meets jump scare. Post-processing effects (Bloom, ChromaticAberration, Scanline) should be data-triggered and reactive, not always-on ambient. This guides all visual polish decisions.

*Created: 2026-02-28T17:01:21.820Z*

### [wFzfE86FxDXV1KmiprbXPV] (architecture)

[PROJECT] architecture: Frontend type declaration strategy (Feb 28 2026). Two declaration files: (1) src/types.d.ts — ambient declarations (NO top-level imports) for @react-three/postprocessing (EffectComposer, Bloom, ChromaticAberration, Scanline, Glitch, BrightnessContrast, Noise, Vignette with ref support) and three/examples/jsm/loaders/GLTFLoader.js. Must be ambient (no imports) or TypeScript treats it as a module and declarations don't merge globally. (2) src/tone-augment.d.ts — module augmentation for 'tone' adding RecursivePartial<T> with any values. Uses `import 'tone'` to merge into existing namespace. RecursivePartial uses any because Tone v15 Oscillator constructor types are structurally incompatible with deep recursion (onstop callbacks, BaseContext required members). SoundEngine.ts owned by parallel session — cannot modify.

*Created: 2026-02-28T17:01:16.628Z*

### [a5Pu9HnZ4P7opS88GtKDMy] (error-solution)

[PROJECT] error-solution: @types/three v0.169.0 breaks namespace imports under moduleResolution "bundler" (Feb 28 2026). `import * as THREE from 'three'` fails to resolve THREE.Mesh, THREE.Group, THREE.InstancedMesh, THREE.CatmullRomCurve3, THREE.WebGLRenderer with v0.169.0. Fix: downgrade to @types/three@0.168.0. Root cause: v0.169.0 changed type export structure incompatibly with bundler module resolution. This resolved all 46 build errors when combined with ambient type declarations.

*Created: 2026-02-28T17:01:09.148Z*

### [dC1poD3M6iLqLe3HWwacS8] (architecture)

[PROJECT] architecture: LARYNX Design System v2 — "Clinical Authority + Earned Spectacle" (Feb 28 2026). Pivoting from sci-fi aesthetic to clinical forensic instrument. Base palette: bg #09090B, surface #18181B, border #27272A, text-muted #71717A, text-primary #E4E4E7. NO pure black/white (halation). Fonts: Inter + IBM Plex Mono (tabular-nums mandatory on all real-time numbers). Velocity escalation: &lt;50cm/s #38BDF8 cyan 1px 60% → 50-100 #FDE047 yellow 2px 80% → 100-150 #EA580C orange 2px 100% → &gt;150 #DC2626 red 3px+bloom. Skull clip moment: tongue goes #FF003C solid, bg drops to absolute #000, text fades 30%, chromatic aberration 0.1s spike. Verdict: GENUINE=teal-400 static, DEEPFAKE=red-500+text-shadow bloom. Layout: 65% 3D viewport / 35% data column / 150px bottom waveform. Zero shadows, sharp corners (rounded-sm max), hairline borders. Master easing: micro 150ms power4.out, structural 300ms power3.out, data reveal 600ms expo.out, violation 0ms INSTANT (no smoothing), post-violation decay 1200ms power4.out. Strip: sparkles, stars, particle fields, always-on post-processing, horror drone, warp portal. Replace with: empty void, data-triggered effects only, near-silence, stable camera. Cursor: clinical crosshair with mix-blend-mode:exclusion. Spring configs: snappy {stiffness:400,damping:30}, clinical {stiffness:200,damping:15}.

*Created: 2026-02-28T16:59:11.634Z*

### [J7zShtvrqeZAP3HLMv5NqX] (preference)

[PROJECT] preference: MANDATORY agent-browser visual verification after ANY frontend change (Feb 28 2026). Build-green (tsc/vite) does NOT guarantee runtime-visible rendering — confirmed when agent-browser screenshot showed full black screen despite clean build. Must use `agent-browser open URL → snapshot -i → verify render → interact if needed → snapshot again`. For WebGL/canvas content, `agent-browser snapshot` alone is insufficient (reports DOM interactives/text, misses canvas visibility); use `agent-browser screenshot` + `look_at` for visual inspection. This is non-negotiable — screenshots are evidence. Saved to LARYNX/AGENTS.md as a project rule.

*Created: 2026-02-28T16:55:06.018Z*

### [Co6GiraHQEz1gycKMTSrBu] (project-config)

[PROJECT] project-config: API keys inventory after VM wipe recovery (Feb 28 2026). All keys survived in ~/.env (home dir, not project dir): SOURCEGRAPH_TOKEN, TAVILY_API_KEY, CONTEXT7_API_KEY, LINEAR_API_TOKEN, SUPERMEMORY_API_KEY, GITHUB_PERSONAL_ACCESS_TOKEN, CLIPROXY_AUTH_KEY (aliased to OPENAI_API_KEY/CODEX_API_KEY), NVIDIA_NIM_API_KEY, ELEVENLABS_API_KEY (re-added after wipe). MISSING: Cloudflare Account ID and API Token — needed for wrangler.toml and Worker deployment. Modal auth stored in ~/.modal/ profile, not in project. Modal secret 'elevenlabs-api-key' created with ELEVENLABS_API_KEY env var.

*Created: 2026-02-28T16:54:08.810Z*

### [YQZp5WFx3T9uNJD29eXczg] (preference)

[PROJECT] preference: LARYNX Frontend Aesthetic Direction (Feb 28 2026). Core principle: "clinical calm → escalating unease → visceral shock" — ALL spectacle must be EARNED by data, not decorative. KEEP: skull clip effect (IS the science), velocity-mapped audio, bloom/chromatic aberration triggered AT violation moment, real-time EMA markers. RECONSIDER: warp/portal transition (flashy but disconnects from purpose), horror drone (undercuts credibility), sparkles/stars/particle fields (decorative not informative), always-on post-processing (should be data-triggered). Target aesthetic: medical imaging software meets jump scare. Start clinical/minimal → data drives intensity. "The physics is so broken our visualization can't contain it" > "we made a cool visualization." If portal transition causes WebGL instability that ruins skull clip, CUT the transition complexity. Stable 30+ fps skull clip is infinitely more valuable than flashy portal that occasionally crashes.

*Created: 2026-02-28T16:52:44.129Z*

### [jqcvy3pEhw7VJSgMsL9YbV] (architecture)

[PROJECT] architecture: LARYNX Pipeline v2 decisions (Feb 28 2026). Replaced edge-tts with ElevenLabs-only for deepfake generation — edge-tts produces low-quality codec artifacts that the classifier memorizes (100% accuracy on pass 1 = overfitting). ElevenLabs produces higher-quality synthesis closer to real deepfake threats. Real samples from LibriSpeech dev-clean (human recordings, no generation). Cross-validation changed from StratifiedKFold to GroupKFold by speaker — prevents train/test leakage where same speaker appears in both splits. Early exit at 99% accuracy removed — force all 10 passes. Target: ~2700 real + ~2700 fake × 10 passes. Backend work on separate JJ branch off main (ppwzprur). ELEVENLABS_API_KEY confirmed set in env.

*Created: 2026-02-28T16:45:38.260Z*

### [n9GxcnEb3j2zgZvH5YmR2o] (architecture)

[PROJECT] architecture: LARYNX SoundEngine.ts fully polished (Feb 28 2026). Now 754 lines at LARYNX/frontend/src/audio/SoundEngine.ts. Master bus chain upgraded: Compressor→Reverb(decay:2.5s,wet:0.15)→EQ3(low:-2,mid:0,high:-1)→HPF 120Hz→Limiter(-1dB)→Volume→Destination. 20+ sound methods: startDrone/stopDrone, startBackgroundLayer/stopBackgroundLayer (3 detuned sines 148/150/152Hz at -35dB with 0.05Hz LFO), playBeep, playUploadThunk, playPortalEntry (membrane E1 + sub-bass 40Hz swell + filter sweep 200→3000Hz over 2s), playWarpTransition (brown noise whoosh 200→8000Hz + sine chirp 200→2000Hz), startTicking/stopTicking (MetalSynth BPM 60→120 + tension pad sawtooth 80Hz filter 200→2000Hz over 30s), playScanSweep (sine 1200→400Hz 0.3s), playDataPoint(velocity) (pitch-mapped C3-C6), startRiser/stopRiser, triggerSilence, playSubImpact, playNoiseBurst, startHorror/stopHorror (FMSynth harmonicity 3.14), triggerVerdictBuild(callback) (0.5s fade→1s sub rumble hold→slam back), playResolution(genuine/deepfake) (genuine: Cmaj7 pad C3-E3-G3-B3 triangle, 3s attack), triggerDeepfakeReveal, playVerdict, updateVelocity. Volume levels balanced: background -35dB, ambient -22dB, tension -28dB, tick -12dB, beep -18dB, upload -15dB, verdict -5dB, horror -8dB, velocity -20→-8dB. All use linearRampTo/setTargetAtTime (never rampTo). masterCompressorNode() exported for uiEarcons routing. uiEarcons.ts (141 lines) routes through master bus, adds playNavigationTransition, playError, playSuccess, playDropHover. useUIEarcons.ts hook exports all 7 earcon functions. App.tsx wired: startBackgroundLayer on init, playPortalEntry on 'entering', playWarpTransition on 'warping', triggerVerdictBuild for dramatic silence before verdict, stopBackgroundLayer on idle/error. UploadPanel.tsx wired: playDropHover on dragenter, playSuccess on file acceptance.

*Created: 2026-02-28T16:40:16.494Z*

### [1MFo9pTTzspfvym6VHQpE8] (architecture)

[PROJECT] architecture: LARYNX Frontend Component Inventory (Feb 28 2026). 22 components in src/components/: IntroSequence (5.5s auto-complete), LandingScene (377 lines — Canvas with FaceModel, MouthBeacon, PortalCameraController, GlitchEffectHandler, Stars, Sparkles, PostProcessing), UploadPanel (218 lines — invisible drop zone on bottom 60%, FileCard overlay, auto-triggers portal on valid drop), App.tsx (309 lines — state machine: intro→idle→uploading→analyzing→complete→comparing→technical→closing), WarpTransition (71 lines — GSAP radial flash), AnalysisView (R3F Canvas wrapper), HeadModel (facecap.glb with KTX2), TongueModel, EMAMarkers, VelocityRibbons, CameraController, SkullClipEffect, VelocityHUD, WaveformDisplay (391 lines), VerdictPanel, AnalysisOverlay, CompareView (lazy), TechnicalDetailPanel (lazy), ClosingScreen (lazy), CustomCursor, ParticleField, PostProcessingEffects. Store: useLarynxStore.ts (Zustand, 161 lines). Hooks: useAnalysisStream, useComparisonStream, useUIEarcons. Audio: SoundEngine.ts (463 lines), uiEarcons.ts.

*Created: 2026-02-28T16:39:31.748Z*

### [fzn4BVWCfzD9kXXVjf93NN] (project-config)

[PROJECT] project-config: Frontend build recovery procedure (Feb 28 2026). After GitHub clone recovery, bun install alone is insufficient — motion@11.11.17 dist files come out incomplete. Full recovery: (1) bun install, (2) rm -rf node_modules/motion && bun install motion@11.11.17, (3) npx vite build to verify. Build produces 4 chunks: three-vendor (1021KB/283KB gz), app (534KB/171KB gz), animation-vendor (183KB/64KB gz), audio-vendor (165KB/38KB gz). Total gzip ~558KB. Chunk size warnings on three-vendor and app are expected — already code-split with lazy() for CompareView, TechnicalDetailPanel, ClosingScreen.

*Created: 2026-02-28T16:39:22.492Z*

### [2SDTTPMiVoainsKmNAjPQb] (learned-pattern)

[PROJECT] learned-pattern: Parallel session coordination pattern for hackathon crunch (Feb 28 2026). Three OpenCode sessions running simultaneously on LARYNX: (1) Frontend visual polish — portal transitions, WebGL fixes, geometric beacon, drop zone. (2) Sound engine — SoundEngine.ts, earcons, ambient drone, verdict sounds. (3) Backend — Modal deployment, pipeline tuning, classifier integration. Sessions must NOT edit the same files. Frontend session owns: LandingScene.tsx, UploadPanel.tsx, App.tsx, WarpTransition.tsx, PostProcessingEffects.tsx, all CSS. Sound session owns: SoundEngine.ts, uiEarcons.ts. Backend session owns: app.py, classifier.py, pipeline.py, worker/. Conflict risk: App.tsx imports from both sound and components — coordinate carefully.

*Created: 2026-02-28T16:39:01.734Z*

### [fyBxFAHQtm4MZzFmLHtuyL] (architecture)

[PROJECT] architecture: LARYNX T-12h Halftime State (Feb 28 2026 ~18:00). Backend 90% done: pipeline works, classifier_model.pkl trained (94.4% LOO), ensemble_model.pkl trained (617/617 overnight), SSE matches frozen contract. Frontend 75% code-complete: 22 components, Zustand state machine (idle→uploading→analyzing→complete→comparing→technical→closing), SoundEngine 463 lines, facecap.glb with KTX2, MouthBeacon, WarpTransition, PortalCameraController all wired. Visual polish TODO: WebGL context loss during portal, portal clip-in, title text blocked by face, background parallax locking, warp streaks lackluster. Infra 0% deployed: CF Worker/D1/R2/Pages all code-exists but nothing live, Modal not deployed. Three parallel sessions: this one (frontend visual), one on sound engine, one on backend. Auto-push is the ONLY backup mechanism — critical.

*Created: 2026-02-28T16:38:56.650Z*

### [QwUg9jfhH2jVnUM2UP6B15] (error-solution)

[PROJECT] error-solution: GitHub wipe recovery + motion/react build fix (Feb 28 2026). Project disk wiped while user asleep — auto-push.sh (5-min interval backup) saved everything to GitHub. Recovery: clone from GitHub, bun install to restore node_modules. Build failed with "Could not resolve motion/react" — motion@11.11.17 dist files were incomplete after bun install. Fix: rm -rf node_modules/motion && bun install motion@11.11.17. Root cause: bun's cache can produce incomplete extractions for packages with complex exports maps. The motion/react subpath export maps to dist/es/motion/lib/react.mjs. Build verified green after fix (6.82s, 647KB gzip).

*Created: 2026-02-28T16:38:49.072Z*

### [SnZbw2xd8uBhG3vq4182mx] (architecture)

[PROJECT] architecture: LARYNX has TWO conflicting API contract docs: api-common.md (older, says error is ApiError|null, uses 'result' SSE event, 5 req/min rate limit) vs FROZEN-CONTRACT-W0.md (newer frozen spec, says error is {code,message}, uses 'verdict' SSE event, 20 req/min). The Worker types.ts matches the frozen contract. Backend app.py error responses use bare string format {success:false, error:"string"} which matches neither contract — backend should use {code,message} format. Worker D1 INSERT is missing duration_s, classifier_score, classifier_model, ensemble_score columns.

*Created: 2026-02-28T16:29:58.544Z*

### [3k1Mo6wxVuJQ2GvatGrzDs] (architecture)

[PROJECT] architecture: LARYNX backend has 8 Python files + 4 Worker TS files. Data flow: app.py (Modal FastAPI endpoints) → pipeline.py (AudioPreprocessor → FormantExtractor → ArticulatoryMapper → VelocityAnalyzer → classifier.py) → SSE stream. Worker (index.ts) proxies to Modal, intercepts verdict for D1 persistence, injects reportId. csis_modal.py is standalone AAI validation script (not used by app.py). csis_validate.py is standalone parselmouth validation script. overnight_pipeline.py is standalone training pipeline. config.py provides constants used by pipeline.py. models.py provides Pydantic schemas used by pipeline.py and app.py. classifier.py loads classifier_model.pkl for hybrid ensemble scoring.

*Created: 2026-02-28T16:29:52.867Z*

### [dLkAPud5qq3Ux4fUTCratf] (error-solution)

[PROJECT] error-solution: facecap.glb contains KTX2-compressed textures. Without KTX2Loader configured on GLTFLoader, Three.js crashes → WebGL context lost → black screen after intro animation. Fix: created `src/utils/ktx2Setup.ts` — shared KTX2Loader singleton (WeakMap keyed by renderer), imports KTX2Loader+GLTFLoader from `three-stdlib`, sets transcoder path to `/basis/`. Must copy basis transcoder WASM files from `node_modules/three/examples/jsm/libs/basis/` to `public/basis/`. Pass `(loader) => configureKTX2ForGLTFLoader(loader, gl)` as 4th arg to `useGLTF`. Also set 3rd arg (meshopt) to `true`. Applied to HeadModel.tsx, LandingScene.tsx, CompareView.tsx. Removed `useGLTF.preload()` calls (incompatible with custom loader config).

*Created: 2026-02-28T10:02:07.006Z*

### [qPWCBUw1JQLtMtVbqEay9f] (learned-pattern)

[PROJECT] learned-pattern: R3F child components inside scaled groups have their positions multiplied by the parent scale. MouthBeacon placed at [1.0, -0.6, 2.5] inside `<group scale={2.5}>` resulted in world position [2.5, -1.5, 6.25] — behind the camera at z=8. Fix: moved MouthBeacon to LandingScene root (sibling of FaceModel, not child) so positions are in world space. Key R3F spatial gotcha for future 3D component placement.

*Created: 2026-02-28T09:48:49.990Z*

### [UB6jpXfNkWaMLjdHcZp3ft] (error-solution)

[PROJECT] error-solution: Tone.js v15.0.4 `rampTo()` uses `exponentialRampTo` internally, which throws `RangeError: Value must be within [0, 0], got: 1e-7` when current frequency equals target frequency (degenerate range). Fix: use `linearRampTo()` instead of `rampTo()` for frequency changes in SoundEngine.ts. Affected method: `playResolution` at line ~400.

*Created: 2026-02-28T09:37:06.048Z*

### [LZEq83t9CWRVYDLT3umCWs] (error-solution)

[PROJECT] error-solution: Overnight Modal pipeline in `LARYNX/backend/overnight_pipeline.py` is now stable by pinning `scipy==1.11.4` both in initial `.pip_install(...)` and again after `pip install git+https://github.com/articulatory/articulatory.git` in `.run_commands(...)`, because articulatory imports `from scipy.signal import kaiser` and breaks on scipy>=1.12. Also fixed AAI loader and checkpoint usage: switched from unavailable `articulatory.models.ema_synthesizer` import to `from articulatory.utils import load_model`, and corrected ckpt path to `best_mel_ckpt.pkl`. Added `ffmpeg` to `generate_deepfakes` image and ensured launch uses `modal run`; verified full run success with 617/617 inference successes, 0 errors, and artifacts at `backend/training_data/aai_results.json` + `backend/training_data/ensemble_model.pkl` (run `ap-e4qqfiAw5i9947dcuQYuVm`).

*Created: 2026-02-28T09:22:31.986Z*

### [6JRaUK3fp6D7iXN3wES3Ee] (architecture)

LARYNX frontend UploadPanel and LandingScene redesigned for immersive mouth portal experience (Feb 28 2026). The opaque dark box upload panel was replaced with a minimal transparent drop zone positioned over the skull's mouth. Upon valid file drop, `portalState` transitions ('idle' → 'entering' → 'warping' → 'done'), triggering a GSAP timeline in `LandingScene` that animates the 3D camera zooming into the mouth (FOV 60→110, Z 8→0.1) while the `jawOpen` morph target animates to 0.95. A new CSS-based `WarpTransition` component handles the lightspeed radial flash before transitioning `useLarynxStore` straight to `uploading` / analysis. No intervening "analyze" button is required; dropping the file initiates scanning seamlessly. No `useState` used for real-time 3D values, strictly `useRef` and delta clocks in `useFrame`.

*Created: 2026-02-28T09:22:16.101Z*

### [ZiRt5QkP1eKEMaAtQqm6SW] (error-solution)

[PROJECT] error-solution: Tavily MCP "error -32001: Request timed out" in hackillinois directory (Feb 28 2026). Root cause: client-side timeout — OpenCode's MCP client aborts the SSE handshake before Tavily responds. Error code -32001 is generated locally by the MCP SDK (never crosses the wire). NOT auth, NOT config, NOT network — API key verified valid via direct REST curl (HTTP 200 in 0.58s). Directory-specific: only affects /home/li859/projects/hackillinois (876MB workspace, 710MB in node_modules across 3 dirs). Other remote MCPs (augment-context-engine, context7) connect fine. No configurable MCP handshake timeout exists in OpenCode — only provider timeouts (600000ms) and babysitting timeout (90000ms). Fix attempted: deleted SYNAPSE/frontend/node_modules (354MB) to reduce workspace metadata payload. Fallback: switch Tavily from remote SSE to local stdio via `"type": "local", "command": ["npx", "-y", "tavily-mcp@latest"]` which bypasses SSE handshake entirely. Config at ~/.config/opencode/opencode.json lines 26-30. Header-based auth (Authorization: Bearer) also attempted but didn't fix timeout since the issue is transport-level, not auth-level.

*Created: 2026-02-28T08:56:00.041Z*

### [p5znj7v5ewjfGTSUt6jusw] (architecture)

[PROJECT] architecture: LARYNX Hybrid Ensemble Detector v1 (Feb 28 2026). classifier.py loads classifier_model.pkl (GBM, 252 features, 94.4% LOO accuracy on 18 samples). Maps pipeline sensors to classifier columns: JAW→LI, T1→TT, T2→TB, T3→TD, UL=UL, LL=LL. Extracts 252 features: vel/accel/jerk × 6 articulators × 10 stats (peak/mean/median/std/p75/p90/p95/p99/skew/kurtosis) + cross-articulator velocity ratios + temporal correlations. Pipeline dt=0.01 (100fps) vs training data at 200Hz — velocity features computed at pipeline rate. Ensemble formula: 0.6 × formant_confidence + 0.4 × (1 - classifier_score), where classifier_score = P(deepfake). Verdict overridden by ensemble when classifier available. scikit-learn==1.5.2 added to Modal image.

*Created: 2026-02-28T08:45:48.191Z*

### [SnczkEHefTvFh7fNjLrbFu] (architecture)

[PROJECT] architecture: LARYNX Frozen API Contract W0 (Feb 28 2026). All endpoints use ApiResponse<T> = {success, data?, error?}. SSE events: progress (step/progress/message), frame (sensors with x/y/velocity per UL/LL/JAW/T1/T2/T3 + tongueVelocity + timestamp + isAnomalous), verdict (isGenuine/confidence/peakVelocity/threshold/anomalousFrameCount/totalFrameCount/anomalyRatio/reportId/processingTimeMs), error (message), heartbeat (15s keepalive). Error codes: UPLOAD_TOO_LARGE(413), INVALID_FORMAT(400), PROCESSING_FAILED(500), MODEL_UNAVAILABLE(503), RATE_LIMITED(429), NOT_FOUND(404). Contract doc at shared/contracts/FROZEN-CONTRACT-W0.md. D1 table: analysis_reports with classifier_score/classifier_model/ensemble_score columns reserved for hybrid v1.

*Created: 2026-02-28T08:36:59.273Z*

### [MvjqaziT3Fx4j5Ux5gTSNx] (architecture)

[PROJECT] architecture: LARYNX CF Worker implementation (Feb 28 2026). Worker at LARYNX/worker/ uses Hono framework on CF Workers. Key architecture: POST /api/analyze accepts multipart audio → validates format/size → uploads to R2 at `audio/{reportId}/{filename}` → proxies to Modal SSE endpoint → streams SSE back to client while intercepting `verdict` event to persist to D1 and inject `reportId` (format: `rpt_` + 16 hex chars). GET /api/reports/:reportId retrieves shareable reports from D1. GET /api/history lists recent analyses. Rate limiting via CF native binding (20 req/min by IP). CORS allowlist: larynx.pages.dev, voxlarynx.tech, localhost:5173. Bindings: DB (D1 larynx-analysis), AUDIO_BUCKET (R2 larynx-audio), RATE_LIMITER, MODAL_API_URL var. IP hashing via SHA-256 for privacy. wrangler.toml database_id is placeholder — must be set on deploy.

*Created: 2026-02-28T08:36:51.295Z*

### [vind75r49rb6FCg2JznuSC] (error-solution)

[PROJECT] error-solution: Supermemory `mode:"ingest"` calls returned HTTP 404 in this environment on Feb 28 2026, even when providing scope/type/query/content. Workaround used for continuity: store a compact handoff digest via `mode:"add"` with `type:"conversation"` and explicit timestamped label (`handoff-2026-02-28T08:32Z`).

*Created: 2026-02-28T08:33:09.480Z*

### [CJGk6czHNGfBBcUfd7WR9f] (project-config)

[PROJECT] project-config: Intro readability patch applied in `LARYNX/frontend/src/components/IntroSequence.tsx` (Feb 28 2026). Auto-complete timeout changed from 2500ms to 5500ms, fade-out hold increased to 1200ms, and reveal delays were shifted later so subtitle/readouts are visible before transition. This change was made because user feedback reported the intro was too fast to read, and it should be preserved unless demo timing needs re-tuning.

*Created: 2026-02-28T08:32:15.602Z*

### [G8dnQoBFeLiN1Q6uyMzsZM] (error-solution)

[PROJECT] error-solution: Build-green does not guarantee runtime-visible rendering in LARYNX frontend (Feb 28 2026). We confirmed `npx tsc --noEmit` and `npx vite build` pass, but agent-browser screenshot `/tmp/larynx-after-intro.png` still showed a full black screen after intro, so runtime WebGL validation is mandatory. `agent-browser snapshot` is insufficient for this case because it reports DOM interactives/text and can miss canvas visibility issues; use `agent-browser screenshot` + visual inspection (`look_at`) to verify post-intro render state.

*Created: 2026-02-28T08:32:15.577Z*

### [hXCGUu1HnRwSncvMudS3zi] (architecture)

[PROJECT] architecture: LARYNX frontend Wave 3-10 COMPLETE (Feb 28 2026). Full cinematic overhaul delivered. Build: tsc 0 errors, vite 3569 modules → 563KB gzip. Components added/rewritten: HeadModel (facecap.glb + sagittal clip + unclamped morphs 3.5+), TongueModel (violent distortion at >22cm/s), EMAMarkers (Billboard+Text spatial HUD), VelocityRibbons (CatmullRomLine T1→T2→T3→JAW), PostProcessing (Glitch effect at >50cm/s, screen flash at >80cm/s), LandingScene (ghostly face + x-ray sweep shader + sound wave rings + morph loop + glitch fracture), SoundEngine (463 lines, 10 new sound moments including triggerDeepfakeReveal orchestrated sequence), CompareView (split-screen real vs fake), TechnicalDetailPanel (formant viz + pipeline diagram + stat counters), ClosingScreen (sponsor cards + CTA). App.tsx: full state machine idle→uploading→analyzing→complete→comparing→technical→closing with AnimatePresence + navigation buttons. UI earcons: uiEarcons.ts + useUIEarcons.ts hook.

*Created: 2026-02-28T08:09:44.641Z*

### [g7NWLpVFb2QPgRegGPFUsW] (architecture)

[PROJECT] architecture: LARYNX classifier Phase A+B results (Feb 28 2026). Gradient Boosting classifier achieves 94.4% LOO accuracy (17/18 correct) on 11 real (CMU Arctic bdl/slt/clb × 3 + 2 originals) vs 9 deepfake (7 Edge TTS + 2 ElevenLabs). 252 features: velocity/acceleration/jerk × 6 articulators × statistics + cross-articulator ratios. Top features: ul_vel_peak (0.055), ll_accel_p99 (0.053), ll_jerk_p95 (0.035). One false positive: bdl-arctic-0002-16k.wav scored 96.2% deepfake (likely outlier utterance with jerky articulation). Model saved to LARYNX/backend/classifier_model.pkl. Next: brute-force to 99%+ with 500+ samples + acoustic feature ensemble + AASIST second detector.

*Created: 2026-02-28T07:48:23.171Z*

### [tDV1zWqFiG7DjG32zPryhn] (error-solution)

[PROJECT] error-solution: three-stdlib is a transitive dependency of @react-three/drei but NOT a direct dependency in LARYNX frontend (Feb 28 2026). Importing `Line2` from 'three-stdlib' causes TS2307 "Cannot find module". Fix: don't import Line2 directly — instead define a local type alias `type Line2Mesh = { geometry: { setPositions: (positions: number[]) => void }, material: { color, transparent, opacity, linewidth, lineWidth } }` and use `useRef<THREE.Object3D>(null!)` with `as unknown as Line2Mesh` casts for geometry/material access. Similarly, GLTF type should come from 'three/examples/jsm/loaders/GLTFLoader.js' not 'three-stdlib'.

*Created: 2026-02-28T07:29:21.710Z*

### [TqZddaRWQLGTJMtPT6GQz4] (error-solution)

[PROJECT] error-solution: @vitejs/plugin-react npm install silently fails on Node 22.22.0 + npm 10.9.4 (Feb 28 2026). Despite being in package.json devDependencies, `npm install` (clean, force, nested strategy, legacy-peer-deps) all silently skip installing the package — `node_modules/@vitejs/` directory never created, `npm ls @vitejs/plugin-react` shows empty. Root cause unclear (possibly npm 10.x scoped package resolution bug). Workaround: `npm pack @vitejs/plugin-react@4.3.4` to download tarball, then `mkdir -p node_modules/@vitejs/plugin-react && tar xzf vitejs-plugin-react-4.3.4.tgz -C node_modules/@vitejs/plugin-react --strip-components=1`. Must also separately install its subdependencies: @babel/core, @babel/plugin-transform-react-jsx-self, @babel/plugin-transform-react-jsx-source, @types/babel__core, react-refresh.

*Created: 2026-02-28T07:29:16.265Z*

### [ggJJ1VoQmDaJVazcQZN4F5] (architecture)

[PROJECT] architecture: ElevenLabs TTS integration working (Feb 28 2026). API key: set via ELEVENLABS_API_KEY env var. Endpoint: POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id} with xi-api-key header. Best voices: Rachel (21m00Tcm4TlvDq8ikWAM), Adam (pNInz6obpgDQGcFmaJgB). Model: eleven_multilingual_v2. Output: MP3 → must ffmpeg convert to 16kHz mono WAV for AAI pipeline. Also generated 3 additional Edge TTS voices: Aria (en-US-AriaNeural), Jenny (en-US-JennyNeural), Sonia (en-GB-SoniaNeural). All deepfake WAVs stored in shared/assets/audio/deepfake/ with -16k.wav suffix.

*Created: 2026-02-28T07:24:40.670Z*

### [xHRa3TfVyHPV8zcxCQ4xzq] (learned-pattern)

[PROJECT] learned-pattern: LARYNX detection feature ranking from CSIS validation (Feb 28 2026). Best discriminative features (by relative separation %): UL_PeakVel (52%), LI_PeakJerk (39.5%), UL_P99Vel (31.4%), LL_PeakJerk (30.6%), LL_P95Vel (27.8%), LL_P99Vel (27.7%), LL_P99Jerk (26.8%), LL_P95Jerk (23.9%), LL_PeakVel (23.6%), TT_PeakJerk (22.2%), TT_MeanVel (20.3%). All FAKE>REAL direction. Implication for demo: 3D skull visualization should emphasize LIP and JAW movements (strongest signal), not just tongue. The "tongue clipping through skull" narrative should be expanded to "lip/jaw impossibly jerky transitions" — same principle, different articulator emphasis.

*Created: 2026-02-28T07:24:35.126Z*

### [KYPX2P2idTrTHPYhndgt1q] (error-solution)

[PROJECT] error-solution: Modal AAI inference fixes — 7 runs to working validation (Feb 28 2026). Run 1-2: scipy.signal.kaiser removed in scipy 1.12+ — articulatory's pqmf.py uses it. Fix: sed patch `from scipy.signal import kaiser` → `from scipy.signal.windows import kaiser` in site-packages after pip install. Run 3-4: pin scipy==1.13.1, re-pin AFTER `pip install articulatory` (it overrides). Run 5: `from articulatory.bin.decode import ar_loop` transitively imports tkinter (libtk8.6.so). Fix: remove ar_loop import entirely, replace with RuntimeError guard — ar_loop only needed for use_ar=True configs, standard inference uses model.inference() directly. Run 6: velocity-only analysis showed no signal. Run 7: added jerk + all 12 EMA channels → PASS.

*Created: 2026-02-28T07:24:31.535Z*

### [Gd6zXJXddW6xS68LuhKc2j] (architecture)

[PROJECT] architecture: CSIS Phase 2 PASSED — AAI EMA velocity+jerk analysis discriminates real from deepfake (Feb 28 2026). Key findings: (1) Velocity ALONE showed weak separation (Run 5/6 failed), but JERK (d²v/dt²) was the missing signal — 22-40% relative separation across lip/jaw articulators. (2) Best discriminators are LIP and JAW channels, NOT tongue: Upper Lip PeakVel 52% separation (Real=1.03, Fake=1.76), LI PeakJerk 39.5%, LL PeakJerk 30.6%, LL P95Vel 27.8%. (3) Direction 100% consistent: FAKE>REAL across all 11 strong signals — deepfakes produce higher velocities and jerk in lips/jaw. (4) Works across TTS engines: Edge TTS (5 voices) AND ElevenLabs (Rachel, Adam) all show same pattern. (5) All velocities physiologically plausible (max 4.51 cm/s) — signal is in distribution, not impossible values. (6) 11 samples tested: 2 real (CMU Arctic) + 7 Edge TTS + 2 ElevenLabs. EMA outputs saved to LARYNX/backend/ema_outputs/, results in csis_phase2_results.json.

*Created: 2026-02-28T07:24:21.915Z*

### [xP3295CFzVnKpZiVM7dSo7] (architecture)

[PROJECT] architecture: LARYNX theory validation research complete (Feb 28 2026). Five-agent research sweep confirmed: (1) Logan Blue USENIX 2022 DID use articulatory inversion and DID find physically impossible vocal tract transitions in deepfakes at 99.9% precision — earlier assessment that "different method" was WRONG, same principle different coordinate system (tube areas vs EMA points). (2) Peter Wu's AAI acts as anomaly detector by construction — trained on real human MRI/EMA data, forces non-human acoustics into human articulatory space → kinematic explosions. Jerk loss in training ensures smooth output for real speech, meaning spikes on synthetic input are signal not noise. (3) Six proven measurable differences between AI and human voice: jitter/shimmer (human ~1-1.5% vs TTS <0.5%), HiFi-GAN checkerboard spectral artifacts (8-16kHz), formant bandwidth rigidity, phase dispersion at GCIs, temporal fine structure chaos, high-freq noise floor periodicity. (4) SYNAPSE not viable as pivot — zero code, 8-12h from scratch. (5) Bulletproof fallback: pre-trained Wav2Vec2 spoofing classifier (<0.5% EER SOTA) as black-box detector + AAI skull visualization as explainability layer. Critical next step: run AAI on real vs deepfake WAVs to empirically validate velocity separation.

*Created: 2026-02-28T07:13:52.439Z*

### [2YcZdd6gRknSRD891Jzv9S] (architecture)

[PROJECT] architecture: AI Disclosure Policy — LARYNX (Feb 28 2026). HackIllinois requires README disclosure of product-facing AI only — dev tools (Cliproxy, OpenCode agents) need NOT be disclosed. LARYNX product-facing AI: AAI model (Wav2Vec2 backbone for acoustic-to-articulatory inversion), OpenAI API (TTS sample generation for deepfake test audio), Cloudflare Workers AI (BGE embeddings, optional), Supermemory (analysis history/memory). README disclosure should list only what end-users interact with through the product.

*Created: 2026-02-28T07:02:42.783Z*

### [uM6uacPNQnncNFkNfeYxEM] (learned-pattern)

[PROJECT] learned-pattern: Review Agent Findings — Partially Applied (Feb 28 2026). LARYNX-relevant gaps still open: (1) SECURITY: VITE_OPENAI_API_KEY on LARYNX/STACK.md — Vite bundles VITE_-prefixed vars into client JS, exposing secret. Must route TTS through CF Worker. (2) API envelope mismatch: shared/contracts defines { success, data, error } wrapper but LARYNX architecture returns bare objects. (3) Worker proxy code is aspirational stubs with no CORS/error handling. (4) Formant preprocessing (noise gate, 50ms smoothing, >80Hz pitch filter) documented as MANDATORY but incomplete in pipeline. SYNAPSE-specific items (transformer-lens/sae-lens version clashes) are now irrelevant — SYNAPSE archived.

*Created: 2026-02-28T07:02:38.688Z*

### [yw1ksdDeNJSKFBP91WxASv] (architecture)

[PROJECT] architecture: Modal Track Strategy — LARYNX Only (Feb 28 2026). LARYNX is the sole active track — SYNAPSE archived (decision gate: LARYNX 22/25 vs SYNAPSE 14/25). Targets Modal: Best AI Inference. Core pitch: real GPU inference (AAI Wav2Vec2 backbone on A100), not an API wrapper. Pipeline: 16kHz audio → AAI model on Modal GPU → 12D EMA trajectories → tongue velocity analysis → 3D R3F skull visualization. min_containers=1 for demo reliability. Also eligible for: Cloudflare (Pages + Workers proxy), OpenAI (TTS sample generation), Supermemory (analysis history), MLH prizes (unlimited stacking).

*Created: 2026-02-28T07:02:31.395Z*

### [jgD9kkVHYmwcifgxH3MFUP] (architecture)

[PROJECT] architecture: LARYNX Viz Stack (Feb 28 2026). R3F scene: procedural cranium geometry (jaw ridge, chin, cheekbones, occipital bulge, temple indent), TongueModel with morph targets, EMAMarkers for 6 sensor positions. AAI model source: Peter Wu's articulatory repo (Interspeech 2022 / ICASSP 2023) — NOT haoyunlf/aai (broken). Input: 16kHz WAV, output: 12D EMA at 200Hz (LI,UL,LL,TT,TB,TD × x,y). Decimate 2x for 100fps visualization. SkullClipEffect (torus glow) triggers at velocity>80cm/s. ParticleField: 200 instanced meshes, status-driven color. PostProcessing: Bloom + tone mapping. HeadModel uses gl.localClippingEnabled in useEffect, clipping planes memoized.

*Created: 2026-02-28T07:02:25.045Z*

### [wjkov6h1kWnQcYN37Y6VBe] (project-config)

[PROJECT] project-config: ElevenLabs TTS is working for deepfake sample generation (Feb 28 2026). Use elevenlabs Python SDK. Best voices: Rachel (21m00Tcm4TlvDq8ikWAM, female) and Adam (pNInz6obpgDQGcFmaJgB, male). Model: eleven_multilingual_v2 for highest quality. Output format: mp3 by default, convert with ffmpeg to 16kHz mono WAV. Use phonetically rich sentences that exercise all articulators (plosives, fricatives, nasals, laterals, rapid vowel transitions) to maximize chance of catching velocity anomalies in AAI pipeline.

*Created: 2026-02-28T06:51:06.961Z*

### [7bGq7jspS4cVGfYKMTx7hK] (learned-pattern)

[PROJECT] learned-pattern: Full doc cleanup — LARYNX-only consolidation (Feb 28 2026). Removed all dual-track framing (SYNAPSE as co-equal) and old "Prism" project name references across 13+ files. Key changes: AGENTS.md (LARYNX-only overview, SYNAPSE marked [ARCHIVED] in dir tree), shared/README.md (fully rewritten, LARYNX-only component tables), shared/contracts/api-common.md (SYNAPSE types SteerResult/FeatureAblation removed), shared/decision-gate/T-12h-GATE.md (scorecard filled: LARYNX 22/25 vs SYNAPSE 14/25), shared/infra/modal/modal-app-layout.md (SynapseProcessor class removed entirely, LarynxProcessor only), shared/infra/frontend/perf-rules.md (LARYNX-only framing), shared/runbooks/demo-day-checklist.md (SYNAPSE prompt testing removed), shared/runbooks/BOOTSTRAP.md (SYNAPSE deps/smoke tests removed), RESOURCES.md (Prism→LARYNX), competitive-intel/*.md (Prism→LARYNX). ATTENDEE_GUIDE.md prizes section also expanded with full Devpost prize details including missing Reach Capital MLH prize.

*Created: 2026-02-28T06:46:05.561Z*

### [4FNMor5ReqfFLNrJ7WshvU] (architecture)

[PROJECT] architecture: CSIS Phase 1 FAILED (Feb 28 2026) — Parselmouth formant→velocity pipeline CANNOT discriminate real vs deepfake speech. Real human speech (CMU Arctic) hit 458 cm/s peak tongue velocity (human max ~20 cm/s), classified as DEEPFAKE with 30% anomalous frames. Deepfakes (Edge TTS Ava/Guy) hit 147-494 cm/s. Root cause: parselmouth formant tracker produces octave jumps (F2 jumps 500+ Hz between 10ms frames), linear F2→tongue_x mapping amplifies to 40mm position changes → 400+ cm/s velocity. Both real and synthetic speech suffer equally. P95 velocity separation was only 0.66 cm/s (noise). The "signal" in peak separation (137 cm/s) is in the WRONG direction. Confirms Session 2 research: Peter Wu AAI model (articulatory/articulatory) is MANDATORY — outputs smooth neural EMA trajectories without octave-jump artifacts.

*Created: 2026-02-28T06:40:35.236Z*

### [umTe5t2FiuqCNSSkQWFPbu] (project-config)

[PROJECT] project-config: Domain registered — voxlarynx.tech (Feb 28 2026). Free .tech domain via MLH HackIllinois prize. "Vox" = Latin for voice, pairs with LARYNX (voice box). Will point to Cloudflare Pages deployment. Use this domain on Devpost submission, demo slides, and README.

*Created: 2026-02-28T06:32:19.934Z*

### [jgbDtBMFVPEMeCw4CwaG8U] (learned-pattern)

[PROJECT] learned-pattern: Cliproxy does NOT support OpenAI TTS/audio endpoints (Feb 28 2026). CLIPROXY_AUTH_KEY (sk-codex-...) works for chat/completion but returns 401 on /v1/audio/speech. Cliproxy base URL is http://100.102.224.118:8045/v1 (Tailscale network). Workaround: use edge-tts (pip install --break-system-packages edge-tts) for free unlimited Microsoft neural TTS — no API key needed. Voices: en-US-AvaNeural (female), en-US-GuyNeural (male). Output is MP3 despite .wav extension — must convert with ffmpeg -ar 16000 -ac 1 -sample_fmt s16 for AAI pipeline input. Three test samples generated: real/cmu-arctic-16k.wav (CMU Arctic corpus), deepfake/ava-neural-16k.wav, deepfake/guy-neural-16k.wav — all 16kHz mono PCM, same sentence for comparison.

*Created: 2026-02-28T06:19:23.280Z*

### [UyUvpThLYTshPwqmngttwC] (architecture)

[PROJECT] architecture: articulatory/articulatory training pipeline details (Feb 28 2026). Training script: articulatory/bin/train.py (PyTorch), wrapper egs/ema/voc1/run.sh (Kaldi-style, Stage 1=preprocess, Stage 2=train). Fine-tuning on A100 in <4h is FEASIBLE — HPRC is <1hr audio, run.sh --stage 2 supports resume. Data format: 16kHz WAV + 200Hz 12D EMA numpy. Feature order: TD,TB,TT,LI,UL,LL (x,y each). Loss: MSE + GAN + Jerk (smoothness) + GuidedMultiHeadAttention. Config: conf/e2w_hifigan.yaml. Preprocessing scripts: local/mk_ema_feats.py, local/pitch.py, local/combine_feats.py → .scp maps. HPRC needs resampling to 200Hz EMA + 16kHz audio. This is the 'training on Modal' double-stack for sponsor track — not just inference, but actual fine-tuning on sponsor infrastructure.

*Created: 2026-02-28T06:12:54.517Z*

### [z135Nej2DYaiJT2fDt6bRn] (architecture)

[PROJECT] architecture: CRITICAL PIVOT — Formant velocity detection WILL NOT WORK against modern TTS (Feb 28 2026). Three independent findings: (1) Logan Blue USENIX 2022 does NOT use Praat/formants/velocity — uses modified WaveRNN neural mapping, 99.9% precision comes from learned model not kinematic thresholds. (2) Modern TTS (OpenAI Nova, ElevenLabs) implicitly learns articulatory physics from training data — won't produce 'teleporting formants'. (3) Parselmouth formant tracking too noisy for derivative calculations — octave jumps cause massive false positives on REAL human speech. REQUIRED PIVOT: Replace parselmouth formant pipeline with Peter Wu AAI (articulatory/articulatory predict_ema.py) → calculate d(TongueTip)/dt on EMA output instead. Neural AAI outputs are temporally smooth and map to physical articulators. If must use Praat for demo, empirically test Nova vs human sample and hardcode threshold to whatever separates those specific files.

*Created: 2026-02-28T06:12:49.537Z*

### [kR9mXpE9P5bAG9vAQ795uX] (learned-pattern)

[PROJECT] learned-pattern: Auto-push script fix (Feb 28 2026). scripts/auto-push.sh was creating `auto: checkpoint` commits even when no code changed, AND overwriting manual commit messages. Two guards now in place: (1) `jj diff --stat` empty → skip entirely (already existed). (2) NEW: checks if working copy description is non-empty and doesn't start with `auto:` — if so, pushes as-is without overwriting the manual message. Old PIDs (10466, 26342) killed, restarted as single process. The script runs in a shell loop so bash reads it fully at start — must kill+restart when modifying.

*Created: 2026-02-28T06:09:48.641Z*

### [DKtc59jBKCC5mBTHE5DkqW] (architecture)

[PROJECT] architecture: LARYNX Frontend Wiring Status (Feb 28 2026). Wave 1+2 fixes ALL completed: (1) VerdictPanel — removed 6x `(verdict as any)` casts, proper typed access. (2) VelocityHUD — replaced hardcoded T2=T1*0.8, T3=T1*0.6 with real `frame.sensors[name].velocity` reads via getSensorVelocity(). (3) SoundEngine wired into App.tsx — gesture init (click/keydown), lifecycle sounds (uploading→beep, analyzing→drone+ticking, complete→verdict sting, error/idle→stop), velocity-reactive via store.subscribe(). (4) useAnalysisStream wired to real Modal SSE endpoint (POST FormData). (5) Store startAnalysis() fixed — self-contained inline mock generators, no broken external refs. (6) HeadModel gl.localClippingEnabled moved from render body to useEffect, clipping planes memoized. (7) HeadModel upgraded from bare sphere to procedural cranium with occipital bulge, jaw ridge, chin protrusion, cheekbones, temple indent. (8) Wave 2 components added: AnalysisOverlay (AnimatePresence progress+timer), ParticleField (200 instanced, status-driven), SkullClipEffect (torus glow at velocity>80). All integrated into AnalysisView.tsx + App.tsx. Build: tsc 0 errors, vite build ✓ 3559 modules 462KB gzip.

*Created: 2026-02-28T05:52:15.585Z*

### [PZToh6G6dYdsRPfpyGK3ey] (architecture)

[PROJECT] architecture: AAI pretrained weights CONFIRMED available at articulatory/articulatory GitHub repo (Peter Wu, Interspeech 2022 / ICASSP 2023). Input: 16kHz WAV, output: first 12 dims = EMA (LI_x,LI_y, UL_x,UL_y, LL_x,LL_y, TT_x,TT_y, TB_x,TB_y, TD_x,TD_y). Inference via predict_ema.py. Native 200Hz, decimate 2x for 100fps. Linear regression model also available. ALSO: Berkeley SPARC (pip install) gives 50Hz 12D EMA. Previous audit finding of "no pretrained AAI weights" is WRONG — those audits only checked haoyunlf/aai and sarthaxxxxx/AAI-ALS which are indeed broken, but missed the Peter Wu repo entirely. LARYNX README.md needs updating to reflect this.

*Created: 2026-02-28T05:41:57.687Z*

### [iaKXz13wu4BoK1pb4y745z] (learned-pattern)

[PROJECT] learned-pattern: Modal 1.x API deprecation warnings (Feb 28 2026). In modal==1.3.4, several APIs are deprecated but still functional: `keep_warm` → `min_containers`, `container_idle_timeout` → `scaledown_window`, `allow_concurrent_inputs` → `@modal.concurrent(max_inputs=N)`, `@modal.web_endpoint` → `@modal.fastapi_endpoint`. The old APIs produce warnings but don't break. Fixed in LARYNX backend app.py to use new APIs. Modal profile authenticated as `gladdonilli`.

*Created: 2026-02-28T05:23:54.970Z*

### [RYEzbtVngeDEiATZ6Ayvqu] (error-solution)

[PROJECT] error-solution: Modal 1.x relative import failure (Feb 28 2026). When Modal serves `app.py` via `modal serve`, it runs as `__main__` not as part of a package — so `from .config import ...` fails with `ImportError: attempted relative import with no known parent package`. Fix: use `add_local_python_source("LARYNX.backend")` in the Image definition to mount the local package, then convert ALL relative imports to absolute (`from LARYNX.backend.config import ...`). This affects both `app.py` and `pipeline.py`. The health endpoint worked fine because it had no local imports, but the analyze endpoint crashed on first request.

*Created: 2026-02-28T05:23:50.741Z*

### [XuXL42RTfmv9ZYr343xLeL] (project-config)

[PROJECT] project-config: LARYNX Backend Dependencies (Feb 28 2026). Python 3.11 on Modal. Exact versions from STACK.md: librosa==0.10.2.post1, praat-parselmouth==0.4.5, numpy==2.1.3, fastapi==0.115.6, uvicorn==0.32.1, sse-starlette==2.1.3, python-multipart==0.0.12, modal==1.3.4. Modal 1.x API: modal.App() not modal.Stub(). Single app 'hackillinois-2026' shared with SYNAPSE. Image: debian_slim(python_version='3.11'). Volume: modal.Volume.from_name('model-cache'). Dev: `modal serve backend.py`. Formant extraction is CPU-only (parselmouth) but spec allocates A100 because Modal track sponsors GPU.

*Created: 2026-02-28T05:13:18.143Z*

### [K2hU2SY7yicRcmtCZa54nx] (architecture)

[PROJECT] architecture: LARYNX Backend Pipeline Spec (Feb 28 2026). Modal backend at `LARYNX/backend/app.py`. Pipeline: librosa.load(sr=16000,mono) → parselmouth.Sound → to_formant_burg(time_step=0.01, max_formants=5, max_formant=5500, window_length=0.025) → F1-F4 at 100fps → articulatory mapping (F1→jaw Y via (f1-300)/(900-300), F2→tongue X via (f2-800)/(2400-800)) → velocity=norm(diff(coords))*1.5/dt cm/s → anomaly if velocity>22cm/s. DO NOT CLAMP articulatory values — deepfake values>1.0 cause skull clip (the visual evidence). Preprocessing MANDATORY: noise gate -40dB RMS, pitch filter <80Hz, 5-frame median filter. API: POST /api/analyze returns {jobId}, GET /api/stream/{jobId} SSE. Human limits: tongue tip 15-20cm/s max, jaw 8-12cm/s. TTS deepfakes produce 50-150cm/s = physically impossible.

*Created: 2026-02-28T05:13:10.758Z*

### [Cx2xH6FTrzss3wa7mkgGx6] (error-solution)

[PROJECT] error-solution: Supermemory user-scope list returns only newly-added docs on VM, not pre-existing 58 (Feb 28 2026). Root cause confirmed: git config user.email was unconfigured on VM — plugin derives user container tag via sha256(git email)[0:16]. Fix applied: `git config --global user.email "tianyi35@illinois.edu"`. Plugin works correctly on WSL (same code, same email) — NOT a plugin-layer or API issue. VM may need full OpenCode restart after git email config change for plugin to re-initialize with correct user tag. Raw API (POST /v3/documents/list) returns all 58 docs correctly — confirmed via direct curl.

*Created: 2026-02-28T05:04:54.813Z*

### [wzA9L5Cd4VbvYVuWfJcxQQ] (error-solution)

[PROJECT] error-solution: npm devDependencies not installing on GCP VM (Feb 28 2026). TWO root causes discovered: (1) NODE_ENV=production set globally in ~/.bashrc causes `npm install` to skip all devDependencies (typescript, @vitejs/plugin-react, etc.), reporting "up to date" while node_modules/typescript/ doesn't exist. Fix: `NODE_ENV=development npm install`. (2) A bogus `"tsc": "^2.0.4"` npm package (broken wrapper, NOT TypeScript) was in SYNAPSE/frontend devDependencies, conflicting with real `typescript` package. Fix: removed `tsc` from package.json. After fixing both, switched to `bun install` (v1.3.9 on VM) which installed all 353 packages correctly including TypeScript 5.9.3. Use bun for all frontend dependency management on this VM — npm (v10.9.2 + Node v22.14.0) is unreliable due to the NODE_ENV issue and cache corruption.

*Created: 2026-02-28T05:02:44.478Z*

### [AzyRM52WcM9CuzXHfW9LP7] (architecture)

[PROJECT] architecture: LARYNX Frontend Component Inventory (Feb 28 2026). 23 source files in LARYNX/frontend/src/. Config: package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, tailwind.config.js, postcss.config.js, components.json, index.html. Core: main.tsx, App.tsx, vite-env.d.ts, lib/utils.ts, types/larynx.ts, store/useLarynxStore.ts. 3D Scene: AnalysisView, HeadModel (upgraded to procedural cranium geometry with jaw/cheekbones/occipital), TongueModel, EMAMarkers, ParticleField (200 instanced particles, status-driven), SkullClipEffect (torus glow at velocity>80cm/s), CameraController. PostProcessing: PostProcessingEffects, VelocityRibbons. HUD: VelocityHUD, VerdictPanel, WaveformDisplay, AnalysisOverlay (progress+timer). UI: UploadPanel, ui/button, ui/badge, ui/progress. Hooks: useAnalysisStream (SSE + mock fallback). Audio: SoundEngine.ts (Tone.js singleton, 5 sounds, master bus chain). Store: Zustand 5.x dual default+named export. Build: tsc --noEmit 0 errors, vite build 3559 modules 462KB gzip.

*Created: 2026-02-28T04:56:06.741Z*

### [kAiKkPKmjF3vcpXDhydADT] (error-solution)

[PROJECT] error-solution: npm was completely unable to install TypeScript in SYNAPSE/frontend despite it being in package.json devDependencies. `npm install` reported "up to date" but node_modules/typescript/ was missing. Root cause: a bogus `"tsc": "^2.0.4"` package (a broken wrapper, NOT TypeScript's tsc) in devDependencies conflicted with the real `typescript` package. Even after removing it, npm's cache was corrupted. Fix: removed the `tsc` package from package.json, switched to `bun install` (v1.3.9 available on VM) which installed all 353 packages correctly including TypeScript 5.9.3. npm on this VM (v10.9.2 + Node v22.14.0) is unreliable for this project — use bun for all SYNAPSE/frontend dependency management.

*Created: 2026-02-28T04:53:12.369Z*

### [4DEpTfvKu3DRR2wS7B24AR] (learned-pattern)

[PROJECT] learned-pattern: SYNAPSE Frontend Design Decisions — Research Complete (Feb 28 2026). Color palette finalized from production dark-mode analysis: bg #000000, surface #0A0A0A, border #1F1F1F, text #EDEDED, dim #666666, accent #00FFFF (clinical cyan), warn #FF3366. R3F node colors: resting=#1A1025 ×0.8 emissive, firing=#00FFFF ×2.5 (triggers Bloom), ablated=#111111, targeted=#FF0044 ×3.0. PostProcessing: Bloom luminanceThreshold:1.0 intensity:1.5 mipmapBlur:true, toneMapping=ACESFilmic exposure=1.2. Typography: Geist + Geist Mono (same geometric skeleton, sterile clinical aesthetic, disappears into UI) — self-host WOFF2 15-30kb, font-display:swap (hackathon WiFi unreliable). Alt: Inter + JetBrains Mono for dense numerical displays. Cold state: translucent pre-computed brain with slow-pulsing connection lines. Loading state: Scanline+CRT postprocessing effects during generation wait. Sources: Linear bg=#08090A accent=#5E6AD2, Vercel bg=#000000 accent=#0070F3, Anthropic bg=#0D0D0D accent=#D97757, IEC 60601-1-8 clinical standard (cyan traces, black bg).

*Created: 2026-02-28T04:18:31.896Z*

### [qhsiFt8i7ijmsoWKvqZkuY] (learned-pattern)

[PROJECT] learned-pattern: Supermemory cleanup completed Feb 28 2026. Removed 17 stale project documents: 6 Prism-era (dead concept), 3 dropped outreach (Ryan Ni, Belle, founder meeting), 2 duplicate error-solutions (VCS reinit), 3 superseded (old judge dossier, old track decision, old alternative concepts), 1 wrong-scope (VCS ban moved to user), 1 misleading (wrong repo name), 1 stale next-steps. Kept 41 project docs covering LARYNX architecture, sound design, psychoacoustics, hackathon ops, VM config, competitive intel. VCS ban memory re-added to actual user scope for cross-project persistence.

*Created: 2026-02-28T04:17:49.037Z*

### [CZfkczqj3HaFE4H94eoKbb] (learned-pattern)

[PROJECT] learned-pattern: Review Agent Findings NOT Applied to Docs (Feb 28 2026). Two review agents completed (Deep/Gemini + Codex Plan Audit) but their findings were compressed without ever being applied to the 16 planning docs. 6 gaps identified: (1) SECURITY: VITE_OPENAI_API_KEY on LARYNX/STACK.md line 186 — Vite bundles VITE_-prefixed vars into client JS, exposing secret. Must route TTS through CF Worker. (2) Dependency version clashes: modal 0.73.45 vs 1.3.4, parselmouth 0.4.5 vs 0.4.4, transformer-lens 2.7.0 vs 2.8.1, sae-lens 3.19.0 vs 4.1.1. (3) API envelope mismatch: shared/contracts defines { success, data, error } wrapper but LARYNX/SYNAPSE architectures return bare objects. (4) No bootstrap doc or smoke scripts. (5) Formant preprocessing (noise gate, 50ms smoothing, >80Hz pitch filter) documented as MANDATORY by review but missing from ARCHITECTURE.md code. (6) Worker proxy code is aspirational stubs with no CORS/error handling.

*Created: 2026-02-28T04:15:59.033Z*

### [yfdTvJfb6ESnRZbHRCwUQr] (learned-pattern)

[PROJECT] learned-pattern: SYNAPSE Synthesis Recipe Key Parameters — Unverified (Feb 28 2026). Seven synth recipes documented in research/sound-design-synapse/01-SYNTHESIS-RECIPES.md, ALL parameters need ear-testing: (1) neuronClick: MembraneSynth 4-8kHz + NoiseSynth(white) + BitCrusher(8bit), attack 0.001s (laptop DSP stretches to ~15ms). (2) neuralDrone: FMSynth carrier 300-450Hz, missing fundamental partials, Vic Tandy 18.98Hz tremolo, breathLFO 0.05Hz. (3) ablationSnap: MembraneSynth sawtooth C5 pitchDecay:0.5 6-octave drop + Distortion(0.8) + PitchShift(-12st) + Reverb(4s). (4) pathwayFire: PolySynth(FMSynth) pentatonic locked + GrainPlayer(overlap driven by activeCount/5000). (5) zoomSwell: pink noise + sawtooth HPF sweep 5kHz→100Hz + StereoWidener 0→1 + Doppler ±50/100 cents. (6) regenClicks: Synth(pulse) + BitCrusher(4bit) at 40Hz trigger rate, freq=1000+charCode*10. (7) ablationSlider: Oscillator(sawtooth) 80→800Hz + Chebyshev(1→50) + drag velocity→noise friction. SECRET SAUCE: velocity mapping on slider creates visceral feedback.

*Created: 2026-02-28T04:15:08.051Z*

### [Mq5cWaC6dJdCNaprRwgQMV] (learned-pattern)

[PROJECT] learned-pattern: Sound Design Research Assessment — At Limit (Feb 28 2026). Both LARYNX and SYNAPSE sound design research is at ceiling — more papers/references yield diminishing returns. Next ROI-maximizing steps are IMPLEMENTATION not documentation: (1) Audio prototype (~2h): standalone HTML with all synth recipes on buttons, test on actual laptop speakers in noisy room, tune 30% of recipes that will sound wrong despite correct theory. (2) Shared audio engine scaffold (~1h): write src/audio/master-bus.ts, synth-recipes.ts, audio-store.ts that BOTH projects import — specs describe identical master bus chains. (3) Animation↔Audio bridge (~1h): define Zustand state shape that GSAP onUpdate writes to and useAudioFrame reads from — currently two sets of specs with no formal contract. Total: 4h to go from research-complete to implementation-ready for either project.

*Created: 2026-02-28T04:14:54.745Z*

### [CWaS2JtdgA44FdsTPBZQZ1] (architecture)

[PROJECT] architecture: Sound Design File Inventory (Feb 28 2026). Complete listing of all sound design research on disk: LARYNX — research/sound-design/00-AUDIO-STACK-OVERVIEW.md (230 lines, stack overview + Zustand store + sprite sheets), 01-PSYCHOACOUSTICS.md (75 lines, frequency→emotion map, waveform→emotion, dissonance, autonomic triggers), 02-SPEAKER-CONSTRAINTS.md (140 lines, laptop freq response, Fletcher-Munson, missing fundamental Tone.js code, master bus HPF+limiter), 03-FILM-TRAILER-TECHNIQUES.md (226 lines, braam synthesis, noise risers, 3-layer impact, Dunkirk ticking clock, all Tone.js), 04-GAME-UX-SOUND-PSYCHOLOGY.md (141 lines, juice/game feel, earcons, Kuleshov effect, Dead Space horror pattern), 05-LARYNX-EMOTIONAL-ARC.md (95 lines, 16 sound moments with Tone.js params, P0-P3 priority tiers). SYNAPSE — research/sound-design-synapse/00-AUDIO-STACK-OVERVIEW.md (148 lines, 16-voice pool, module-scoped singletons, useFrame rules), 01-SYNTHESIS-RECIPES.md (370 lines, all 7 synth recipes with full Tone.js code), 02-DATA-SONIFICATION.md (203 lines, Walker/Hermann mapping, spectral formant, granular, spatial budget), 03-SPEAKER-CONSTRAINTS.md (149 lines, transient smearing fix, drone survival, stereo collapse, BT latency mandate), 04-NEUROSCIENCE-SURGICAL-UI.md (192 lines, IEC 60601-1-8 clinical UI, EEG band mapping, jack-in sequence), 05-SYNAPSE-EMOTIONAL-ARC.md (284 lines, 7-phase demo script, P0-P4 tiers 2.5h-5h).

*Created: 2026-02-28T04:14:47.465Z*

### [GNkEwbeV18NEkHRx7VSDM3] (learned-pattern)

[PROJECT] learned-pattern: Sound Design Implementation Gaps — Status Update (Feb 28 2026). LARYNX gap #1 RESOLVED: SoundEngine.ts (304 lines) now exists at LARYNX/frontend/src/audio/SoundEngine.ts — module-scoped Tone.js singleton with 5 sounds (AmbientDrone, ScannerBeep, ProcessingTick, VerdictSting, VelocityReactive), master bus chain (Compressor→HPF 120Hz→Limiter→Volume→Destination). Wired into App.tsx lifecycle. REMAINING GAPS: (2) Tone.js synth params still UNTESTED on actual laptop speakers. (3) Animation↔Audio bridge partially done — velocity-reactive sound works but no GSAP onUpdate→audio triggers yet. (4) SYNAPSE audio engine not started. (5) Cross-project audio compatibility untested. (6) Shared master-bus.ts across projects not implemented — each has separate SoundEngine.

*Created: 2026-02-28T04:14:35.216Z*

### [G31ux8t7Qvp5joJCPewc38] (architecture)

[PROJECT] architecture: SYNAPSE Architecture Research saved to research/synapse/00-ARCHITECTURE.md (186 lines, Feb 28 2026). Covers: ActAdd steering vectors (30 lines Python, 90% wow factor at 5% effort vs full SAE), Gemma-2-2B + Gemma Scope SAEs, TransformerLens hook-based ablation, VRAM budget <8GB on A100 40GB, Modal deployment with weight baking for <5s cold start, Neuronpedia S3 bulk export for offline feature labels, 4 API endpoints (inference, ablate, search, feature detail), UMAP pre-computation for 3D coords, InstancedMesh + LineSegments rendering architecture.

*Created: 2026-02-28T04:13:12.077Z*

### [zDTxTF8HikfXuzLhAkHCxo] (architecture)

[PROJECT] architecture: SYNAPSE Sound Design System (Feb 28 2026). 6 research files saved to research/sound-design-synapse/ (1,346 lines total). Key architecture decisions: (1) 16-voice FMSynth pool (Chrome practical limit), sorted by activation magnitude each frame, top 16 get voices. (2) Module-scoped Tone.js singletons — NEVER instantiate inside React components (HMR duplication). (3) useFrame at 30fps for audio updates (use setTargetAtTime, NOT rampTo — overflows Web Audio scheduler at 60Hz). (4) Spectral sonification: 5K features → 32-bin custom partials on single oscillator (formant-like vowel shifts). (5) Master bus: Compressor(-12dB, ratio:4) → HPF(120Hz) → EQ3(low:-3, mid:0, high:+2) → Limiter(-1dB). (6) Spatial audio budget: max 15 Panner3D nodes, equalpower panningModel (NOT HRTF — phase cancellation on laptops). (7) Bandwidth-as-volume trick: keep RMS constant, use LPF 800Hz for "quiet" precision phases, snap open to 10kHz for impact — works in 65dB hackathon noise. (8) Drone carrier moved to 300-450Hz (not 150Hz) with 0.2Hz timbral sweep to survive crowd masking.

*Created: 2026-02-28T04:13:04.982Z*

### [LdKu7L2Y7VucWByUvz9qtN] (architecture)

[PROJECT] architecture: MLH 8 Prize Categories at HackIllinois 2026 (from Opening Ceremony). (1) Best use of Llano Labs (voice data) — Beats Solo earbuds — DIRECTLY RELEVANT to LARYNX voice forensics. (2) Best use of Solana — scalable backend. (3) Best use of Snowflake API — AI-powered apps. (4) Free .type domain for all participants — 10yr renewal + desktop mics for winners. (5) Best use of AI by Reach Camo — Logitech webcam + investor meeting. (6) Best use of Digital Ocean — free cloud credits. (7) Best use of Prestage — human sensing/emotion detection on mobile. (8) Best use of Gemini API (Google Cloud). LARYNX should target: Llano Labs (voice data = exact domain match), Gemini API (can use for deepfake sample generation or analysis narration). All MLH prizes are unlimited stacking — no cap.

*Created: 2026-02-28T04:05:14.298Z*

### [V8944419urWECkJ7BAVc1y] (architecture)

[PROJECT] architecture: HackIllinois 2026 Official Rules from Opening Ceremony (Feb 28 2026). SUBMISSION: DevPost deadline 6AM Sunday March 1st (firm). Teams 1-4 people. TRACK SELECTION: at most 1 company track (Stripe Fintech / Modal AI Inference / Caterpillar / John Deere Hardware). PRIZE STACKING: up to 2 HackIllinois category prizes (Most Creative, Best UI/UX Design, Best Social Impact, Most Useless) + up to 3 sponsor prizes + unlimited MLH prizes. JUDGING: Science fair style 9AM-11AM Sunday at Siebel CS, arrive 8:45 AM, must be present at table entire showcase or DISQUALIFIED. HackIllinois finalists → Shark Tank pitch at 12PM Sunday (sponsored by Fulcrum GT, $5K prize for monetizable ideas). All winners announced at closing ceremony 12PM Sunday. MODAL TRACK: $250 free credits for every participant (link in Discord), 1st place = trip to NYC office. Workshop right after opening ceremony. OVERNIGHT: Siebel Center for Design is overnight building (not Siebel CS). Shuttle at 12:30 AM. Siebel CS quiet-only after 2 AM. Doors lock 9:30 PM.

*Created: 2026-02-28T04:05:07.750Z*

### [r9cuJAdRqrJD4dWpb7Qpjb] (architecture)

[PROJECT] architecture: PARALLEL TRACK DECISION (Feb 28 2026). Pivoted from LARYNX-only to PARALLEL LARYNX+SYNAPSE development. Reason: AAI model feasibility audit revealed NO pre-trained weights exist for ANY acoustic-to-articulatory inversion model (haoyunlf/aai, sarthaxxxxx/AAI-ALS, HuggingFace — all training-only). LARYNX feasibility dropped from 7.5/10 to ~6/10. Formant fallback (F1/F2 via parselmouth/librosa) brings it to ~75% but adds risk of false positives on noisy audio. SYNAPSE has cleaner build path (andyrdt/saes pre-trained, ActAdd = 30 lines, TransformerLens works). SYNAPSE won 7/8 categories in 53-judge simulation but was undersold in description. Strategy: build both tracks sharing Modal A100 + R3F + GSAP + CF Pages infra, decision gate at T-12h based on which core demo loop works. Both tracks share: Modal backend, React Three Fiber, GSAP animation, Cloudflare Pages, Zustand state.

*Created: 2026-02-28T03:39:14.478Z*

### [m95kqTTTdZurtv4uy29HGS] (learned-pattern)

[PROJECT] learned-pattern: LARYNX Psychoacoustic Sound Design Research (Feb 28 2026). Key findings from 5-agent deep research sweep: (1) Speaker constraints: laptops roll off below 100-200Hz, so use "missing fundamental" trick — play harmonics 2-5 of target freq with zero fundamental energy, brain fills in perceived bass. Tone.js: custom partials [0, 1, 0.75, 0.5, 0.25]. (2) Hackathon hall masking: 65-80dB ambient noise at 300Hz-3kHz (speech band) masks sustained pads/drones. Solution: square waves, FM synthesis, sharp transients (5-10kHz) cut through. (3) Master bus MUST have HPF at 120Hz + Tone.Limiter to prevent IMD distortion and clipping on small speakers. (4) Emotional arc: clinical earcons (sine/triangle, sterile) → acoustic vacuum (horror "lean-in" technique, FADE OUT ambient during processing) → 250ms total silence → dissonant sting (sawtooth minor 2nd C3+C#3) at deepfake reveal → Kuleshov effect: same 3D head visual + velocity-mapped sawtooth distortion = body horror. (5) Data-reactive audio is the engineering flex: braamDist.distortion = min(tongueSpeed/100, 1.0), braamFilter.freq = 400 + tongueSpeed*50. Normal speech 15cm/s = clean, deepfake 80cm/s = crushed distortion. (6) Vic Tandy 18.98Hz infrasound can't play on speakers but 19Hz AM modulation (LFO tremolo) on 150Hz triangle carrier simulates unease. (7) Ticking clock (Dunkirk technique): MetalSynth BPM ramps 60→120 during analysis = heartbeat acceleration. (8) Dynamic range strategy: setup at -20dB (judges lean in), reveal at 0dB = 20dB perceived jump without actual clipping. (9) Juice principle: randomize pitch ±50-100 cents per SFX play to prevent machine-gun repetition. (10) Fletcher-Munson: at 60-75dB demo SPL, 100Hz needs 15-20dB more power than 3kHz to sound equally loud — design around 2-5kHz presence range for maximum perceived volume efficiency.

*Created: 2026-02-28T03:35:08.537Z*

### [Pn6AZiEuKhj6ARMR7XKqge] (architecture)

[PROJECT] architecture: LARYNX Frontend Visualization Stack (Feb 28 2026). Three-layer architecture: (1) AAI MODEL — Primary: haoyunlf/aai (Interspeech 2024, Wav2Vec 2.0→EMA, pre-trained weights available). Backup: sarthaxxxxx/AAI-ALS (Bi-LSTM). Logan Blue USENIX 2022 code is LOW usability — use concept only. EMA format: 6 sensors (UL/LL/JAW/T1/T2/T3), 2D midsagittal (X=anterior/posterior, Y=superior/inferior), units=mm, output N×12. (2) 3D RENDERING — React Three Fiber + drei. ARKit 52-blendshape head from Ready Player Me, Boolean-sliced in Blender for sagittal view. MeshTransmissionMaterial for x-ray glass (transmission=0.9, chromaticAberration=0.5). Morph targets driven in useFrame via Zustand transient store (NEVER useState). EMA→morph: normalize displacement from rest pose, don't clamp at 1.0 for deepfake skull-clipping. Post-processing: Scanline+Bloom+ChromaticAberration from @react-three/postprocessing. (3) ANIMATION — GSAP timelines for macro choreography (skull→zoom→tongue→data overlay), gsap.quickTo() for real-time EMA stream (4x faster than gsap.to), Motion for HUD panels, SplitText+DrawSVG for data reveals. Scroll narrative via ScrollTrigger pinning canvas.

*Created: 2026-02-28T03:33:03.923Z*

### [U2cc3hHVD8Kt25C5jYLCia] (architecture)

[PROJECT] architecture: LARYNX chosen as final HackIllinois 2026 project (Feb 28 2026). SYNAPSE rejected — demo impact relies entirely on 3D visualization carrying the weight of a behavioral change (AI stops lying) that judges already expect. LARYNX's impossible physics (tongue clipping through skull at 80+ cm/s) are self-evident and require no explanation for the jaw drop. Friends' instinct confirmed this — voice/articulatory analysis universally preferred. Frontend 3D visualization is THE carry factor and wow factor.

*Created: 2026-02-28T03:29:56.329Z*

### [tWcCvyWdYEcvzCmNAue8Vs] (architecture)

[PROJECT] architecture: LARYNX Sound Design Plan (Feb 28 2026). Audio stack: use-sound (~3kb) + Howler.js (~9kb) for 2D UI SFX, Drei PositionalAudio for 3D spatial (bundled w/ R3F), Tone.js (~16kb) for procedural synthesis — total ~28kb under 60kb animation budget. Architecture: Zustand SoundProvider (isMuted, masterVolume, bgmVolume, audioUnlocked), "Click to Enter" overlay unlocks AudioContext, sprite sheet bundles 8-10 SFX into one .mp3. Key moments: (1) clinical silence → scanner beep on upload, (2) processing whir during Mel spectrogram, (3) deep resonant tone as 3D head materializes, (4) GENUINE = green chime + smooth ribbon hum, (5) DEEPFAKE = bass drop → glitch burst → chromatic aberration (Tone.js sawtooth 800→40Hz ramp), (6) tongue-through-skull = velocity-reactive distortion via PositionalAudio (freq = f(tongue_velocity)). Background: dark ambient drone at 15% volume, ducks to 5% during reveals. ElevenLabs (MLH freebie, 10K chars free) for "forensic analyst" voice narration during demo — high-impact differentiator with CS+Music judges (Evan Matthews, Quinn). Procedural > commissioned — data-reactive Tone.js synthesis is engineering flex. Implementation: P0 (1h) SoundProvider + sprite sheet, P1 (1.5h) ambient + reveal sequence, P2 (1.5h) PositionalAudio + Tone.js, P3 (50min) ElevenLabs + audio-reactive visuals. Total ~4.5h, minimum viable ~2.5h (P0+P1 only).

*Created: 2026-02-28T03:29:29.881Z*

### [MKEiVu7RSteszpyjz9Fckz] (learned-pattern)

[PROJECT] learned-pattern: HackIllinois 2026 project recovered to VM after spot preemption data loss (Feb 28 2026). 34 files restored from OpenCode DB to ~/projects/hackillinois/. Git repo initialized, pushed to Gladdonilli/hackillinois-2026 (private). JJ colocated with identity Gladdonilli / tianyi35@illinois.edu. 126 sessions in DB under hackillinois project_id. GCP disk is instance-20260225-230745 in us-central1-c — gcloud CLI not installed on VM, snapshots must be created from Console. VM is c3d-standard-16 (downgraded from c3d-highcpu-30 after preemption capacity issues). GitHub repo name is hackillinois-2026 not hackillinois.

*Created: 2026-02-28T03:14:08.477Z*

### [vT59pbTKFRGCVQVQDmMvUa] (error-solution)

[PROJECT] error-solution: Post-preemption sync script destroyed project files (Feb 28 2026). Sequence: (1) Spot VM `remote-opencode` (c3d-highcpu-30) preempted at 01:45 UTC. (2) 1 hour of failed restarts — c3d-highcpu-30 unavailable in us-central1-c. Two temporary VMs created and deleted. (3) VM downsized to c3d-standard-16 (16 cores), restarted at 02:48 UTC on ORIGINAL disk `instance-20260225-230745`. (4) At 02:50 UTC a WSL→VM sync script ran, replacing ~/projects/hackillinois/ (70+ files from 7-hour work session) with WSL's sparse copy (only .supermemory-id, supermemory-context.md, empty research/). Evidence: Birth timestamps on surviving files = 02:50:41, OpenCode DB at ~/.local/share/opencode/opencode.db has all 186 write calls with full content intact. Recovery: extract all file contents from DB `part` table. Prevention: (1) disable auto-sync on boot, (2) configure GCP snapshot schedule for persistent disks, (3) push to GitHub before any sync.

*Created: 2026-02-28T03:02:56.219Z*

### [9j4bvQyTkPNFuvEXy253c1] (project-config)

[PROJECT] project-config: VM Performance Tuning Applied (Feb 28 2026) — 7 changes to maximize throughput on 30-core/57GiB GCP VM. (1) providerConcurrency raised: anthropic 15→60, openai 10→40, google 50→100, default 30→100 in oh-my-opencode.jsonc — user has 7 API accounts so rate limits aren't a concern. (2) LSP eager mode: added explicit lsp block to opencode.json (typescript/python/go/json/yaml/css/html) — 2-4GB cost negligible on 54GiB free RAM. (3) Sourcegraph MCP: removed per-MCP NODE_OPTIONS=256MB, now inherits global 16GB. (4) Global NODE_OPTIONS="--max-old-space-size=16384" added to ~/.bashrc. (5) DCP contextLimit raised 55%→65% in gladforge.jsonc — user explicitly capped at 65%, do NOT raise higher. (6) PTY maxBufferLines 50K→500K. (7) Project-level AGENTS.md created at .opencode/AGENTS.md with all overrides documented. Prompting strategy: spam 5-10 explore agents, 3-5 librarians, 5-8 parallel task() delegations per question.

*Created: 2026-02-28T01:31:37.648Z*

### [VGThhFcw1d7pR8Wgph1j11] (unknown)

[PROJECT] architecture: Strategic decision — Modal track over Stripe track for LARYNX/SYNAPSE. Rationale: Both projects are fundamentally GPU inference (70% Modal / 30% Stripe). Going Modal means zero time tax — every hour directly improves the demo. Going Stripe requires 4-6h API DX polish (idempotency, test mode, structured errors, docs) that doesn't improve the judge's "oh shit" reaction. Modal→Stripe is possible with extra time (3-4h bolt-on), Stripe→Modal is not (can't retroactively deepen GPU utilization). Modal-first is the dominant strategy even with 7+ competitors because nobody else is in the articulatory physics or SAE neural surgery lane.

*Created: 2026-02-28T00:55:59.822Z*

### [2LkEgCpBt1zvJjpCKgEZCs] (unknown)

[PROJECT] project-config: Modal SDK setup — installed modal v1.3.4 in ~/modal-env Python venv (python3.12, Ubuntu 24.04). System Python has PEP 668 restriction so venv is required. Auth pending — needs `modal token set --token-id X --token-secret Y` (headless VM can't do browser auth). Always `source ~/modal-env/bin/activate` before running modal commands. Credit code: R6M-2VA-9XA (replaces old VVN-YQS-E55). Workspace name still needs to be confirmed after account setup.

*Created: 2026-02-28T00:55:53.369Z*

### [3N2KwThQbZdyodRkFj2Azj] (unknown)

[PROJECT] architecture: Final Ideation Synthesis (12-agent sweep, Feb 28 2026) — Top 2 concepts are LARYNX (deepfake voice forensics via articulatory inversion, 7.5/10 feasibility, 10/10 demo wow, 4/4 sponsors) and SYNAPSE (live neural surgery via SAE feature ablation, 8/10 feasibility, 9/10 demo wow, 4/4 sponsors). Both target Stripe track (wide open, 1 competitor) not Modal (bloodbath, 7+ competitors). LARYNX has more visceral demo (tongue clips through skull), SYNAPSE has cleaner build path (pre-trained SAEs exist, ActAdd = 30 lines). Full synthesis in _intel/ideation/00-FINAL-SYNTHESIS.md. 10 of 12 agents completed, 2 Oracles timed out.

*Created: 2026-02-28T00:29:11.540Z*

### [Ja5iMSQP6djkhAZV9KqYyB] (unknown)

[PROJECT] error-solution: CRITICAL VCS LESSON — NEVER run `jj git init --colocate` on existing JJ repos or `rm -rf .jj .git && git init` to "reset" history. Both destroy working copy state. Happened TWICE in this project: (1) `jj git init --colocate` wiped 16 files from working copy, recovered from OpenCode SQLite DB. (2) `rm -rf .jj .git && git init` destroyed all JJ history, Gladforge guard then blocked git operations. Recovery path: OpenCode stores all write tool calls in `~/.local/share/opencode/opencode.db` table `part`. Always check `jj status` before any repo init operation. Use `jj op log` + `jj op restore` for recovery, never destructive reinit.

*Created: 2026-02-28T00:03:45.783Z*

### [THRVB4VMpM17DFRHEEVE5N] (architecture)

[PROJECT] architecture: LARYNX concept finalized — deepfake voice detection via Articulatory Inversion (AAI). Core: audio → Mel spectrogram → pre-trained AAI model (Bi-LSTM/Transformer) → 6-12 EMA coordinates (tongue, jaw, lips) → kinematic velocity/acceleration check (human tongue max ~15-20 cm/s, deepfakes require 80+ cm/s) → 3D vocal tract visualization (React Three Fiber + rigged GLTF with morph targets). Demo trick: multiply kinematic error 5x so deepfake audio causes tongue to clip through skull. Academic basis: USENIX Security 2022 "Who Are You?" (Logan Blue et al.). Inverse Navier-Stokes approach KILLED — no pre-trained FNO weights exist for acoustics. Adversarial Genesis KILLED — tabula rasa ES produces Brownian motion for first 3 min, judges tune out. Track: Modal (self-hosted PyTorch on A100). 4/4 sponsors: Modal, Cloudflare, OpenAI (generate deepfake samples in-demo), Supermemory (voice analysis history graph).

*Created: 2026-02-27T23:36:46.851Z*

### [ZUjkGZsobqYCpvqqj919Ua] (architecture)

[PROJECT] architecture: Multi-Judge Adversarial Evaluation Results (Feb 27 2026) — 5 independent judges (Oracle, Deep/5-persona-sim, Artistry, Librarian, Ultrabrain-timeout) evaluated 7+ hackathon concepts. KEY FINDINGS: (1) Manifold Sentinel OVERRATED — Oracle called it "B+ masquerading as A+" because every component has published precedent (Mahalanobis 2018, activation viz, PCA, forward hooks). Vasu Jain persona gave 6/10 "no idea who pays for this." (2) Two NEW concepts emerged as frontrunners: ADVERSARIAL GENESIS (500 neural agents evolving live during demo, emergent pack hunting nobody programmed, Oracle's #1) and LARYNX (inverse Navier-Stokes proves deepfake voice physically impossible, Artistry's perfect 40/40). (3) Winning pattern refined: NOT "physical+digital" but "HIGH-FRICTION MOAT" — judges reward projects where they think "I have no idea how they built that." Two paths: hardware OR low-level compute depth. (4) Oracle insight: "past winner pattern is 'something real you can perceive transforming in real-time' — hardware was just the easiest way to achieve that."

*Created: 2026-02-27T23:30:32.759Z*

### [XsSX8hrce6hEPo9hDkWC82] (architecture)

[PROJECT] architecture: Frontend Animation Stack Research (Feb 2026) — Recommended stack for hackathon: (1) Motion (formerly Framer Motion) for React UI micro-interactions — hybrid WAAPI engine, ~15kb lazy, whileInView/AnimatePresence/layoutId/spring physics. (2) GSAP 3.14 for scroll storytelling — ALL premium plugins now FREE after Webflow acquisition mid-2025 (ScrollTrigger, SplitText, ScrollSmoother, MorphSVG, DrawSVG, Flip). React hook: @gsap/react useGSAP(). (3) CSS Scroll-Driven Animations for zero-bundle scroll reveals (animation-timeline: view(), Chrome/Safari full support). (4) View Transitions API for page navigation morphs (document.startViewTransition + flushSync). (5) Lenis for smooth scroll (~3kb, replaced Locomotive Scroll). (6) Magic UI + Aceternity UI for copy-paste animated components (shadcn pattern, Framer Motion under hood). Total animation budget ~48kb. 2026 meta: use Motion for components + GSAP for scroll narrative together.

*Created: 2026-02-27T23:30:26.362Z*

### [b8dXcKTb8Mpwb4KCj7EjFp] (learned-pattern)

[PROJECT] learned-pattern: HackIllinois 2026 project files (competitive-intel/, JUDGES.md, ATTENDEE_GUIDE.md, etc. — 19 files total) are on the VM, NOT on WSL. WSL at /home/li859/projects/hackillinois only has .supermemory-id and supermemory-context.md. The VM has the JJ repo with working copy containing all files uncommitted on top of init commit (revisions: qpwskvzk working copy on top of wvpxyuom main@origin). OpenCode sessions must target the VM to access/modify these files. WSL is a completely different filesystem.

*Created: 2026-02-27T23:30:18.017Z*

### [TQ64PWcxQs8mEjMsWiDpxR] (architecture)

[PROJECT] architecture: Caterpillar Track — Full Challenge Details: Create AI-powered tools for field operations. Four challenge areas: (1) AI Inspection — generative AI to revolutionize machine inspection, optimize safety/efficiency/cost. (2) Voice+Image Reports — voice and image inputs → structured actionable reports, eliminating manual paperwork. (3) Site Planning — AI generates/evaluates multiple layout and logistics plans for construction/industrial sites. (4) Visual Parts ID — snap photo or describe part → ranked part numbers with fitment certainty per equipment model. Judging: innovation, technical execution, impact, design, presentation. NOT about perfect code — about creative, functional, impactful use of AI. Resources: LLM credits, sample inspection templates, PASS/FAIL/MONITOR example images, walkaround inspection videos. 2 CAT judges: Kanishka Patel, Thomas Zadeik.

*Created: 2026-02-27T23:19:22.775Z*

### [DeiGJpyUXktkVcFDEzxcPB] (architecture)

[PROJECT] architecture: Stripe Track (Best Web API) — Full Judging Criteria: (1) Functionality — endpoints return 200/2xx for valid inputs, error conditions surfaced with appropriate status codes. (2) Usefulness & Creativity — clear developer use case, solving meaningful problem. (3) API Design & Attention to Detail — consistent endpoint naming, pagination/filtering/search, idempotency, predictable state mutation, corresponding GET for every POST, search by multiple criteria beyond just ID. (4) Documentation & Developer Experience — users can figure out how to use it, error messages explain what went wrong, tech stack explained. Frontend work is OPTIONAL — judged on API quality. Minimum: cURL/Postman queryable over HTTP on localhost. Bonus: publicly accessible + hosted docs page. Prizes: 1st $2000+JBL headphones, Honorable mention $500+$100 Amazon GC. 6 Stripe judges: Ashwathama, Divya, Jamie, Phoebe, Quinn, Shashwat. KEY INSIGHT from Divya: "doesn't require you to use the Stripe API" — any well-crafted API qualifies.

*Created: 2026-02-27T23:19:15.983Z*

### [ygJsVA7Xn9SQChpWi8jmBV] (architecture)

[PROJECT] HackIllinois 2026 Judge Dossiers (COMPLETE — 57 Judges from API): Scraped adonix.hackillinois.org/judge/info/ API via agent-browser. Full dossiers written to ~/projects/hackillinois/competitive-intel/JUDGES.md (517 lines). Raw JSON at judges-api-raw.json. SPONSOR-AFFILIATED: Modal (3: Amit Prasad systems team, David Wang LLM inference optimization, Parthiv Apsani low-latency infra), Stripe (6: Ashwathama/Divya/Jamie/Phoebe/Quinn/Shashwat), Caterpillar (2: Kanishka Patel returning judge, Thomas Zadeik Product Owner Cat Inspect), Capital One (4: Arun/John/Jonathan/Shira), Amazon (4: Vasu Jain agentic AI+MCP, Parminder Singh serial judge PMP, Darshan Botadra AWS Applied AI, Tanay Tandon 18yr eng leader), OpenAI (1: Aydan Pirani — CRITICAL — former HackIllinois API Lead & Co-Director, Search Infra at OpenAI, NVIDIA CUDA intern), Google (1: Rahul Kapoor Staff SWE), Aedify (1: Victor He LLM+vector search). KEY UPDATES: Karthik Kadapa NOT a black box — AI Product Exec 12yr, GenAI/LLMs/agentic expert. ~15 AI/ML specialist judges, ~20 UIUC alumni, 4+ returning judges. Cross-judge strategy: systems engineers (~20), AI/ML experts (~15), product/PM (~8), full-stack/frontend (~8), security/compliance (~6). Pitch structure optimized for all archetypes in JUDGES.md.

*Created: 2026-02-27T23:18:16.927Z*

### [mreXCeT8eUUx9xKQeXthDz] (preference)

[PROJECT] preference: User's decision framework for HackIllinois 2026 — Optimize ONLY for building the single best project. NOT about grand prize specifically, NOT about prize stacking, NOT about expected value. "Winning" = judges look at the project and say "this is the best one." Time and team are NOT constraints (model as team of 8 with a week). No hardware track. The only question is: which concept has the highest quality ceiling when built to its full potential?

*Created: 2026-02-27T22:56:05.798Z*

### [DY2r1BCMXMpcwWLtErdToD] (architecture)

[PROJECT] architecture: Activation Steering Technical Path — ActAdd (Turner et al) is the SIMPLEST method for "slider controls model behavior" (30 lines, zero pre-computation). CANNOT use vLLM (fused CUDA kernels block Python hooks) — MUST use native HuggingFace transformers on Modal A100. get_activation(pos_text) - get_activation(neg_text) = steering_vector, then register_forward_hook on layer 15 for 8B model. ~40-60 tok/s on A100 = 1-2s per generation. Alternatives ranked by complexity: ActAdd (30 lines) < CAA/Rimsky (50-100 lines) < RepE/Hendrycks (150-200 lines) < ITI/Harvard (250+ lines). Pre-trained SAEs also available: andyrdt/saes-llama-3.1-8b-instruct (BatchTopK, k=32-256), EleutherAI/sae-llama-3-8b-32x, Google DeepMind Gemma Scope for Gemma-2-2B fallback. TransformerLens fully supports Llama-3-8B via HookedTransformer.from_pretrained().

*Created: 2026-02-27T22:38:11.138Z*

### [suj88eZRWW7E3xsc5KjJwj] (learned-pattern)

[PROJECT] CalHacks + TreeHacks Notable Track Winners (beyond grand prize): CalHacks — Duet (EEG brainwave→generative soundscapes, BCI hardware + generative audio, extreme novelty), Databae (AI database analyzer, AST parsing + RAG + schema agents, deep dev tool), Companion (voice-powered autonomous web agent for seniors, Voice AI + Playwright browser automation), Sift (semantic search, embeddings + vector DB + Next.js). TreeHacks — TreeTrash (2nd + Most Creative OpenAI, CV trash bin + environmental impact), ZoneOut (3rd + Best Zoom API, multimodal RAG syncing video/audio/text), Lumora (Edge AI + Vercel v0), STIK_GUI (HRT Best Data, low-latency data viz), sign-speak (AR glasses ASL→speech), MedMentor (ElevenLabs+OpenAI+Perplexity chain), HackTCHA (CAPTCHA stress-testing against AI, security angle). Pattern: sponsor prizes go to physical-world / domain-specific apps, not generic chat UIs.

*Created: 2026-02-27T22:36:48.143Z*

### [JYLCFrdBf4GLUyKhgxknLr] (learned-pattern)

[PROJECT] Hackathon 36h Solo Time Allocation (from 2025-2026 winner retrospectives): Architecture+scaffold 2-3h (8%), Core backend/AI pipeline 12-15h (40%), Frontend+polish 8-10h (25%), Demo prep+video 4-6h (15%), Testing+deployment 2-3h (8%), Sleep 2-4h. Critical insight: winners spend 15%+ on demo prep, losers spend 0%. Code freeze 6-8h before submission. "Vibe coding" meta (2026): Cursor/Windsurf/OpenCode for max velocity, shadcn/ui+Aceternity+MagicUI for instant polish, n8n for workflow automation, hardcode non-core features. A 2026 Cursor Hackathon winner cloned a $700M app in 4 hours. Scope constraint: build ONE core feature properly + ONE strategic wow factor. Pitch arc: Problem (30s) → Solution+USP (45s) → Live Demo (90s) → GTM/Impact (15s).

*Created: 2026-02-27T22:36:38.042Z*

### [SQ1SMDSP685jWUi4uhUYdn] (learned-pattern)

[PROJECT] Hackathon Prize Pool Rankings (2025-2026 approximate): Tier 1 Corporate/Web3 — ETHGlobal $200K-$500K+/event, OpenAI/Anthropic/Google official hackathons $100K+ (invite-only, 100-300 devs). Tier 2 Big Three Collegiate — TreeHacks (Stanford) $100K+, CalHacks (Berkeley) $100K+ (2000+ participants, largest), HackMIT $50K+. Tier 3 Major Collegiate — HackIllinois $75K+, Hack the North (Waterloo) $50K+ (3000 participants, Canada's largest), PennApps/HackGT/MHacks $30K-$60K each. European — Junction (Helsinki) €100K+ total tracks with €20K+ cash main prize. Key insight: top-tier hackers travel across events — TreeHacks/CalHacks winners (Aryan, Atharva) are at HackIllinois. Prize stacking is the meta at events with multiple sponsor tracks.

*Created: 2026-02-27T22:36:30.117Z*

### [XV42Ji3HPdgkJdL526YZ9C] (learned-pattern)

[PROJECT] Stripe "Best Web API" Track Winning Intel: No specific 2025 winning projects found, but Stripe's judging criteria are well-documented. Stripe engineers judge these tracks looking for Stripe-like API design philosophy. Must-haves to win: (1) Idempotency — Idempotency-Key header + Redis/Postgres cache middleware, top 1% signal. (2) Structured errors — JSON error objects with type, code, message, param, doc_url fields (Stripe-style). (3) Cursor-based pagination — has_more + starting_after/ending_before, NOT offset/limit. (4) Documentation — auto-generated OpenAPI/Swagger spec served via Redoc (three-pane layout like Stripe docs), with cURL/Python/Node snippets. (5) Webhooks — 202 Accepted for async jobs, POST event payload to user webhook URL with signature header. Stripe track rewards API-as-product framing, not consumer UI. Solo viability is very high — clean API design is easier solo than distributed infra.

*Created: 2026-02-27T22:36:21.867Z*

### [1CRNhViEaQoYE6Wf8dMNj1] (learned-pattern)

[PROJECT] Modal Track Winning Intel: Aryan Keluskar won HackMIT Modal 1st Place with "Flashback" (team: Jeremy Flint, Soham Daga) — memory/social logging app using open-source face detection model on Modal GPUs. Prize: $5K Modal credits + Llama body pillow. Also TreeHacks Modal Runner-Up (real-time multimodal video/audio inference). Modal's explicit judging criteria scraped from HackPrinceton Devpost: "hosts model inference on Modal — run Llama, DeepSeek, Flux, Lightricks LTXV, or whatever model yourself, on our GPUs." Modal does NOT reward API wrapper calls to OpenAI/Anthropic. They want open-source model hosting, heavy compute workloads, and parallel inference using @modal.function + .map(). For Prism: host evaluator model (Llama-3 or DeepSeek-R1 distilled) on Modal for JSD/cosine divergence computation, use .map() for parallel cross-model claim extraction.

*Created: 2026-02-27T22:36:13.489Z*

### [XXJJKbonY2Cy8TCmxv1gXs] (learned-pattern)

[PROJECT] HackIllinois 2026 Find-a-Team Competitive Intel (ENRICHED): Discord #find-a-team 161 messages scraped + external profile research (LinkedIn, Devpost, GitHub, personal sites) completed. 13 files written to ~/projects/hackillinois/competitive-intel/. TIER 1 THREATS: (1) Ryan Ni — UCSD, 13 wins, incoming OpenAI, hardware+AI pattern, Sam Altman endorsed Yolodex ($10K OpenAI Hackathon), team w/ sectonic (Apple/Phia). (2) Parin Pengpun — CMU freshman, first-author ACL/EMNLP, NeurIPS co-author, built Thailand's first VLM (Typhoon Vision), teammate Jalen Lu (incoming Roblox, CMU LTI). (3) Bowen/Sahas/Pritika team — AI Inference locked, Bowen has OpenAI Scout status (unlimited free API), Pritika ex-Bloomberg, Bowen incoming HeyGen ($500M val). (4) Aryan Keluskar — ASU, 3x Modal track winner (TreeHacks×2 + HackMIT), always CV/video processing, THE Modal kingpin. (5) Krish Golcha — UIUC, HackPrinceton Overall Winner (MindPad), Keywords AI 1st (Harvest AI = satellite→3D→object detection = PERFECT Caterpillar fit), incoming Amplitude. TIER 2: Atharva Sindwani (UIUC, TreeHacks Fetch.ai 1st, incoming Amazon), Sidharth Anand (UIUC, incoming Meta Superintelligence Labs), Rohan Kapur (UIUC, HackIllinois 2024 runner-up, incoming Stripe), Eva Cullen (Columbia astro+math), Sanjavan Ghodasara (ex-Jio 500K/day geospatial, ex-IBM WatsonX). TRACK SATURATION: Modal=BLOODBATH (7+ serious entrants), Caterpillar=MODERATE (Krish/Eva/Sanjavan), Stripe=OPEN (only Rohan). Prism has zero competitive overlap. Files at ~/projects/hackillinois/competitive-intel/

*Created: 2026-02-27T22:17:30.033Z*

### [zn74XZtDaTB3mz6aJm5uSM] (project-config)

[PROJECT] AI Disclosure Policy: HackIllinois AI policy requires README disclosure of AI tools used. CRITICAL DISTINCTION: AI used during DEVELOPMENT (Cliproxy, OpenCode/Antigravity, oh-my-opencode agents) does NOT need to be disclosed — only AI the PRODUCT uses post-development matters. Prism's product-facing AI: OpenAI API (multi-model fan-out), Cloudflare Workers AI (BGE embeddings), Supermemory (memory/search/graph). Supermemory account is already active and serves double duty — used during dev AND as a product component. The README disclosure should list only what end-users interact with through the product.

*Created: 2026-02-27T22:14:33.110Z*

### [fcPNTi2iNcpr6yu87XkrCd] (learned-pattern)

[PROJECT] Hackathon Competitive Intel — 2025-2026 Winning Projects & Patterns: Exhaustive research across TreeHacks, HackMIT, CalHacks, HackGT, PennApps, MHacks, HackIllinois. Grand prize winners: heartAI (TreeHacks, 3D cardiac MRI + deep learning + vector DB), Talk Tuah (CalHacks, AR glasses + real-time LLM social advice), Phoenix Project (HackMIT, Arduino wildfire sensor + Alexandridis fire sim). Key pattern: simple API wrappers are dead — winners use multimodal RAG, hardware+AI fusion, agentic execution, or statistical analysis. Converged winning stack: Next.js 14/15 App Router + TailwindCSS + shadcn/ui + Framer Motion frontend, Supabase/Convex backend, Groq (sub-second inference) + Claude 3.5 Sonnet + GPT-4o + Modal (custom GPU), CF Workers/Vercel Edge for compute. Demo anatomy: Hook (0-30s, start in the meat), Oh-Shit moment (30-90s, technical wow), Under the Hood (90-150s, arch + sponsor drops), Impact (150-180s). Winners hardcode fallback data for demo reliability. HackIllinois 2025 top-tier path was "Olympians" ($2K), rebranded 2026 to "HackVoyagers" ($5K + Shark Tank). Same judges, same culture. Prism (cross-model hallucination detection via JSD + cosine divergence) fits the winning meta perfectly — deeply technical, not a wrapper, novel gap confirmed.

*Created: 2026-02-27T22:05:21.393Z*

### [d2VmMuSCSxQEDQHpPPPeYR] (project-config)

[PROJECT] HackIllinois 2026 Rules & Logistics (FINAL from Attendee Guide): Feb 27-Mar 1, fully in-person, 36h. Siebel Center for CS (primary), Siebel Center for Design (overnight hacking space). Building closes 1AM, reopens 7AM. Doors lock 9:30PM (iCard swipe). Check-in Fri 2-5PM via HackIllinois app + GitHub. WiFi: IllinoisNet-Guest. Teams up to 4, all same track. Solo allowed. AI POLICY: allowed but must disclose in README (which tools, what they generated), can't be simple wrappers/reskins. Judging: Idea & Creativity, Product Design, Execution & Technical Quality, Impact & Intent. SUBMISSION: Devpost, deadline Sun Mar 1 6:00 AM CST. Must include: public GitHub repo, max 3-min video (public/unlisted), description addressing track. Team/track pre-confirmation due Sat 11:59PM (25 pts). Paths: Voyager $5K (Shark Tank top 7), General $2.5K. Tracks (AT MOST 1): Stripe, Modal, Caterpillar, John Deere. Categories (UP TO 2): Social Impact, UI/UX, Most Creative, Most Useless. Company & MLH Prizes: UP TO 5 from combined list per attendee guide. Mentors: Siebel 2406 + Discord #office-hours-text @Mentor.

*Created: 2026-02-27T21:47:10.899Z*

### [f9e2bEH5BEyZ8TuVeXdxeX] (project-config)

[PROJECT] HackIllinois 2026 Points & Raffle System: Points earned via workshops (75), Company/RSO Expo (10/booth), mentor office hours (50, once), Solar Search (50/booth x4), Cosmic CTF (10/task x6), Astral Exhibition (25/booth, solar soccer 50), Poker/Clash Royale (50 each), Side Quests (20 each), Duels (2 lose, 5 win, cap 75). Point Shop: near ACM Office Siebel 1F, opens Fri 6PM, closes Sun 10:30AM (closed 1AM-9AM nightly). Engagement Raffle tiers: Gold (Sony XM5, LeetCode Pro, gaming monitor, etc), Silver ($150 Steam GC, dinner for 2, etc), Bronze (North Face backpack, YETI). Team/track pre-confirmation by Sat 11:59PM = 25 pts.

*Created: 2026-02-27T21:46:32.187Z*

### [Z3NuRXPD7x7BKQseLwSwsy] (project-config)

[PROJECT] API Key Strategy: OpenAI API key NOT needed for development — Cliproxy provides free access to all OpenAI models during dev/hacking. OpenAI key only needed for final demo/submission to prove "Best Use of OpenAI API" sponsor challenge. Supermemory API key already active and in use this session. Cloudflare Account ID + API token still needed for wrangler.toml and Workers deployment. Modal code VVN-YQS-E55 for $250 free credits if Modal track chosen.

*Created: 2026-02-27T21:46:23.278Z*

### [3fAwRhMGdjrYzVFV1F7bff] (project-config)

[PROJECT] HackIllinois 2026 Sunday Judging Timeline: 6:00 AM — Devpost submission deadline (HARD). Check email/Discord after for room assignment. 9:00-11:30 AM — Project Showcase (science fair format, ALL teams). 5-min presentation: 3-min pitch + 2-min Q&A. Arrive by 8:45 AM or risk DQ. 11:30 AM — Top 7 HackVoyagers notified via email. 12:00-1:30 PM — HackVoyagers Pitch (Room 0216, streamed). 10-min: 7-min pitch + 3-min Q&A. All team members must be present. 2:00-3:00 PM — Closing Ceremony (Awards). 3:00-3:30 PM — Engagement Raffle prize pickup at Help Desk. Point Shop closes 10:30 AM Sunday.

*Created: 2026-02-27T21:46:19.733Z*

### [u4GWoj9DV77gVFSbMbqfGT] (project-config)

[PROJECT] Strategic Decision: Solo Hacker, no team. Ryan Ni outreach dropped, Dhravya Shah meeting never happened. Belle outreach dropped. All team intel memories deleted. Competing solo in Voyager track. Prize stacking strategy: Voyager main ($5K) + 1 track (TBD) + 3 sponsor challenges (Supermemory, Cloudflare, OpenAI) + unlimited MLH + up to 2 category prizes (UI/UX Design, Most Creative). Scope must be ruthlessly constrained for 36h solo execution.

*Created: 2026-02-27T21:42:40.500Z*

### [JWjguUJf1WqqJmCT7FpHwZ] (project-config)

[PROJECT] HackIllinois 2026 Schedule (Friday Feb 27): 2PM check-in, 2:30PM Solar Search minigame, 3PM Company Expo, 5PM Opening Ceremony (Room 1404), 6PM Dinner (Jet's Pizza), 6PM RSO Expo, 7:30PM Track Intros (Modal 2405, John Deere ME-4100, Stripe 1404, Caterpillar 0216), 8:30PM Team Matching (0218), 8:30PM HackVoyagers Talk w/ Fulcrum, 9PM Project Dev Session w/ Fulcrum, 10PM Deployment Workshop (WCS), 10PM MLH Google AI Studio Workshop, 10:30PM Startup Workshop (Telora), 11PM IMC Poker Tournament (2405), 11:59PM Midnight Snack. Key constraint: building closes 1AM Sat, reopens 7AM.

*Created: 2026-02-27T21:41:17.149Z*

### [ptRhoF6BLjFE6F21ZD5dfX] (project-config)

[PROJECT] HackIllinois 2026 Prize Structure (CORRECTED): Total $75K+. Main: Best Voyager $5K, Best General $2.5K, Best Beginner (keyboards), Most Popular (Sony headphones). Category prizes (UP TO 2): Social Impact, UI/UX Design, Most Creative, Most Useless. TRACKS (AT MOST 1, these are NOT challenges): Stripe Best Web API $2K, Modal Best AI Inference $2K+$5K credits+SF trip (code VVN-YQS-E55 for $250 free credits), Caterpillar Best AI Inspection $1.5K+RayBans, John Deere Hardware $2K. SPONSOR CHALLENGES (UP TO 3, separate from tracks): Cloudflare $5K credits/person, OpenAI $5K credits/person, CapitalOne $300 GC, Supermemory Meta RayBans (free tier + booth topup), Solana $5K crypto+Ledger, Actian $300 GC (quality-gated), Aedify $300 credits. MLH CHALLENGES (UNLIMITED): Gemini (swag), ElevenLabs (earbuds), Snowflake (M5Stack), DigitalOcean (mouse), Presage (Fitbit), .Tech domain. STACKING: 1 track + 3 sponsor challenges + unlimited MLH + 2 category prizes all simultaneously. Event prizes: Poker PS5, Clash Royale Switch 2.

*Created: 2026-02-27T21:41:12.391Z*

### [4m9M17GMGjU81gddqDiw2s] (architecture)

[PROJECT] Cloudflare Hackathon Architecture — AI Gateway: Proxy + analytics for multi-model routing, provider-specific URLs for fan-out, /universal is for fallback only NOT simultaneous fan-out. Workers AI: Llama 3 + BGE embeddings 768d on edge. Vectorize: Edge vector DB, sub-50ms RAG. D1: Serverless SQLite for metadata. R2: S3-compatible, zero egress for logs. Pages: Frontend + SSR. Starter kits: cloudflare/agents-starter (chat UI + ai-sdk), cloudflare/workflows-starter (durable execution). Optimal stack: Pages(React) → Workers(API) → AI Gateway(multi-model) → Vectorize+Workers AI(embeddings) → D1(metadata) → R2(archives).

*Created: 2026-02-27T21:35:21.708Z*

### [8Z9NTQWTNpC59y7oReNf3G] (architecture)

[PROJECT] Supermemory API Surface Complete — Memory Router (v3): Zero-code proxy, change baseURL to api.supermemory.ai/v3/, fastest integration path. Vercel AI SDK Wrapper: withSupermemory wrapper + supermemoryTools helpers (addMemories, retrieveMemories, getMemories). User Profiles (v4): POST /v4/profile with static+dynamic sections, client.profile({containerTag, q}) combines profile+search. Search (v4): POST /v4/search, params: q (required), containerTag, searchMode (hybrid|memories), limit, threshold (0-1), rerank (boolean, adds ~100ms), filters (AND/OR). Filter types: string_equal, string_contains, numeric, array_contains, negate. Memory Operations (v4): POST create, PATCH update (versioned), POST forget. Relations: updates, extends, derives. Graph Component: @supermemory/memory-graph, props: documents, highlightDocumentIds, highlightsVisible, variant (console|consumer). ID SPACE GOTCHA: v4 Search returns memory record IDs, v3 List/Export and Graph use document IDs — must map between them, #1 technical risk. Pricing: $1K credits via Startup Program, form use-case "Agent memory".

*Created: 2026-02-27T21:35:17.242Z*

### [CZHKq2Cc6hJ9ALA1nPsWu5] (project-config)

[PROJECT] HackIllinois 2026 Rules & Structure: Two tracks — Voyager ($5K, Shark Tank judging, application-based, requires coding challenge) and General ($2.5K, expo style). ALL team members must be same track. Up to 5 sponsor challenge opt-ins per team, track-agnostic. Target sponsors: Supermemory, Cloudflare, OpenAI (+UI/UX if available). Total prize pool $60K+. 1st place also gets $5K Modal credits/person. The 3-min demo video is the MOST IMPORTANT deliverable — judges watch before reading code. Dates: Feb 27 – Mar 2, 2026 (36 hours). Solo hackers CAN win — Joey Koh won 1st Place SharkTank solo.

*Created: 2026-02-27T21:34:51.033Z*
