# T-12h Decision Gate

**When:** 24 hours into the hackathon (12 hours remaining).
**What:** Score both LARYNX and SYNAPSE. Kill the loser. Pour everything into the survivor.
**Why:** Two half-finished projects lose to one polished project every time.

Stop building. Open this file. Fill in the scorecard. Commit to the result.

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
DATE: _______________
TIME INTO HACKATHON: _____ hours

                        LARYNX    SYNAPSE
Core Loop Working:      ___/5     ___/5
Demo Impact:            ___/5     ___/5
Reliability (x/5 runs): ___/5     ___/5
Polish Runway:          ___/5     ___/5
Narrative Clarity:      ___/5     ___/5
                        -----     -----
TOTAL:                  ___/25    ___/25

DECISION: [ ] LARYNX  [ ] SYNAPSE  [ ] EMERGENCY PIVOT

REASONING (2 sentences max):
____________________________________________
____________________________________________

WHAT TO DO FIRST WITH THE SURVIVING TRACK:
____________________________________________
```

---

## After the Decision

1. Set the loser's Modal `keep_warm` to 0 in `modal_app.py`.
2. Delete the loser's branch from your mental model. Don't touch it again.
3. Write down the three highest-impact things to build in the next 4 hours.
4. Build those three things. Nothing else.
5. At T-4h, run the demo 5 times again. Fix whatever breaks.
6. At T-1h, stop coding. Practice the presentation.
