import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SoundEngine } from '@/audio/SoundEngine'

describe('SoundEngine', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    SoundEngine.dispose()
    await SoundEngine.init()
  })

  afterEach(() => {
    SoundEngine.dispose()
    vi.useRealTimers()
  })

  describe('a) Initialization', () => {
    it('creates audio context and sets initialized to true', () => {
      expect(SoundEngine.isInitialized()).toBe(true)
    })

    it('returns false when disposed', () => {
      SoundEngine.dispose()
      expect(SoundEngine.isInitialized()).toBe(false)
    })
  })

  describe('b) Timer infrastructure', () => {
    it('tracks pending timers during delayed stops and clears them with dispose', () => {
      SoundEngine.cancelAllTransitions()
      expect(SoundEngine.getDebugState().pendingTimers).toBeGreaterThan(0)
      
      SoundEngine.dispose()
      expect(SoundEngine.getDebugState().pendingTimers).toBe(0)
    })
    
    it('clears timers after they execute', () => {
      SoundEngine.cancelAllTransitions()
      expect(SoundEngine.getDebugState().pendingTimers).toBeGreaterThan(0)
      
      vi.advanceTimersByTime(200)
      expect(SoundEngine.getDebugState().pendingTimers).toBe(0)
    })
  })

  describe('c) State transitions', () => {
    it('startTicking sets tickingActive to true', () => {
      SoundEngine.startTicking()
      expect(SoundEngine.getDebugState().tickingActive).toBe(true)
    })

    it('stopTicking clears tickingActive', () => {
      SoundEngine.startTicking()
      SoundEngine.stopTicking()
      expect(SoundEngine.getDebugState().tickingActive).toBe(false)
    })

    it('setTickBPM completes without errors', () => {
      expect(() => SoundEngine.setTickBPM(80)).not.toThrow()
    })
  })

  describe('d) cancelAllTransitions', () => {
    it('resets all flags and clears timers', () => {
      SoundEngine.startTicking()
      SoundEngine.triggerDeepfakeReveal()
      
      SoundEngine.cancelAllTransitions()
      
      const state = SoundEngine.getDebugState()
      expect(state.geigerActive).toBe(false)
      expect(state.revealSequenceActive).toBe(false)
      expect(state.hasGeigerTimer).toBe(false)
      expect(state.hasTickJitterTimer).toBe(false)
    })
  })

  describe('e) getDebugState', () => {
    it('returns correct shape with all expected keys', () => {
      const state = SoundEngine.getDebugState()
      expect(state).toHaveProperty('initialized')
      expect(state).toHaveProperty('contextState')
      expect(state).toHaveProperty('tickingActive')
      expect(state).toHaveProperty('geigerActive')
      expect(state).toHaveProperty('iecAlarmActive')
      expect(state).toHaveProperty('soundtrackActive')
      expect(state).toHaveProperty('revealSequenceActive')
      expect(state).toHaveProperty('pendingTimers')
      expect(state).toHaveProperty('hasGeigerTimer')
      expect(state).toHaveProperty('hasTickJitterTimer')
    })
  })

  describe('f) Geiger control', () => {
    it('startGeigerClicks sets geigerActive to true', () => {
      SoundEngine.startGeigerClicks()
      expect(SoundEngine.getDebugState().geigerActive).toBe(true)
    })

    it('stopGeigerClicks clears geigerActive', () => {
      SoundEngine.startGeigerClicks()
      SoundEngine.stopGeigerClicks()
      expect(SoundEngine.getDebugState().geigerActive).toBe(false)
    })
  })

  describe('g) Velocity updates', () => {
    it('updateVelocity(90) triggers geiger timer and sets active state', () => {
      SoundEngine.updateVelocity(90)
      expect(SoundEngine.getDebugState().geigerActive).toBe(true)
      expect(SoundEngine.getDebugState().hasGeigerTimer).toBe(true)
    })
    
    it('updateVelocity(0) stops geiger timer', () => {
      SoundEngine.updateVelocity(90)
      SoundEngine.updateVelocity(0)
      expect(SoundEngine.getDebugState().geigerActive).toBe(false)
      expect(SoundEngine.getDebugState().hasGeigerTimer).toBe(false)
    })
  })

  describe('h) IEC alarm', () => {
    it('startIECAlarm toggles iecAlarmActive to true', () => {
      SoundEngine.startIECAlarm()
      expect(SoundEngine.getDebugState().iecAlarmActive).toBe(true)
    })

    it('stopIECAlarm toggles iecAlarmActive to false', () => {
      SoundEngine.startIECAlarm()
      SoundEngine.stopIECAlarm()
      expect(SoundEngine.getDebugState().iecAlarmActive).toBe(false)
    })
  })

  describe('i) Soundtrack', () => {
    it('startSoundtrack toggles soundtrackActive to true', () => {
      SoundEngine.startSoundtrack()
      expect(SoundEngine.getDebugState().soundtrackActive).toBe(true)
    })

    it('stopSoundtrack toggles soundtrackActive to false', () => {
      SoundEngine.startSoundtrack()
      SoundEngine.stopSoundtrack()
      expect(SoundEngine.getDebugState().soundtrackActive).toBe(false)
    })
  })

  describe('j) Reveal sequence', () => {
    it('triggerDeepfakeReveal sets revealSequenceActive to true', () => {
      SoundEngine.triggerDeepfakeReveal()
      expect(SoundEngine.getDebugState().revealSequenceActive).toBe(true)
    })

    it('cancelAllTransitions clears revealSequenceActive', () => {
      SoundEngine.triggerDeepfakeReveal()
      SoundEngine.cancelAllTransitions()
      expect(SoundEngine.getDebugState().revealSequenceActive).toBe(false)
    })
  })

  describe('k) Master volume', () => {
    it('setMasterVolume executes without errors', () => {
      expect(() => SoundEngine.setMasterVolume(0.5)).not.toThrow()
    })
    
    it('setMuted executes without errors', () => {
      expect(() => SoundEngine.setMuted(true)).not.toThrow()
    })
  })

  describe('l) Riser', () => {
    it('startRiser and stopRiser run without throwing', () => {
      expect(() => SoundEngine.startRiser()).not.toThrow()
      expect(() => SoundEngine.stopRiser()).not.toThrow()
    })
  })

  describe('m) Portal/warp sounds', () => {
    it('playPortalEntry, playWarpTransition run without throwing', () => {
      expect(() => SoundEngine.playPortalEntry()).not.toThrow()
      expect(() => SoundEngine.playWarpTransition()).not.toThrow()
    })
  })

  describe('Miscellaneous effects', () => {
    it('playBeep and playUploadThunk execute successfully', () => {
      expect(() => SoundEngine.playBeep()).not.toThrow()
      expect(() => SoundEngine.playUploadThunk()).not.toThrow()
    })

    it('playDataPoint executes without error', () => {
      expect(() => SoundEngine.playDataPoint(50)).not.toThrow()
    })
  })
})
