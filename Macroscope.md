# Silent Sentinel Rules

> **Philosophy**: Bots stay quiet until high-confidence issues. Logic-only comments. Ignore style/syntax — tooling handles it.

## Stack

- **Frontend**: Vite + React 19 + React Three Fiber + Zustand + GSAP + Tone.js (TypeScript)
- **Worker**: Cloudflare Workers + Hono (TypeScript)
- **Backend**: Python 3.11 + Modal + librosa + Praat-Parselmouth

---

## Trust Rules

### TypeScript (Frontend + Worker)
- **Trust**: Type system, Vite build, PostCSS/Tailwind
- **Ignore**: Style, formatting, naming, unused imports
- **Focus**: Logic bugs, runtime crashes, data corruption, security

### Python (Backend)
- **Trust**: Modal runtime, type hints
- **Ignore**: Formatting, docstring style
- **Focus**: Numerical correctness, GPU memory, file I/O safety

---

## Focus Areas

1. **Security**: Secrets in client bundles (`VITE_` prefix leaks), XSS via SSE streams, auth bypasses
2. **Runtime Crashes**: Null/undefined in R3F render loops, SSE stream error handling, WebGL context loss
3. **Data Corruption**: Zustand state mutations, formant array transforms, D1 SQL injection
4. **Logic Errors**: Off-by-one in frame indexing, wrong velocity thresholds, SSE event parsing
5. **Concurrency**: Race conditions in SSE streams, AbortController cleanup, Modal container warm starts

---

## Ignore Rules

- Style and formatting (no Prettier/ESLint configured — not the bot's job)
- CSS/Tailwind utility classes
- GSAP animation parameters
- Three.js / R3F boilerplate (geometry, materials, lights)
- Tone.js audio graph wiring
- Markdown documentation content
- `package-lock.json`, `bun.lock`, config files

---

## File-Specific Rules

- `LARYNX/frontend/src/stores/` — Extra scrutiny on state mutations, subscription patterns
- `LARYNX/frontend/src/hooks/useAnalysisStream.ts` — SSE parsing, abort handling, error recovery
- `LARYNX/frontend/src/hooks/useComparisonStream.ts` — Same as above
- `LARYNX/worker/src/` — Input validation, CORS, rate limiting, D1 queries, R2 uploads
- `LARYNX/backend/app.py` — SSE endpoint security, multipart handling
- `LARYNX/backend/pipeline.py` — Numerical correctness in formant extraction
- `LARYNX/backend/classifier.py` — Model loading, prediction bounds
- `SYNAPSE/` — Archived. Skip entirely.
- `competitive-intel/` — Not code. Skip.
- `_intel/` — Not code. Skip.
- `research/` — Not code. Skip.
- `shared/` — Documentation only. Skip unless `.ts`/`.py` files appear.

---

## Learning Log

<!-- False positives and tuning notes go here -->
