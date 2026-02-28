# HackIllinois 2026: Cross-Domain Fusion Ideation (Artistry-2)

**Goal:** Create THE winning SOLO hacker project for HackIllinois 2026 in <20 hours.
**Key Heuristic:** "High-friction moat." Judges must think "I have no idea how one person built that." Deep compute / math illusions.
**Sponsors:** Modal, Cloudflare, OpenAI, Supermemory.
**Front-end Stack:** Next.js 15, Tailwind, shadcn/ui, Motion, GSAP 3.14 (ScrollTrigger, MorphSVG, DrawSVG, Flip), Magic UI, Aceternity UI, Lenis.

Here are 8 cross-domain fusion ideas designed to overwhelm the technical judges with perceived complexity while remaining highly buildable.

---

## 1. Betti.fi
**Domain:** Computational Topology × Financial Risk
**Pitch:** Calculates the "Betti numbers" (topological holes) of crypto market correlation graphs in real-time to detect impending flash crashes before price action happens.
**Demo:** A tangled 3D network of 500 assets suddenly tears open into a massive "hole" (a topological void) 3 minutes before a historical flash crash, triggering an automated short via agent.
**Stack:** Modal (Ripser.py / Persistent Homology compute), Cloudflare Workers (real-time websocket ingestion), React Three Fiber, OpenAI o3-mini (topological shift analysis).
**Sponsors:** 4/4 (Supermemory for graph state history tracking).
**Biggest Risk:** Topological Data Analysis (TDA) on large graphs is $O(2^n)$. Must aggressively downsample or pre-compute the dataset for the demo.
**Vis / Animation:** GSAP MorphSVG transitioning a stable sphere into a chaotic, torn manifold. React Three Fiber for 3D topology visualization, smoothly animated with Lenis during scroll.

## 2. Reynolds Factor
**Domain:** Fluid Dynamics × Code Complexity
**Pitch:** Treats codebase execution paths as a fluid flowing through pipes, using Navier-Stokes approximations to physically detect "turbulence" ($O(n^3)$ bottlenecks and race conditions).
**Demo:** Paste a messy JS file. The UI generates a 2D pipe system. A nested loop causes visual pressure buildup, turbulence, and the pipe physically explodes on screen.
**Stack:** Modal (PyTorch fluid simulation on ASTs), Cloudflare Pages/Workers AI, OpenAI (code refactoring), Supermemory (historical turbulence patterns of open-source repos).
**Sponsors:** 4/4
**Biggest Risk:** Mapping ASTs to fluid boundary conditions mathematically might be completely arbitrary; requires carefully hardcoding the demo path to look realistic.
**Vis / Animation:** WebGL particle simulation mapped to an AST tree. Motion for code blocks, CSS scroll-driven animations following the execution flow down the page as pressure builds.

## 3. Polyphony.sh
**Domain:** Music Theory × Cybersecurity (Network Traffic)
**Pitch:** Maps real-time network packets to Western musical harmony—DDoS attacks sound like dissonant clusters, while normal traffic is a Bach chorale. An ML model detects zero-days purely via auditory dissonance.
**Demo:** We hear a generated piano sonata (live server traffic). An imperceptible SQL injection hits. The system highlights a tritone dissonance in the bassline, catches the exploit, and visually blocks the IP.
**Stack:** Modal (Live audio synthesis / MIDI generation), Cloudflare Workers (intercepting requests as a firewall), OpenAI Whisper (voice commands to isolate ports), Supermemory (audio profiles).
**Sponsors:** 4/4
**Biggest Risk:** Browser Web Audio API latency or timing drift ruining the synchronization between the visual packet drop and the audio dissonance.
**Vis / Animation:** GSAP SplitText for raw logs falling into place as musical notes. A persistent, beautifully animated SVG waveform using DrawSVG that warps violently when an attack happens.

## 4. Cambrian
**Domain:** Evolutionary Biology × UX/Frontend Design
**Pitch:** A frontend agent that breeds UI components using genetic algorithms based on simulated user interaction metrics.
**Demo:** A terrible landing page loads. A script simulates 1,000 blind users trying to click a button. The UI visibly mutates—buttons grow, layouts swap—evolving live over 10 seconds into a high-conversion design.
**Stack:** Modal (headless browser fitness evaluator), Cloudflare Workers AI (Llama 3.1 8B generating raw JSX mutations), Supermemory (storing CSS "DNA" lineage), OpenAI o3-mini (architecting constraints).
**Sponsors:** 4/4
**Biggest Risk:** Generative UI outputting broken JSX syntax, causing the simulation to crash instead of evolving.
**Vis / Animation:** Magic UI / Aceternity components morphing live. GSAP Flip plugin seamlessly animating layout changes as flexbox containers restructure themselves dynamically.

## 5. Chomsky.def
**Domain:** Generative Linguistics × Network Protocols
**Pitch:** Uses Noam Chomsky's Transformational Grammar to parse custom binary network protocols without documentation, automatically deducing the "syntax" and "verbs" of unknown malware C2 servers.
**Demo:** Connect to an unknown botnet. The terminal spits out binary garbage. Chomsky.def outputs a visual sentence diagram ("Header -> Noun Phrase"), deciphering the protocol and automatically sending a valid "kill" command.
**Stack:** Modal (H100 parsing binary PCAP datasets), Cloudflare Workers AI (DeepSeek-R1-Distill for logic parsing), Supermemory (storing grammar rules), OpenAI (visualizing the grammar tree).
**Sponsors:** 4/4
**Biggest Risk:** True unsupervised protocol reverse engineering is a Ph.D. thesis; must fake/simulate a deterministic subset for the 20-hour demo.
**Vis / Animation:** GSAP DrawSVG to draw Chomsky syntax trees live. Aceternity UI for a hacker-terminal aesthetic. SplitText animating binary deciphering into English words.

## 6. Synoptic
**Domain:** Meteorology × Cloud Architecture
**Pitch:** Maps Kubernetes clusters as dynamic weather systems—CPU heat creates "high pressure", causing traffic (wind) to flow autonomously to "low pressure" (idle) nodes using atmospheric physics representations.
**Demo:** A live 3D weather map of a microservice cluster. Trigger a massive traffic spike ("hurricane") on the Auth service. Traffic seamlessly blows into a newly provisioned cold front (backup servers) without crashing.
**Stack:** Modal (Atmospheric primitive equation simulation), Cloudflare Workers (Routing traffic based on the weather model), OpenAI o3-mini (storm analysis), Supermemory (predicting future storms based on historical API traffic).
**Sponsors:** 4/4
**Biggest Risk:** Writing an actual load balancer in 20 hours is impossible. Mock the traffic routing and focus purely on the visual weather simulation + logs.
**Vis / Animation:** React Three Fiber for a glowing, volumetric weather map. GSAP animating pressure isolines (SVGs) expanding and contracting based on API load.

## 7. Voronoi Shield
**Domain:** Computational Geometry × Social Engineering
**Pitch:** Defends against spear-phishing by calculating the high-dimensional Voronoi cells of an employee's communication habits. Deepfakes falling outside the geometric polytope are instantly flagged.
**Demo:** Show an inbox. An email from the "CEO" arrives asking for a wire. Standard filters say safe. Voronoi Shield overlays a 3D geometric mesh of the CEO's habits; the new email lands exactly on an edge boundary, shattering the polygonal cell on screen to prove it's an AI forgery.
**Stack:** Modal (High-dimensional Delaunay triangulation of embeddings), Cloudflare Vectorize (employee vector geometries), OpenAI API (generating embeddings and the fake CEO email), Supermemory (caching boundaries).
**Sponsors:** 4/4
**Biggest Risk:** 3D PCA projection of high-dimensional geometry can look like a messy scatter plot if not carefully art-directed.
**Vis / Animation:** GSAP MorphSVG and React Three Fiber to show a rigid, crystalline structure. Shatter physics animation when the malicious email impacts the shield.

## 8. MyoPrompt
**Domain:** Biomechanics × Prompt Engineering
**Pitch:** Analyzes physical typing cadence, keystroke velocity, and micro-hesitations (digital proprioception) to infer user confidence, dynamically altering the LLM's system prompt to match their mental state.
**Demo:** Type rapidly: you get pure, raw code output. Type the exact same prompt slowly with backspaces: the UI detects hesitation, adjusts the system prompt, and gives a comforting step-by-step tutorial. Displays a live "cognitive load" graph.
**Stack:** Cloudflare Pages (hosting the keystroke tracker), Modal (Biomechanics inference model analyzing time-series data), OpenAI (LLM generation), Supermemory (tracking user learning curves over time).
**Sponsors:** 4/4
**Biggest Risk:** Keystroke dynamics require precise timing (`requestAnimationFrame`), which might be noisy or throttled in a web browser environment.
**Vis / Animation:** A fluid, organic line chart using GSAP DrawSVG reacting like a heartbeat to typing speed. Magic UI ripple effects radiating from the text box when high confidence is detected.