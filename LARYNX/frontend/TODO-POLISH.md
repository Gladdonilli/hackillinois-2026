# LARYNX Frontend Polish — Infinite Task List

**Created:** 2026-02-28
**Purpose:** Ever-expanding polish/improvement tracker. Run overnight, iterate forever.

## Original Prompt (Verbatim)
> Face model clips in so not gradual there. Blocks the upper front of the text. Random ass waves look absolutely terrible. Either remove it or change it to something more fitting.
> Backgrounds are locking in all directions. The transparency has flipped over the mouse of the model so you need to make sure it's completely invisible or straight up. Right? Like pin something on the model so that it's always visible. Or you can add, oh my god, wait, good idea! You can add a sign on the side maybe like a floating asteroid or, if you want to go for a different scene, a volatile shaking geometrical object that points to the mouse with an arrow right, which you can say is "Drop files in the mouse to begin" and make the detection mode basically really large so they can't really miss. And after this go ahead and do full-scale sound and music polish in all departments. This is a never-ending task: always improvements, always addition is planned to be ran overnight.

---

## Critical Bugs
- [x] Fix Tone.js RangeError: `Value must be within [0,0], got: 1e-7` in `playResolution` — used `linearRampTo` instead of `rampTo`
- [ ] Fix WebGL Context Lost during portal transition (camera zooms too close → GPU overload?)
- [ ] Fix portal transition: laggy, teleports back, face model clips in abruptly (not gradual)

## Visual — Landing Scene
- [ ] Remove SoundWaveRings (ugly concentric rings around skull) or replace with something fitting
- [ ] Face model blocks LARYNX title text — push model down or raise text higher
- [ ] Add floating geometric beacon near mouth:
  - Volatile/shaking icosahedron or dodecahedron
  - Arrow pointing to mouth
  - Text: "Drop files in the mouth to begin"
  - Large hit detection zone so users can't miss
- [ ] Make drop zone completely invisible (no visible overlay on mouth)
- [ ] Fix background parallax locking in all directions

## Visual — Portal Transition
- [ ] Smooth gradual face zoom (no abrupt clip-in)
- [ ] Better warp/lightspeed streaks (current is lackluster)
- [ ] Camera path should be smooth bezier, not linear

## Sound & Music (Never-ending)
- [ ] Ambient drone improvements — richer harmonic content
- [ ] Upload state sound design
- [ ] Analysis state — tension building
- [ ] Verdict reveal — dramatic stinger
- [ ] Deepfake reveal — horror texture escalation
- [ ] Portal entry sound effect
- [ ] Warp/lightspeed whoosh sound
- [ ] UI interaction earcons polish
- [ ] Background music layer (subtle, reactive)
- [ ] Volume balancing across all states
- [ ] Crossfade improvements between states

## Polish (Ongoing)
- [ ] PostProcessing tuning (bloom, chromatic aberration levels)
- [ ] Particle effects improvements
- [ ] Loading states / skeleton screens
- [ ] Micro-interactions and hover states
- [ ] Performance profiling and optimization
- [ ] Custom cursor improvements
