/**
 * Demo analysis stream — emits fake pipeline events into the Zustand store
 * to simulate a full analysis without hitting the backend.
 *
 * Usage: await runDemoStream(store, isFake)
 */

import { useLarynxStore } from '@/store/useLarynxStore'
import {
  DEMO_PIPELINE_STEPS,
  generateRealFrame,
  generateFakeFrame,
  generateRealVerdict,
  generateFakeVerdict,
} from './demoFixtures'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Main demo runner
// ---------------------------------------------------------------------------

const TOTAL_FRAMES = 40
const FRAME_INTERVAL_MS = 120
const STEP_DELAY_MS = 400

/**
 * Runs a complete demo analysis cycle, emitting progress → frames → verdict
 * into the global Zustand store. Respects abort signals.
 */
export async function runDemoStream(isFake: boolean, signal?: AbortSignal): Promise<void> {
  const store = useLarynxStore.getState

  // --- Pipeline steps ---
  store().setStatus('uploading')
  for (const step of DEMO_PIPELINE_STEPS) {
    if (signal?.aborted) return
    store().setProgress({ message: step.message, percent: step.percent })
    await sleep(STEP_DELAY_MS)
  }

  store().setStatus('analyzing')

  // --- Stream frames ---
  const generateFrame = isFake ? generateFakeFrame : generateRealFrame

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    if (signal?.aborted) return
    const frame = generateFrame(i, TOTAL_FRAMES)

    store().addFrame({
      sensors: frame.sensors,
      tongueVelocity: frame.tongueVelocity,
      timestamp: frame.timestamp,
      isAnomalous: frame.isAnomalous,
    })

    store().addFormant({
      f1: frame.f1Hz,
      f2: frame.f2Hz,
      f3: frame.f3Hz,
      timestamp: frame.timestamp,
    })

    await sleep(FRAME_INTERVAL_MS)
  }

  if (signal?.aborted) return

  // --- Verdict ---
  const verdict = isFake
    ? generateFakeVerdict(TOTAL_FRAMES)
    : generateRealVerdict(TOTAL_FRAMES)

  store().setVerdict(verdict)
  store().setStatus('complete')
  store().setProgress({ message: 'Analysis complete', percent: 100 })
}
