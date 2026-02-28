# PROJECT AGENTS.MD — HackIllinois VM

**Last Updated:** 2026-02-28

VM-specific overrides for the GCP dev VM (30-core AMD EPYC 9B14, 57 GiB RAM, 150 GB NVMe).

---

## VM RESOURCE PROFILE

| Resource | Spec | Typical Usage |
| -------- | ---- | ------------- |
| **CPU** | 30 vCPUs (AMD EPYC 9B14) | <1% idle |
| **RAM** | 57 GiB | ~3 GiB used (~5%) |
| **Disk** | 150 GB NVMe | ~68 GB used (47%) |
| **Swap** | None | No safety net — monitor memory |
| **Network** | GCP internal | Low-latency to API proxies |

This VM is massively overprovisioned for OpenCode workloads. All resource-conservation defaults from the global AGENTS.md are overridden below.

---

## OVERRIDES FROM GLOBAL AGENTS.MD

### LSP: EAGER MODE (overrides "auto-detection" global default)

LSPs are configured for **eager activation** in `opencode.json` on this VM. This is intentional — the VM has 54 GiB free RAM, so the 2-4 GB cost of eager LSP spawning is negligible.

Enabled: typescript, python, go, json, yaml, css, html.

Do NOT remove the `lsp` block from `opencode.json` on this VM. The global AGENTS.MD warning about eager spawning does not apply here.

### AGENT CONCURRENCY: MAXIMIZED

Provider concurrency in `oh-my-opencode.jsonc` is set high because the user has 7 API provider accounts behind proxy, making API rate limits effectively a non-issue:

| Provider | Global Default | This VM |
| -------- | -------------- | ------- |
| anthropic | 15 | **60** |
| openai | 10 | **40** |
| google | 50 | **100** |
| default | 30 | **100** |

**Prompting strategy**: Spam agents liberally. Fire 5-10 explore agents per research question, 3-5 librarians for external lookups. The VM and API accounts can handle it.

### NODE_OPTIONS: GLOBAL HEAP INCREASE

`~/.bashrc` exports `NODE_OPTIONS="--max-old-space-size=16384"` — gives all Node processes (MCPs, LSPs) a 16 GB heap ceiling. The Sourcegraph MCP no longer has its own `NODE_OPTIONS` override and inherits this global setting.

### DCP CONTEXT LIMIT: 65%

Gladforge DCP `contextLimit` is set to 65% (global default was 55%). This delays compression nudges, keeping more raw context available before compaction kicks in. Do not raise above 65% — user explicitly capped it here.

### PTY BUFFER: 500K LINES

`maxBufferLines` increased from 50,000 to 500,000. Sufficient for long build logs and test output on a VM with abundant RAM.

---

## PARALLELISM GUIDELINES (VM-SPECIFIC)

Since the VM is idle and API rate limits are not a concern:

| Pattern | Minimum | Target |
| ------- | ------- | ------ |
| Explore agents per question | 3 | 5-10 |
| Librarian agents per question | 2 | 3-5 |
| Parallel task() delegations | 2 | 5-8 |
| Oracle | 1 | 1 (quality > quantity) |
| Background agents total | 5 | 15-20 |

Fire explore/librarian as background grep — always `run_in_background=true`, always parallel. The VM won't notice.

---

## BUILD PARALLELISM

Default to `-j 30` for make/cargo/ninja builds (match core count). If Gladforge cloud module is enabled, override the default `-j 10` to `-j 30`.

---

## THINGS NOT TO CHANGE

- **No swap**: Don't configure swap. If you hit memory pressure, something is wrong — investigate the leak.
- **DCP ceiling**: Do NOT raise `contextLimit` above 65%. User decision.
- **Provider concurrency**: Can be raised further if needed, but current values are already well above what a single session will use.
