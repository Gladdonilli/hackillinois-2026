# HackIllinois 2026 — Judge Dossiers (57 Judges)

> **Source:** `adonix.hackillinois.org/judge/info/` API + Discord #linkedin channel intel
> **Last Updated:** Feb 27, 2026
> **Purpose:** Strategic pitch targeting for Prism (cross-model hallucination detection via JSD + cosine divergence)

---

## 📊 STRATEGIC SUMMARY

**Total Judges:** 57
**Sponsor-Affiliated:** 17 (Modal 3, Stripe 6, Caterpillar 2, Capital One 4, Aedify 1, OpenAI 1)
**Big Tech:** 8 (Amazon 4, Google 1, Apple 1, AWS 1, Walmart 1)
**AI/ML Specialists:** ~15 judges with direct AI/ML/LLM experience
**UIUC Alumni:** ~20+ judges (heavy UIUC connection — hometown advantage matters)
**Returning Judges:** 4+ confirmed (Harsh Deep, Parminder Singh, Kanishka Patel, Konstantinos Oikonomou)

### Top 5 Most Strategically Important Judges for Prism

1. **David Wang** (Modal) — Works on LLM inference optimization at Modal. Will directly evaluate our Modal track submission.
2. **Amit Prasad** (Modal) — Modal systems team, distributed systems + FinTech. Builds the GPU platform we're running on.
3. **Parthiv Apsani** (Modal) — Modal infrastructure, performance optimization. Cares about latency and efficiency.
4. **Aydan Pirani** (OpenAI) — Search Infrastructure at OpenAI, former HackIllinois API Lead & Co-Director. Knows what wins here.
5. **Karthik Kadapa** — AI Product Executive, 12yr, expert in GenAI/LLMs/agentic systems. Will evaluate our AI architecture deeply.

### Key Themes Across All Judges

- **Scalability obsession** — Distributed systems experience is the #1 common thread (AWS, Google, Stripe, CME Group, Amazon, Modal)
- **UIUC loyalty** — 20+ alumni; they'll root for fellow Illini but hold high standards
- **Production-readiness lens** — Many judges build production systems daily; they'll spot toy demos instantly
- **AI/ML is table stakes** — ~15 judges work directly with AI; generic "we used GPT" won't impress anyone
- **PM perspective present** — Parminder, Jonathan Horbund, Thomas Zadeik, Rodney Louie bring non-technical evaluation lens

### Cross-Cutting Pitch Strategy

| Segment | Time | What to Hit | Why |
|---------|------|-------------|-----|
| **Pain Point** | 0:00-0:30 | "LLMs hallucinate. No one knows which model to trust for a given query." | Universal hook — every AI judge has felt this pain |
| **Live Demo** | 0:30-1:30 | Paste prompt → fan-out → heatmap renders → click divergent claim → see per-model breakdown | Show it WORKING. Modal judges want to see their GPUs doing real inference |
| **Architecture** | 1:30-2:15 | Fan-out topology diagram: Modal (open-source models on GPUs) + CF AI Gateway (proprietary) → JSD + cosine → heatmap | Technical depth for the 15+ systems engineers. Name-drop Modal infrastructure |
| **Impact** | 2:15-2:45 | "Every AI-assisted decision — medical, legal, financial — needs a trust score. Prism is that layer." | PM judges want impact narrative; AI judges want real-world application |
| **Close** | 2:45-3:00 | "Built in 36 hours. Runs real inference on Modal GPUs. Not a wrapper — a measurement instrument." | Anti-wrapper positioning for Vasu, Aydan, Karthik |

---

## 🔴 MODAL TRACK JUDGES (3) — MOST CRITICAL

> These judges evaluate the **Best AI Inference** prize ($2K + $5K credits + SF trip). They ARE Modal employees. They will judge whether we're using Modal properly, running real inference, and doing something technically novel.

### Amit Prasad
- **Role:** Modal Systems Team
- **Background:** UIUC alumnus. Building the GPU-enabled cloud platform of the future. Distributed and low-level systems engineering + FinTech background. Loves cooking, skiing, writing.
- **What He'll Value:** Proper use of Modal's infrastructure, efficient GPU utilization, distributed systems design, low-level optimization awareness
- **Pitch Angle:** Show our fan-out architecture running multiple open-source models in parallel on Modal GPUs. Emphasize we're not wrapping APIs — we're hosting Llama/DeepSeek/Mistral directly on their platform and computing statistical divergence across outputs.
- **⚠️ Red Flag:** If we just call one model via Modal and do nothing interesting with the infrastructure, he'll see through it immediately.

### David Wang
- **Role:** LLM Inference Optimization at Modal
- **Background:** UIUC grad school. Works specifically on making LLM inference faster/cheaper at Modal.
- **What He'll Value:** Inference efficiency, batching strategy, model loading optimization, token throughput, any clever inference tricks
- **Pitch Angle:** Lead with HOW we run inference — parallel model dispatch, token-level analysis for JSD computation, how we handle multiple model outputs simultaneously. He literally optimizes this for a living.
- **⚠️ Red Flag:** Naive sequential model calls with no thought to inference efficiency. He'll immediately ask "how many tokens/sec?" and "how do you handle cold starts?"

### Parthiv Apsani
- **Role:** Developer at Modal, distributed low-latency infrastructure
- **Background:** UIUC alumni. Performance optimization specialist. Passionate about photography and skiing.
- **What He'll Value:** Low latency, efficient resource usage, clean infrastructure code, performance benchmarks
- **Pitch Angle:** Show latency numbers. Demonstrate we thought about cold starts, model caching, and parallel dispatch. The fan-out topology is inherently latency-optimized (parallel, not sequential).
- **⚠️ Red Flag:** Slow demo with visible loading spinners. He builds low-latency infra — he'll notice.

---

## 💳 STRIPE TRACK JUDGES (6)

> Evaluate the **Best Web API** prize ($2K). We're NOT competing in the Stripe track, but these judges may also evaluate general/Voyager submissions. Understanding them helps for cross-track Q&A.

### Ashwathama Rajendran
- **Role:** Data Analytics Lead at Stripe
- **Background:** 12+ years in audit, risk, compliance analytics. Previously BlackRock, Barclays. Specializes in regulated environments.
- **What He'll Value:** Data integrity, risk awareness, analytical rigor, compliance considerations
- **Pitch Angle:** JSD is a mathematically rigorous metric — not a vibes-based score. Emphasize precision, reproducibility, and how this could be used for compliance (AI audit trails).

### Divya Koya
- **Role:** SWE at Stripe, backend for merchant dashboard
- **Background:** UIUC BS/MCS '25. Ex-HackIllinois staff. Computer networking, full-stack, graphic design. Values things that are "fun and a joy to use."
- **What She'll Value:** Clean UX, polished frontend, enjoyable demo experience, backend architecture quality
- **Pitch Angle:** The heatmap visualization is genuinely beautiful and intuitive. Show the interaction flow — paste → visualize → drill down.

### Jamie Rollison
- **Role:** Stripe NYC
- **Background:** UIUC '24. Hack4Impact, Out in STEM.
- **What They'll Value:** Social impact, inclusive design, community-oriented thinking
- **Pitch Angle:** Frame Prism as democratizing AI trust — everyone deserves to know when an AI is making things up.

### Phoebe Harmon
- **Role:** Backend SWE at Stripe, Global Payments Experiences team
- **Background:** UIUC '22. CS + Economics + Statistics minor.
- **What She'll Value:** Backend architecture, statistical understanding (she has a stats minor), economic reasoning
- **Pitch Angle:** JSD is a real statistical measure — she'll appreciate the mathematical foundation. Emphasize the economics of hallucination detection (cost of wrong AI answers vs cost of verification).

### Quinn Ouyang
- **Role:** Financial insights and real-time monitoring at Stripe
- **Background:** UIUC BS '25. Also has a music degree. Builds real-time monitoring systems.
- **What He'll Value:** Real-time data processing, monitoring/observability patterns, clean data visualization
- **Pitch Angle:** Prism IS a real-time monitoring system for AI trustworthiness. The heatmap is a monitoring dashboard for model divergence.

### Shashwat Mundra
- **Role:** Full-stack SWE at Stripe, Sandboxes (test mode) team
- **Background:** UIUC CS '25. Security + distributed systems enthusiast.
- **What He'll Value:** Security considerations, distributed systems design, testing strategy
- **Pitch Angle:** How we handle model outputs securely, the distributed fan-out pattern, and how the system degrades gracefully if a model fails.

---

## 🚜 CATERPILLAR TRACK JUDGES (2)

> Evaluate the **Best AI Inspection** prize ($1.5K + RayBans). Not our track, but may cross-evaluate.

### Kanishka Patel
- **Role:** Digital Business Analyst at Caterpillar
- **Background:** UIUC alum. Returning judge/mentor (2nd year). Supports students building real-world solutions.
- **What She'll Value:** Practical applications, real-world problem solving, student growth
- **Pitch Angle:** Prism solves a real problem that every AI user faces. Show the practical workflow — not just theory.

### Thomas Zadeik
- **Role:** Product Owner, Cat Digital — leads Cat Inspect (web + mobile for industrial asset data)
- **Background:** BS Biomedical Engineering USC, MBA UChicago Booth. Product-focused.
- **What He'll Value:** Product thinking, user-centric design, data capture/storage architecture, clear problem definition
- **Pitch Angle:** Lead with the product vision — who uses this, why, what's the workflow. He's a PO, not a deep coder.

---

## 🏦 CAPITAL ONE JUDGES (4)

> Not a track sponsor, but a challenge sponsor ($300 GC). These judges bring enterprise + cybersecurity lens.

### Arun Kumar
- **Role:** Lead SWE at Capital One, ~9 years
- **Background:** Penn State CS, pursuing Cybersecurity MS at UMD. Board games, video games, reading.
- **What He'll Value:** Security-conscious design, robust engineering, clean code practices
- **Pitch Angle:** How we handle model API keys securely (CF AI Gateway abstracts credentials), input sanitization before sending to models.

### John Dukewich
- **Role:** Lead SWE, Capital One Cybersecurity
- **Background:** Penn State + Georgia Tech MS CS. Frontend, full-stack, data engineering.
- **What He'll Value:** Full-stack quality, data pipeline design, security architecture
- **Pitch Angle:** End-to-end architecture quality — from frontend heatmap to backend model dispatch to data storage.

### Jonathan Horbund
- **Role:** PM at Capital One, ~3 years
- **Background:** Georgia Tech CS. Focuses on scalable enterprise platforms. Cooking enthusiast.
- **What He'll Value:** Product-market fit, user experience, clear problem statement, scalable platform thinking
- **Pitch Angle:** Enterprise framing — "Every company using AI needs to audit their models. Prism is the monitoring layer."

### Shira Feinberg
- **Role:** Full-stack engineer at Capital One, ~3 years
- **Background:** Washington State CS. Led WSU's annual hackathon. Board game nights, hiking, travel.
- **What She'll Value:** Hackathon execution quality (she organized one), full-stack polish, team dynamics
- **Pitch Angle:** Show polished end-to-end execution. She knows what good hackathon projects look like.

---

## 📦 AMAZON JUDGES (4)

### Vasu Jain
- **Role:** Senior SWE at Amazon Ads
- **Background:** UF alum, 10+ years. Architects ad serving systems processing millions of requests across Prime Video, live sports, DOOH. Built MCP servers, agentic AI systems at Amazon Ads. Created Pause Ads (hackathon → live product on Prime Video). CPR.VR (healthcare VR). Leads 15 engineers. IAB Tech Lab contributor. Published on distributed systems, ad tech, AI.
- **What He'll Value:** Sophisticated distributed architecture, real product impact, scalability, agentic system design depth. ANTI-WRAPPER mentality — his own hackathon project became a real product.
- **Pitch Angle:** Lead with architecture — fan-out topology, parallel model dispatch, edge compute via CF Workers. Show this could become a real product. Never say "we call an API."
- **⚠️ Red Flag:** Any hint of shallow wrapper over GPT. He'll grill the architecture in Q&A.

### Parminder Singh
- **Role:** Senior Technical Program Leader at Amazon
- **Background:** 16+ years. PMP certified. Led complex multi-disciplinary projects globally. Serial hackathon judge (Amazon Ads Hack 2025, Rice DataThon, Hacklahoma, HackIllinois, Make MIT, TAMU TIDALHack, Live AI Ivy Plus). Top mentor on ADPList + TopMate.
- **What He'll Value:** Project management, execution quality, team coordination, impact narrative, measurable outcomes. PM lens — not deep technical.
- **Pitch Angle:** Lead with the customer pain point. Show measurable impact: "X% of LLM outputs contain hallucinations. Prism catches Y% of them in Z seconds." Concise, structured delivery.
- **⚠️ Red Flag:** Rambling technical explanation without clear business value. He's judged 8+ hackathons — he's seen it all.

### Darshan Botadra
- **Role:** Senior SWE at AWS Applied AI
- **Background:** AI/ML data systems powering self-driving model training. Previously built large-scale payout/settlement platforms at Amazon. Passionate about system design and mentoring.
- **What He'll Value:** AI/ML pipeline architecture, data system design, scalability, mentoring-friendly explanations
- **Pitch Angle:** The ML pipeline: prompt → fan-out → parallel inference → token-level divergence computation → aggregation → visualization. He builds AI data systems — show ours.

### Tanay Tandon
- **Role:** Engineering Leader at Amazon Ads
- **Background:** 18 years. Columbia MS CS. Low-latency, scalable ad solutions processing millions daily. Banking infrastructure + consumer tech platforms. Industry certifications.
- **What He'll Value:** Low-latency system design, scalability under load, performance metrics, technical leadership maturity
- **Pitch Angle:** Latency numbers matter. Show our p50/p99 inference times. Demonstrate the system handles concurrent requests efficiently.

---

## 🤖 OPENAI JUDGE (1) — CRITICAL

### Aydan Pirani
- **Role:** Search Infrastructure at OpenAI
- **Background:** UIUC BS + MCS. Distinguished Undergraduate Researcher Award. NVIDIA (CUDA) + Microsoft Azure internships — GPU systems and cloud infrastructure. **Former HackIllinois API Lead and Co-Director.**
- **What He'll Value:** Technical depth (he's at OpenAI building search infra), GPU-aware design (NVIDIA CUDA experience), hackathon execution quality (he literally ran this hackathon). Will evaluate with both an OpenAI engineer's lens AND a HackIllinois organizer's institutional knowledge.
- **Pitch Angle:** This project compares OpenAI models against open-source alternatives using rigorous statistical methods. Frame it as "trust but verify" — we're not anti-OpenAI, we're pro-transparency. He'll respect the CUDA/GPU awareness in our Modal deployment.
- **⚠️ Red Flag:** Don't position Prism as "catching OpenAI lying." Frame it as "helping users choose the right model for their task." He works at OpenAI — be diplomatic.
- **⚠️ CRITICAL:** As former HackIllinois Co-Director, he knows EXACTLY what wins here. His standards will be calibrated to the best projects he's ever seen at this event.

---

## 🔍 GOOGLE JUDGE (1)

### Rahul Kapoor
- **Role:** Staff SWE at Google
- **Background:** Scalable distributed systems and AI infrastructure. Solutions serving millions globally. Passionate about high-reliability engineering.
- **What He'll Value:** Technical depth in distributed systems, reliability engineering, AI infrastructure design, scalability proof
- **Pitch Angle:** The fan-out architecture is a distributed system problem. Show we understand fault tolerance, retries, timeouts, and graceful degradation. He evaluates "technical depth" explicitly.

---

## 🏗️ AEDIFY JUDGE (1)

### Victor He
- **Role:** SWE at Aedify.ai
- **Background:** Builds scalable AI systems and backend infrastructure. LLM integration, vector search, cloud-based pipelines for intelligent applications.
- **What He'll Value:** LLM integration quality, vector search usage, cloud pipeline architecture, AI system scalability
- **Pitch Angle:** Our architecture uses vector embeddings (bge-base-en-v1.5 via CF Vectorize) for cosine similarity computation alongside JSD. He builds LLM+vector systems daily — show ours.

---

## 🧠 AI/ML SPECIALISTS (11)

> Judges with direct AI/ML/LLM backgrounds outside of sponsor companies. These will evaluate technical AI depth.

### Karthik Kadapa
- **Role:** AI Product Executive
- **Background:** 12+ years in product management and software engineering. Expert in Generative AI, LLMs, and agentic systems. Skilled in cloud solutions architecture and data engineering platforms. Drives digital transformation for enterprises.
- **What He'll Value:** GenAI product vision, LLM architecture sophistication, agentic system design, enterprise-scale thinking, cloud-native architecture
- **Pitch Angle:** Position Prism as an enterprise AI product — the "monitoring layer for LLM deployments." He's a product exec, so lead with vision, then show technical depth.

### Cay Zhang
- **Role:** Founding SWE at Redcar (autonomous AI agents)
- **Background:** UIUC alum. Apple WWDC Scholar. Architected central data hubs at Uber. Created RSSBud (1,500+ GitHub stars). Builds autonomous AI agents.
- **What He'll Value:** Elegant architecture, open-source quality code, agent design patterns, data pipeline architecture
- **Pitch Angle:** Our architecture has agent-like qualities — the fan-out dispatcher acts as an orchestrator across multiple model endpoints. Show clean, open-source-quality code.

### Sai Veda Prakash Masetty
- **Role:** Engineering Lead at Zams (enterprise AI agent platform)
- **Background:** IEEE published researcher and reviewer. Mentors teams on turning prototypes into scalable, secure systems. Focus: LLM agents, CRM, enterprise automation.
- **What He'll Value:** Prototype → production readiness, security, scalability, LLM agent architecture
- **Pitch Angle:** Show how Prism could scale from hackathon demo to production service. Security of model API keys via CF AI Gateway. Enterprise use case: "audit your AI outputs."

### Sreeja Vallamulla
- **Role:** Founding Engineer at Zams, former CTO & Co-Founder of VedaVerse
- **Background:** Builds end-to-end production-ready LLM applications. Judge for Stevie Awards, CODiE Awards, Business Intelligence Group. IEEE paper reviewer.
- **What She'll Value:** Production-ready LLM apps, end-to-end completeness, award-worthy polish, technical writing quality
- **Pitch Angle:** Show the FULL pipeline working end-to-end. She judges industry awards — she's calibrated for high polish.

### Mounish Sunkara
- **Role:** AI Engineer
- **Background:** Enterprise-scale generative AI, LLMs, intelligent systems. Production AI platforms across analytics, automation, knowledge retrieval. IEEE Chicago Section Student Activities Chair.
- **What He'll Value:** Enterprise AI architecture, production readiness, knowledge retrieval systems, academic rigor
- **Pitch Angle:** JSD is academically grounded (information theory). The system does knowledge retrieval + analysis. Show the statistical foundations.

### Sunil Khemka
- **Role:** Patent-holding Senior AI Architect
- **Background:** IEEE Senior Member, IEEE SA contributor. Published author. AI and Data Policy advisor. Deploys trustworthy AI solutions for Fortune 500 financial and healthcare institutions.
- **What He'll Value:** Trustworthy AI, governance, policy compliance, enterprise readiness, IEEE-level rigor
- **Pitch Angle:** Prism IS a trustworthy AI tool — it measures model reliability. Frame it under AI governance: "organizations need to verify their AI outputs before acting on them."
- **⚠️ Opportunity:** If he asks about AI policy/governance angle, lean into it hard. This is his passion.

### Gerald Balekaki
- **Role:** Teaching Professor, CS Department, Illinois Institute of Technology
- **Background:** Large-scale database systems. ML/AI with focus on intelligent data systems and robust data pipelines.
- **What He'll Value:** Data pipeline design, database architecture, ML system design, educational clarity of explanation
- **Pitch Angle:** Explain the data flow clearly — prompt in, fan-out to models, responses stored, divergence computed, results visualized. He's a professor — clarity of explanation matters.

### Bhanu Reddy
- **Role:** Forward Deployed Engineer
- **Background:** AI + manufacturing intersection. Hackathon rapid prototyping expert.
- **What He'll Value:** Rapid prototyping speed, AI application in real-world domains, hackathon execution quality
- **Pitch Angle:** "Built in 36 hours" — show the speed of execution. He's a hackathon rapid prototyping expert.

### Jay Kachhadia
- **Role:** Data Science Manager at Paramount+
- **Background:** Content Data Science, subscriber behavioral modeling (acquisition, conversion, retention). International speaker on production ML. Writes for Towards Data Science (100K+ readers). Mentors emerging talent.
- **What He'll Value:** Data science methodology, production ML practices, clear communication of technical concepts, mentorship-worthy projects
- **Pitch Angle:** JSD is a proper statistical metric used in production ML. Frame our approach as "production ML methodology applied to hallucination detection."

### Alice Yu
- **Role:** Medical Student at UIUC, former Amazon SWE
- **Background:** Big data, bioinformatics. Passionate about clinical informatics + AI for healthcare workflows.
- **What She'll Value:** Healthcare AI applications, data-driven decision making, AI safety in high-stakes domains
- **Pitch Angle:** Healthcare is THE highest-stakes domain for hallucination detection. "A hallucinating medical AI could kill someone. Prism catches that."

### Darshan Botadra *(also listed under Amazon)*
- See Amazon section above.

---

## 💼 INDUSTRY JUDGES (25)

### Aniruddha Pai — Handshake
- **Role:** SWE at Handshake, founding engineer of Handshake AI
- **Background:** UIUC alum. Scalable, data-driven, AI-powered systems for product growth. Helped build and scale Handshake AI team.
- **What He'll Value:** AI-powered product growth, scalable systems, startup execution speed
- **Pitch Angle:** Prism as an AI product with growth potential. Show user-facing value.

### Abhishek Kumar Sharma — Cybersecurity
- **Role:** Cybersecurity professional, 10+ years
- **Background:** Secure identity and authentication in regulated pharma. Mentoring, publishing on Identity + AI security topics.
- **What He'll Value:** Security-conscious design, identity/auth considerations, responsible AI
- **Pitch Angle:** How we secure API keys, handle model outputs safely, prevent prompt injection leaking through.

### Asif Mansoor Amanullah — Apple
- **Role:** Data Engineer at Apple
- **Background:** Petabyte-scale data pipelines and distributed systems (clickstream, event data). Previously Yahoo Champaign. UIUC connection (feels like homecoming).
- **What He'll Value:** Data pipeline design at scale, event-driven architecture, distributed systems
- **Pitch Angle:** Our fan-out pattern is an event-driven data pipeline. Show the data flow architecture.

### Bhavin Jethra — Cloud + AI
- **Role:** SWE specializing in secure cloud and AI systems
- **Background:** Large-scale multi-tenant platforms, edge-to-cloud solutions, AI-driven automation, distributed systems, industrial IoT. Focus on reliability, security, real-world deployment.
- **What He'll Value:** Cloud architecture, edge computing, security, real-world deployability
- **Pitch Angle:** CF Workers = edge compute. Modal = cloud GPU. Show the edge-to-cloud topology.

### Evan Matthews — Audio ML
- **Role:** AI/ML Software Engineer
- **Background:** UIUC CS + Music '23, MS CS '25. Audio technology, impactful software for musicians/composers. Favorite album: Víkingur Ólafsson's Goldberg Variations.
- **What He'll Value:** High-impact tools, ML engineering quality, creative applications of technology, clean execution
- **Pitch Angle:** Prism is a high-impact tool for AI users. Emphasize the UX — heatmap visualization makes complex data accessible and even beautiful.

### Gino Corrales — Cybersecurity
- **Role:** Senior Cybersecurity Analyst
- **Background:** IAM, secure systems design, risk management. Master's in Management & Leadership. Serial hackathon judge/mentor.
- **What He'll Value:** Security design, risk assessment, management quality, hackathon execution
- **Pitch Angle:** Risk framing — "Using an LLM without hallucination detection is a risk management failure."

### Harsh Deep — Modern Treasury
- **Role:** SWE at Modern Treasury, Banks Send team
- **Background:** UIUC Stats + CS. International money movement. Returning judge. Full-stack web dev, HCI, gaze-based interaction, teaching programming, distributed systems. Makes work publicly available.
- **What He'll Value:** Statistical rigor (Stats degree), full-stack quality, HCI/interaction design, open-source mindset, returning judge standards (knows the baseline)
- **Pitch Angle:** JSD appeals to his stats background. The heatmap interaction appeals to his HCI interest. Show mathematical precision + beautiful interaction design.
- **⚠️ Note:** Returning judge — has calibrated expectations. Need to exceed, not just meet.

### Joowon Kim — Unknown
- **Role:** Unknown
- **Background:** "i shitpost on X"
- **What He'll Value:** Unknown — likely values authenticity, humor, and not taking yourself too seriously
- **Pitch Angle:** Be genuine. Don't over-sell. Let the tech speak.

### Josh Carrington — Unknown
- **Role:** Unknown
- **Background:** "Judge profile coming soon."
- **What He'll Value:** TBD
- **Pitch Angle:** Default to clean architecture + working demo.

### Konstantinos Oikonomou — Fulcrum GT
- **Role:** SWE at Fulcrum GT
- **Background:** Full-stack, passion for design and experience architecture. Participated HackIllinois 2019 with GridStrategy project.
- **What He'll Value:** UX design, experience architecture, full-stack quality, hackathon nostalgia
- **Pitch Angle:** Beautiful heatmap UX. Show the interaction design thoughtfulness.

### Kunal Nain — Salesforce
- **Role:** Senior MTS at Salesforce, 5+ years full-stack
- **Background:** Hackathon participant 2018-2019. Returning after career focus.
- **What He'll Value:** Full-stack quality, career-level code maturity, hackathon evolution
- **Pitch Angle:** Show enterprise-quality code written in a hackathon timeframe.

### Manideep Reddy Gillela — AWS
- **Role:** Cloud Infrastructure Architect at AWS
- **Background:** Scalable systems + AI. Mentors engineers at AWS. Bridges weekend hacks and professional-grade skills.
- **What He'll Value:** Cloud architecture, scalability, professional-grade engineering practices
- **Pitch Angle:** Our CF + Modal architecture is production cloud architecture, not a localhost demo.

### Mohammed Rashad — Embedded/XR
- **Role:** Software Engineer, 5+ years
- **Background:** UIUC CS alum. Embedded, XR, and Wearables.
- **What He'll Value:** Engineering quality, embedded systems thinking (efficiency), novel interaction modalities
- **Pitch Angle:** Efficiency of our architecture — lightweight frontend, heavy compute on Modal GPUs.

### Peter Iordanov — Fulcrum GT
- **Role:** Senior SWE Manager at Fulcrum GT, Chicago
- **Background:** Frontend architecture, product-driven engineering. UIUC CS '17. Mentors hackathon teams on shipping fast + building intuitive UX.
- **What He'll Value:** Frontend architecture quality, shipping speed, intuitive UX, mentorship potential
- **Pitch Angle:** Next.js + shadcn/ui frontend architecture. Show we shipped fast AND built intuitive UX.

### Rahul Kumar — Walmart
- **Role:** Senior SWE at Walmart Global Tech, 19 years
- **Background:** Enterprise apps, Java/J2EE, microservices (Spring Boot/Cloud), REST, GCP/Azure. Scalable distributed systems.
- **What He'll Value:** Clean architecture, microservices patterns, API design, enterprise-grade documentation
- **Pitch Angle:** Clean API design between frontend ↔ backend ↔ model services. Show architecture diagrams.

### Raja Navaneeth Mourya Talluri — CME Group
- **Role:** Senior Staff SWE at CME Group
- **Background:** 11+ years FinTech. Ultra-low latency trading platforms. Fault-tolerant distributed systems. 8x employee excellence awards. Technical evaluator, strict code reviewer.
- **What He'll Value:** Ultra-low latency design, fault tolerance, code quality (he does strict reviews), middleware architecture
- **Pitch Angle:** Latency optimization in our fan-out pattern. Fault tolerance — what happens when one model endpoint is down? He'll ask these questions.
- **⚠️ Note:** Strict code reviewer. Code quality matters with this judge.

### Ramya Chaitanya Chintamaneni — Equifax
- **Role:** Senior Cloud Architect at Equifax
- **Background:** Distributed systems, high-availability platforms (AWS/GCP). Global architectures: billions of transactions across 12 regions. FinTech + AI integration.
- **What She'll Value:** Cloud architecture, high availability, global scale thinking, FinTech + AI intersection
- **Pitch Angle:** Multi-region potential of our CF Workers + Modal architecture. FinTech use case for hallucination detection.

### Rodney Louie — Fulcrum GT
- **Role:** Co-founder, Fulcrum GT
- **Background:** Northwestern. Graphic designer → production/IT manager → program manager → co-founder. Award-winning internship program architect.
- **What He'll Value:** Entrepreneurial thinking, program management, visual design, team building
- **Pitch Angle:** Founder perspective — show Prism as a potential business, not just a hackathon project.

### Sahil Garg — Healthcare
- **Role:** Senior Manager, US healthcare company
- **Background:** 18 years IT. Medicare/Medicaid, health benefits, risk assessment. Pursuing AI MS.
- **What He'll Value:** Healthcare AI applications, accessibility, risk reduction, AI learning enthusiasm
- **Pitch Angle:** Healthcare hallucination detection — "When an AI advises a doctor, you need to know if it's hallucinating."

### Saqib Khan — Data Platforms
- **Role:** IT professional, 10+ years
- **Background:** Cloud-native data platforms, data analytics, data warehousing, BI.
- **What He'll Value:** Data architecture, analytics capabilities, BI-style dashboards
- **Pitch Angle:** The heatmap IS a BI dashboard for model trustworthiness. Show the analytics layer.

### Shubham Kulkarni — QVC Group
- **Role:** Product Researcher & Designer
- **Background:** Mechanical engineering → industrial design → digital products. Research-driven design, product strategy, accessibility. Pursuing MBA.
- **What He'll Value:** Accessibility, user research backing, design rationale, inclusive design
- **Pitch Angle:** Accessibility of the heatmap — color choices, screen reader support, progressive disclosure from overview to detail.

### Srinivas Dadi — Zurich Insurance + UIUC
- **Role:** AVP & Architect at Zurich Insurance + UIUC MS CS student
- **Background:** 20+ years industry. Hands-on engineering → enterprise architecture. Currently pursuing MS CS at UIUC.
- **What He'll Value:** Enterprise architecture, mature design patterns, UIUC connection, academic rigor
- **Pitch Angle:** Enterprise architecture quality with academic statistical rigor (JSD from information theory).

### Tazik Shahjahan — Healthcare Founder
- **Role:** Healthcare founder
- **Background:** Former SWE at startups from pre-seed YC to unicorn Series F. UWaterloo CompE. Language learning + LEGO plants.
- **What He'll Value:** Startup mentality, product-market fit, scrappy execution, healthcare applications
- **Pitch Angle:** Startup framing — "We validated this problem in 36 hours and built a working product." Healthcare angle if relevant.

### Yamaan Nandolia — Fulcrum GT
- **Role:** Technical Product Associate at Fulcrum GT
- **Background:** UIC CS + Business + Math '25. Product execution, cross-functional work with engineering and business.
- **What He'll Value:** Product execution quality, cross-functional thinking, clean demo
- **Pitch Angle:** Clean, well-executed demo with clear product narrative.

### Yurii Tovarnytskyi — RunAnywhere (YC W26)
- **Role:** Founder and Design Engineer at RunAnywhere (YC W26)
- **Background:** CTO at WUUXY (Czech startup). JS/Next.js, Python, UX/UI. "Picking the right idea + scope." Volleyball player.
- **What He'll Value:** Idea selection, scope discipline, UX/UI polish, Next.js quality, shipping completeness. YC-trained = startup lens.
- **Pitch Angle:** Tight scope — ONE feature done perfectly. Beautiful shadcn/ui interface. No half-finished features. He will PUNISH scope creep.
- **⚠️ Red Flag:** Any visible "coming soon" or placeholder features. Ship complete or don't ship.

---

## 🎯 CROSS-JUDGE STRATEGY

### Judge Archetype Distribution

| Archetype | Count | What They Care About | How to Win |
|-----------|-------|---------------------|------------|
| **Systems Engineers** | ~20 | Distributed systems, scalability, latency, fault tolerance | Architecture diagram, latency numbers, failure handling |
| **AI/ML Experts** | ~15 | Model architecture, inference quality, ML methodology | JSD math, inference pipeline, token-level analysis |
| **Product/PM** | ~8 | User pain, market fit, impact narrative, execution quality | Lead with pain point, show business value, crisp delivery |
| **Full-Stack/Frontend** | ~8 | UX quality, frontend architecture, visual polish | Beautiful heatmap, smooth interactions, responsive design |
| **Security/Compliance** | ~6 | API key security, data handling, risk management | CF AI Gateway abstracts credentials, input sanitization |

### Optimal 3-Minute Demo Structure

```
[0:00-0:20] HOOK — "Last week, an AI told a lawyer to cite cases that don't exist."
              → Pain is universal. Every judge gets it.

[0:20-0:35] WHAT — "Prism detects hallucinations by comparing how different models
              answer the same question, using information-theoretic distance."
              → One sentence. JSD for AI judges, "distance" for everyone else.

[0:35-1:30] LIVE DEMO — Paste a prompt → Watch fan-out → Heatmap renders
              → Click a red cell → See the divergent claim with per-model breakdown
              → "This claim has a JSD of 0.73 — models strongly disagree."
              → Modal judges see their GPUs working. UX judges see the heatmap.

[1:30-2:10] ARCHITECTURE — Fan-out diagram on screen.
              → "Open-source models run on Modal GPUs. Proprietary via CF AI Gateway.
              → JSD + cosine computed per-claim. Results in real-time."
              → Systems engineers get distributed design. AI judges get methodology.

[2:10-2:45] IMPACT — "Every AI-assisted decision needs a trust score.
              → Healthcare, legal, financial — Prism is the verification layer."
              → PM judges get impact. Founders get market size.

[2:45-3:00] CLOSE — "Not a wrapper. Not a chat UI. A measurement instrument.
              → Built in 36 hours on Modal GPUs."
              → Anti-wrapper positioning for Vasu, Aydan, Karthik.
```

### What to EMPHASIZE

- **Mathematical rigor** — JSD is real information theory, not a made-up score
- **Architecture depth** — Fan-out topology, parallel inference, edge + cloud
- **Working demo** — Show it actually running on Modal GPUs
- **Visual impact** — The heatmap is genuinely impressive and intuitive
- **Anti-wrapper positioning** — "We host models, we don't call APIs"

### What to DE-EMPHASIZE

- Don't oversell the AI angle — 15+ judges ARE AI experts; they'll see through hype
- Don't show unfinished features — Yurii and serial judges will punish scope creep
- Don't bash any specific AI company — Aydan is at OpenAI
- Don't lead with technical jargon — PM judges need the pain point first
- Don't skip the demo for slides — this audience wants to SEE it work

### RED FLAGS TO AVOID

1. **"We used the GPT API"** → Instant credibility loss with Vasu, Aydan, Modal judges
2. **Loading spinners during demo** → Parthiv builds low-latency infra; he'll notice
3. **Scope creep visible in UI** → Yurii will punish incomplete features
4. **No statistical explanation** → Harsh Deep (Stats degree), Phoebe (Stats minor), Sunil (IEEE), Jay (production ML) will ask
5. **Security hand-waving** → 6 security/compliance judges will probe
6. **"It could also do X, Y, Z"** → Ship ONE thing perfectly. Don't promise features.
