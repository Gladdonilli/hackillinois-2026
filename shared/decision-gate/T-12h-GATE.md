# T-12h Decision Gate

**When:** 24 hours into the hackathon (12 hours remaining).
**What:** LARYNX selected. SYNAPSE archived. All remaining effort goes to LARYNX.
**Why:** Two half-finished projects lose to one polished project every time. Decision made — LARYNX won.

Gate completed. LARYNX selected. See scorecard below.

---

## Scoring Dimensions

Each dimension scores 1-5. Total is /25.

### 1. Core Loop Working (5 pts)

Does the end-to-end pipeline produce real output right now?

| Score | LARYNX (audio → result) | SYNAPSE (prompt → result) |
|-------|------------------------|--------------------------|
| 1 | Upload works but nothing comes back | Prompt submits but no generation |
| 2 | Returns raw formant data, no verdict | Returns base generation, no steering |
| 3 | Returns verdict (real/fake) but accuracy is coin-flip | Steers one feature, output noticeably changes |
| 4 | Verdict is correct on test samples, EMA data renders | Multi-feature steering works, ablation visible in output |
| 5 | Full pipeline: upload → EMA → 3D → verdict, works on novel audio | Full pipeline: prompt → features → ablate → regen, delta is obvious |

### 2. Demo Impact (5 pts)

Does the key visual moment land? Show it to an imaginary judge for 5 seconds.

| Score | LARYNX | SYNAPSE |
|-------|--------|---------|
| 1 | Static skull, no movement | Static brain, no activity |
| 2 | Skull animates but tongue motion isn't visible | Brain renders but feature highlights are unclear |
| 3 | Tongue moves, but real vs deepfake looks similar | Features light up, but ablation effect is subtle |
| 4 | Deepfake tongue clearly clips through skull, visceral | Neuron death is visible, output change is dramatic |
| 5 | Full choreography: smooth → glitch → skull-clip → judge gasps | Full sequence: healthy → ablate → watch the lie vanish → judge gasps |

### 3. Reliability (5 pts)

Run the demo 5 times in a row. Count successes.

| Score | Meaning |
|-------|---------|
| 1 | 1/5 or 0/5 succeed |
| 2 | 2/5 succeed |
| 3 | 3/5 succeed |
| 4 | 4/5 succeed |
| 5 | 5/5 succeed, no errors, no jank, no freezes |

Don't fudge this. Run it 5 times. Write down the number.

### 4. Polish Runway (5 pts)

How much can you ship in 12 hours given current state?

| Score | Meaning |
|-------|---------|
| 1 | Core loop is broken, 12h is barely enough to fix fundamentals |
| 2 | Core works but UI is raw divs, no animation, no sound |
| 3 | Core + basic UI, 12h gets you animations and one polished flow |
| 4 | Core + decent UI, 12h gets you sound design, transitions, loading states |
| 5 | Core + good UI, 12h is pure polish: micro-interactions, narrative pacing, backup flows |

### 5. Narrative Clarity (5 pts)

Say your one-liner out loud. Does it make someone stop and listen?

| Score | Meaning |
|-------|---------|
| 1 | You can't explain what it does in under 30 seconds |
| 2 | You can explain it, but it sounds like a class project |
| 3 | Clear explanation, judges nod but don't lean forward |
| 4 | One sentence, judges visibly react ("wait, really?") |
| 5 | Pure "oh shit" energy. They want to see it before you finish talking |

**LARYNX one-liner:** "We reverse-engineer the tongue movements from any audio clip, and deepfakes require physically impossible speeds... watch the tongue clip through the skull."

**SYNAPSE one-liner:** "We found the neuron that makes GPT lie. Watch us kill it in real-time and ask the same question again."

---

## Hard Kill Rules

- **Score < 15:** Killed immediately. No appeals.
- **Both < 15:** Emergency pivot. Pick whichever has more code actually running (not more code written... running).
- **Both < 10:** You're in trouble. Strip to the absolute minimum viable demo for the higher scorer and spend 12h making that one flow bulletproof.

## Tie-Breaker

If scores are within 2 points of each other, pick the one with the **higher Reliability score**. Demo day is live. A beautiful demo that crashes on stage loses to an ugly demo that works every time.

If Reliability is also tied, pick the one with the higher Core Loop score.

---

## Scorecard Template

Fill this in at T-12h. Be honest. Nobody sees this but you.

```
DATE: 2026-02-28
TIME INTO HACKATHON: 24 hours

                        LARYNX    SYNAPSE
Core Loop Working:      4/5       2/5
Demo Impact:            5/5       3/5
Reliability (x/5 runs): 4/5       2/5
Polish Runway:          4/5       3/5
Narrative Clarity:      5/5       4/5
                        -----     -----
TOTAL:                  22/25     14/25

DECISION: [x] LARYNX  [ ] SYNAPSE  [ ] EMERGENCY PIVOT

REASONING: LARYNX has full pipeline working (upload → EMA → 3D → verdict),
skull-clip moment is visceral and demo-ready. SYNAPSE core loop incomplete.

WHAT TO DO FIRST WITH THE SURVIVING TRACK:
Wire AAI pretrained weights into Modal backend, polish 3D skull-clip animation.
```

---

## After the Decision

1. SYNAPSE Modal `keep_warm` set to 0.
2. SYNAPSE is archived. Don't touch it again.
3. Focus: AAI weights integration, 3D polish, demo reliability.
4. At T-4h, run the demo 5 times. Fix whatever breaks.
5. At T-1h, stop coding. Practice the presentation.
