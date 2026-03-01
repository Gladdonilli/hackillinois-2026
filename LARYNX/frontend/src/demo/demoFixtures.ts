/**
 * Demo data fixtures — generates realistic frame sequences and verdicts
 * for demo mode without hitting the backend.
 *
 * Real voice: smooth 2–8 cm/s velocities, no anomalies
 * Fake voice: starts normal, spikes to 45+ cm/s after frame 18, anomalies flag
 */

import { VELOCITY_THRESHOLDS } from '@/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DemoFrame {
  sensors: Record<string, { x: number; y: number; velocity: number }>
  tongueVelocity: number
  timestamp: number
  isAnomalous: boolean
  f1Hz: number
  f2Hz: number
  f3Hz: number
}

export interface DemoVerdict {
  isGenuine: boolean
  confidence: number
  peakVelocity: number
  threshold: number
  anomalousFrameCount: number
  totalFrameCount: number
  anomalyRatio: number
  reportId: string
  processingTimeMs: number
}

// ---------------------------------------------------------------------------
// Pipeline steps shown during "processing"
// ---------------------------------------------------------------------------

export const DEMO_PIPELINE_STEPS = [
  { message: 'Uploading audio...', percent: 5 },
  { message: 'Extracting features...', percent: 15 },
  { message: 'Running HuBERT encoder...', percent: 35 },
  { message: 'Articulatory analysis (AAI)...', percent: 55 },
  { message: 'Classifying articulator dynamics...', percent: 75 },
  { message: 'Generating report...', percent: 90 },
] as const

// ---------------------------------------------------------------------------
// Sensor names matching backend EMA output
// ---------------------------------------------------------------------------

const SENSOR_NAMES = ['UL', 'LL', 'JAW', 'T1', 'T2', 'T3'] as const

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Smooth sine-based position for a sensor */
function sensorPos(frameIdx: number, sensorIdx: number, scale: number): { x: number; y: number } {
  const phase = sensorIdx * 0.7
  return {
    x: Math.sin(frameIdx * 0.15 + phase) * scale,
    y: Math.cos(frameIdx * 0.12 + phase + 0.3) * scale,
  }
}

export function generateRealFrame(frameIdx: number, totalFrames: number): DemoFrame {
  const t = frameIdx / totalFrames
  // Smooth sine wave — 2–8 cm/s, gentle oscillation
  const baseVelocity = 4 + Math.sin(t * Math.PI * 4) * 3 + randomBetween(-0.5, 0.5)
  const tongueVelocity = Math.max(0.3, Math.min(9, baseVelocity))

  const sensors: Record<string, { x: number; y: number; velocity: number }> = {}
  for (const name of SENSOR_NAMES) {
    const pos = sensorPos(frameIdx, SENSOR_NAMES.indexOf(name), 0.3)
    sensors[name] = { ...pos, velocity: tongueVelocity * randomBetween(0.6, 1.2) }
  }

  return {
    sensors,
    tongueVelocity,
    timestamp: frameIdx * 0.025, // 40fps equivalent
    isAnomalous: false,
    f1Hz: 300 + Math.sin(t * Math.PI * 3) * 200 + 200,
    f2Hz: 1200 + Math.cos(t * Math.PI * 2) * 400,
    f3Hz: 2500 + Math.sin(t * Math.PI * 5) * 200,
  }
}

export function generateFakeFrame(frameIdx: number, totalFrames: number): DemoFrame {
  const t = frameIdx / totalFrames
  const transitionPoint = 18 // Frame where anomalies begin

  let tongueVelocity: number
  let isAnomalous = false

  if (frameIdx < transitionPoint) {
    // Normal-looking start — 3–7 cm/s
    tongueVelocity = 5 + Math.sin(t * Math.PI * 3) * 2 + randomBetween(-0.5, 0.5)
  } else {
    // Rapid escalation after transition
    const progress = (frameIdx - transitionPoint) / (totalFrames - transitionPoint)
    const spike = progress * progress * 60 // Quadratic ramp
    tongueVelocity = 8 + spike + randomBetween(-2, 4)
    isAnomalous = tongueVelocity > VELOCITY_THRESHOLDS.TONGUE
  }

  tongueVelocity = Math.max(0.5, tongueVelocity)

  const sensors: Record<string, { x: number; y: number; velocity: number }> = {}
  for (const name of SENSOR_NAMES) {
    const jitter = isAnomalous ? randomBetween(0.8, 2.5) : 1
    const pos = sensorPos(frameIdx, SENSOR_NAMES.indexOf(name), isAnomalous ? 0.8 : 0.3)
    sensors[name] = { ...pos, velocity: tongueVelocity * randomBetween(0.5, 1.3) * jitter }
  }

  return {
    sensors,
    tongueVelocity,
    timestamp: frameIdx * 0.025,
    isAnomalous,
    f1Hz: 300 + Math.sin(t * Math.PI * 3) * 200 + 200 + (isAnomalous ? randomBetween(-80, 80) : 0),
    f2Hz: 1200 + Math.cos(t * Math.PI * 2) * 400 + (isAnomalous ? randomBetween(-150, 150) : 0),
    f3Hz: 2500 + Math.sin(t * Math.PI * 5) * 200 + (isAnomalous ? randomBetween(-100, 100) : 0),
  }
}

// ---------------------------------------------------------------------------
// Verdict generators
// ---------------------------------------------------------------------------

export function generateRealVerdict(totalFrames: number): DemoVerdict {
  return {
    isGenuine: true,
    confidence: 0.91 + Math.random() * 0.06, // 91–97%
    peakVelocity: 7.2 + Math.random() * 2,
    threshold: VELOCITY_THRESHOLDS.TONGUE,
    anomalousFrameCount: 0,
    totalFrameCount: totalFrames,
    anomalyRatio: 0,
    reportId: `demo-real-${Date.now()}`,
    processingTimeMs: 2800 + Math.random() * 1200,
  }
}

export function generateFakeVerdict(totalFrames: number): DemoVerdict {
  const anomalousCount = totalFrames - 18 + Math.floor(Math.random() * 3)
  return {
    isGenuine: false,
    confidence: 0.94 + Math.random() * 0.05, // 94–99%
    peakVelocity: 45 + Math.random() * 20,
    threshold: VELOCITY_THRESHOLDS.TONGUE,
    anomalousFrameCount: anomalousCount,
    totalFrameCount: totalFrames,
    anomalyRatio: anomalousCount / totalFrames,
    reportId: `demo-fake-${Date.now()}`,
    processingTimeMs: 3200 + Math.random() * 1500,
  }
}
