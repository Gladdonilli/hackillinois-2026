# Demo Day Checklist

Start this 30 minutes before judging. Not 10 minutes. Not "when they call your name." Thirty minutes. Set a timer.

---

## Infrastructure (T-30 min)

- [ ] **Modal endpoint warm.** Hit `/health` on the active project's endpoint. Response must come back in < 500ms. If it takes longer, the container is cold-starting. Hit it again and wait.
  ```bash
  curl -w "\n%{time_total}s" https://your-workspace--hackillinois-2026-larynxprocessor-health.modal.run
  ```
- [ ] **Preflight 3 full demo runs.** Not "click around the UI." The full flow, start to finish, 3 times. All 3 must succeed. If any fail, you have 25 minutes to fix it. If you can't fix it in 25 minutes, switch to the offline fallback.
- [ ] **CF Pages deployment is live.** Load your production URL in a fresh incognito tab. Confirm it loads, WebGL context initializes, no console errors.

## Demo Content (T-25 min)

- [ ] **Audio/prompt samples loaded and tested.**
  - LARYNX: 1 genuine WAV + 1 deepfake WAV. Both tested end-to-end. Genuine returns "genuine," deepfake returns "deepfake." Not the other way around.
  - SYNAPSE: 3 different prompts. Each tested with the feature ablation flow. All produce visibly different steered output.
- [ ] **Backup samples on local disk.** Copy your test files to `~/demo-backup/`. If your CDN goes down or you accidentally delete something, you can drag-and-drop from the local folder. No network dependency for the core demo input.
- [ ] **Supermemory pre-populated.** Add 2-3 pre-existing analysis entries so the history panel looks like a real product with actual usage, not an empty state someone built 6 hours ago.

## Hardware (T-20 min)

- [ ] **Laptop plugged in.** GPU-heavy WebGL + continuous network requests = battery drain. A dead laptop mid-demo is not recoverable.
- [ ] **Audio output tested.** (LARYNX only) Play a test sound through your speakers or the venue's audio system. Confirm volume is audible from 10 feet away but not distorted. If the venue has no audio hookup, make sure your laptop speakers are at max and mention to judges "lean in for the audio."
- [ ] **Screen resolution set to 1080p.** Projectors and external monitors default to 1080p. If your UI is designed for 1440p or 4K, elements will be too small. Set it now, verify the layout holds.

## Browser (T-15 min)

- [ ] **Browser tab pre-loaded.** Open your demo URL. Let WebGL initialize, models load, shaders compile. First-load stutter is normal. You want all that done before judges arrive.
- [ ] **WebGL context confirmed.** Open DevTools console, type `document.querySelector('canvas').getContext('webgl2')`. If it returns null, your GPU driver is acting up. Restart the browser. If it's still null, restart the laptop.
- [ ] **DevTools closed.** Judges don't need to see your console. Close DevTools. Check there's no persistent console overlay or debug panel visible.
- [ ] **Console clean.** Before closing DevTools, scan for red errors. Yellow warnings are fine. Red errors mean something might break mid-demo. Fix or suppress.
- [ ] **No other tabs open.** Close Slack, Discord, email, GitHub. Notifications popping up mid-demo are distracting and unprofessional.

## Fallbacks (T-10 min)

- [ ] **Offline fallback ready.** Pre-recorded screen capture of the full demo flow, 15-20 seconds. Store as `~/demo-backup/demo-recording.mp4`. If everything catches fire, you play this video and say "here's what it looks like when the server is available, let me walk you through what's happening."
  ```bash
  # Record with ffmpeg if you haven't already
  ffmpeg -f x11grab -r 30 -s 1920x1080 -i :0.0 -t 20 -c:v libx264 -preset ultrafast ~/demo-backup/demo-recording.mp4
  ```
- [ ] **"At capacity" messaging.** If Modal is down or your GPU quota is exhausted, the UI should show something like "Live analysis currently at capacity" with a smooth animation, not a raw error stack trace or a blank screen. Test this by temporarily pointing the API URL to a dead endpoint.

## Presentation (T-5 min)

- [ ] **Timer visible.** Pull up a stopwatch app on your phone or a second monitor. Practice hitting the 3:00 mark exactly. Most hackathon presentations are 3 minutes. Going over means getting cut off mid-sentence, which is the worst possible ending.
- [ ] **Opening line rehearsed.** Say it out loud once. Not in your head. Out loud. First 10 seconds set the energy for the entire pitch.
- [ ] **"One more thing" moment planned.** Know exactly when the skull-clip / neuron-death moment happens. Build to it. Pause before it. Let judges react.

---

## Emergency Procedures

### Modal is down
1. Show the pre-recorded video
2. Walk through the code on screen ("here's the pipeline, here's where the GPU inference happens")
3. If Modal comes back during judging, offer a live demo as a bonus

### WebGL crashes
1. Refresh the tab (sometimes context loss is recoverable)
2. If it crashes again, switch to a backup browser (have Chrome and Firefox both ready)
3. Last resort: show the video, explain the rendering pipeline verbally

### Results look wrong
1. Don't panic visibly
2. Say "let me try a different sample" and use your backup audio/prompt
3. If that also fails, switch to the video fallback
4. Never say "it was working 5 minutes ago." Judges have heard that a thousand times.

### You freeze mid-pitch
1. Take a breath
2. Click the next thing in the demo
3. Let the visual speak while you collect yourself
4. Resume with "so what you're seeing here is..."
