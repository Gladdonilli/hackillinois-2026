# Deep Intel: Unconventional Domains for HackIllinois 2026

The goal is to find project concepts for a solo hacker (20h) that occupy a domain NO hackathon project has ever touched. We are looking for the "I have no idea how they built that" reaction from judges, leveraging heavy math/science as a high-friction moat.

Here are 10 concepts across 10 untouched domains, utilizing Modal GPUs, Cloudflare, OpenAI, Supermemory, and modern animation frontends.

---

### 1. Computational Topology (TDA)
**Project Name:** Betti
**Pitch:** Detects structural fraud in financial networks by finding multidimensional "holes" (Betti numbers) in data manifolds, catching complex laundering rings that traditional graph analysis misses.
**Demo Moment:** A massive 3D point cloud of transactions floats on screen. As the Topological Data Analysis (TDA) runs, it physically connects points into simplices, suddenly revealing a glowing, unfillable "hole" in the center—the mathematical signature of a synthetic identity ring.
**Tech Approach:** Modal A100 running Giotto-tda to compute persistent homology. Cloudflare Workers to ingest the transaction stream. React Three Fiber + Motion to visualize the simplicial complex forming in real-time.
**Why it wins:** "They didn't just write an SQL query, they used algebraic topology to find invisible structures in high-dimensional space."

### 2. Acoustic Physics
**Project Name:** EchoMesh
**Pitch:** Inverse acoustic ray tracing to perfectly reconstruct the 3D geometry of a room using only a 3-second handclap recorded on a smartphone.
**Demo Moment:** Upload an audio file of a clap. The UI shows sound waves expanding and bouncing as a spectrogram. Suddenly, a 3D mesh of the room (walls, ceiling, major furniture) materializes out of the echo data.
**Tech Approach:** Whisper to isolate the impulse response. Modal GPU running a differentiable acoustic simulator (like PyRoomAcoustics + PyTorch) optimizing room geometry to match the echoes. Rendered in React Three Fiber.
**Why it wins:** It looks like literal magic. Extracting 3D architecture from a sound file feels impossible to a web developer.

### 3. Network Science
**Project Name:** Cascadence
**Pitch:** Simulates and prevents catastrophic cascading failures in real-time power grids or supply chains using eigenvector centrality and spectral graph theory.
**Demo Moment:** A glowing web of 10,000 nodes. One node gets "attacked" (clicked). The failure cascades instantly. Then, the system resets and the AI "heals" the network by strategically cutting exactly 3 edges (island mode) before the cascade starts, saving 99% of the grid.
**Tech Approach:** NetworkX on Modal for spectral analysis of the graph Laplacian. Supermemory to store historical grid states. GSAP + React Three Fiber for a massive, force-directed graph visualization.
**Why it wins:** Translates abstract graph theory into a high-stakes, visually spectacular interactive simulation.

### 4. Information Theory
**Project Name:** Entropy.io
**Pitch:** A compression algorithm for LLM prompts that measures the Shannon entropy of concepts, removing 80% of tokens while preserving 100% of the mutual information with the target output.
**Demo Moment:** Paste a 5000-word messy document. The UI visually "boils off" the low-entropy (predictable) words, leaving a bizarre, alien-looking 300-token prompt. You run both prompts, and they produce the exact same output from GPT-4o.
**Tech Approach:** OpenAI embeddings to calculate token probabilities and conditional entropy. Cloudflare Workers AI for rapid inference. GSAP SplitText to visually disintegrate the unnecessary words on screen character-by-character.
**Why it wins:** It treats LLMs not as magic boxes, but as noisy information channels, applying rigorous 1940s Claude Shannon math to 2026 AI.

### 5. Swarm Intelligence
**Project Name:** Pheromone API
**Pitch:** Decentralized, zero-coordination routing for drone fleets or delivery vehicles using modified Reynolds flocking algorithms + virtual pheromone gradients.
**Demo Moment:** 500 delivery drones (particles) on a city map. A storm hits (an obstacle is drawn on the map). Instead of a central server recalculating 500 routes, the drones instantly flow around the obstacle like water using local swarm rules and digital pheromones.
**Tech Approach:** Cloudflare Agents SDK (each drone is a tiny Agent). Modal GPU computing the pheromone grid decay. Canvas/WebGL frontend showing the mesmerising, organic flocking behavior.
**Why it wins:** Bypasses standard pathfinding algorithms (A*) entirely for biologically-inspired, emergent behavior that is visually stunning.

### 6. Differential Geometry
**Project Name:** Geodesic
**Pitch:** Maps high-dimensional AI embedding spaces onto a 3D curved manifold, showing exactly where LLMs experience "semantic curvature" (hallucination zones).
**Demo Moment:** A 3D warped landscape representing GPT-4o's knowledge of a niche topic. As you type a prompt, a marble rolls along a geodesic path. If it hits a "negatively curved" saddle point, the marble splits into multiple probabilistic paths—visualizing exactly where the model gets confused and hallucinates.
**Tech Approach:** Modal A100 computing Ricci curvature tensor approximations of the local embedding space. React Three Fiber for the 3D non-Euclidean landscape.
**Why it wins:** Gives physical, geometric shape to the black box of LLM embeddings.

### 7. Game Theory
**Project Name:** NashNet
**Pitch:** An automated market maker that dynamically resolves multiparty resource conflicts (e.g., cloud compute bidding) by finding the exact Nash Equilibrium in milliseconds.
**Demo Moment:** 5 AI agents with conflicting goals and budgets bidding on resources. The UI shows their utility curves intersecting in real-time. The system instantly snaps to the mathematical equilibrium where no agent can improve their outcome by defecting.
**Tech Approach:** Cloudflare Workflows coordinating the agents. Modal running a Lemke-Howson solver for mixed-strategy Nash equilibria. GSAP morphing SVG utility curves to show the equilibrium point solidifying.
**Why it wins:** Replaces "dumb AI negotiations" with mathematically provable optimal outcomes.

### 8. Chaos Theory
**Project Name:** Lyapunov
**Pitch:** Measures the "butterfly effect" in LLM generation, predicting exactly which token choices will cause a massive divergence in the final narrative.
**Demo Moment:** An LLM is writing a story. Certain words glow red. Hovering over a red word ("suddenly") branches the story into a fractal tree, showing that changing this specific token has a high Lyapunov exponent, completely altering the semantic future of the text.
**Tech Approach:** OpenAI o3-mini generating logprobs and branching trees. Modal computing semantic divergence over time. Supermemory to store the semantic fractal. GSAP + React Three Fiber for a massive, blooming narrative tree.
**Why it wins:** Applies dynamic systems theory to language, creating a mesmerizing UX for exploring parallel universes of text.

### 9. Biomechanics
**Project Name:** Kinematica
**Pitch:** Real-time pose estimation turned into inverse dynamics—calculating the exact muscle torques and joint forces of an athlete from a standard 2D video.
**Demo Moment:** Upload a video of a weightlifter. The UI overlays a skeleton, but then goes deeper—showing glowing heatmaps on specific muscles (quads, lower back) estimating the exact Newtons of force being applied in real-time, predicting injury risk before it happens.
**Tech Approach:** OpenPose/MediaPipe for 3D pose extraction. Modal GPU running a differentiable physics engine (MuJoCo/Brax) to solve the inverse dynamics equations. WebGL for the glowing muscle strain overlay.
**Why it wins:** Takes standard CV (pose estimation) and adds hardcore mechanical engineering to extract physical forces from pixels.

### 10. Psychoacoustics
**Project Name:** Phantom Hz
**Pitch:** Uses the "missing fundamental" illusion to make a standard laptop speaker produce sub-bass frequencies that physically shouldn't be possible.
**Demo Moment:** The user hits a button. A deep, rumbling 40Hz bass line plays, shaking the laptop. Then, the UI reveals the spectrogram: there is *zero* audio energy below 100Hz. The brain is hallucinating the bass due to carefully generated upper harmonics.
**Tech Approach:** Modal computing the non-linear harmonic distortion required to trick the human ear. Web Audio API for real-time DSP. Canvas API rendering a beautiful real-time spectrogram proving the physical absence of the bass.
**Why it wins:** It's an interactive magic trick that proves the power of perceptual hacking, requiring zero external hardware.
