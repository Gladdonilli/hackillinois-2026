import * as Tone from 'tone';

// Type definition for global augmentation to survive HMR
declare global {
  var __SOUND_ENGINE__: SoundEngine | undefined;
}

export class SoundEngine {
  private isInitialized = false;
  
  // Master bus
  private compressor!: Tone.Compressor;
  private limiter!: Tone.Limiter;

  // Synths (lazily initialized)
  private _dataSynth: Tone.FMSynth | null = null;
  private _alertSynth: Tone.MembraneSynth | null = null;
  private _revealSynth: Tone.PolySynth | null = null;
  private _transitionSynth: Tone.NoiseSynth | null = null;
  private _transitionFilter: Tone.Filter | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): SoundEngine {
    if (!globalThis.__SOUND_ENGINE__) {
      globalThis.__SOUND_ENGINE__ = new SoundEngine();
    }
    return globalThis.__SOUND_ENGINE__;
  }

  public get isReady(): boolean {
    return this.isInitialized;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();
    
    // Setup master bus
    this.compressor = new Tone.Compressor({
      threshold: -12,
      ratio: 4,
      attack: 0.005,
      release: 0.1
    });
    
    this.limiter = new Tone.Limiter(-1);
    
    // Chain master bus to destination
    this.compressor.chain(this.limiter, Tone.getDestination());

    this.isInitialized = true;
  }

  public dispose(): void {
    this._dataSynth?.dispose();
    this._alertSynth?.dispose();
    this._revealSynth?.dispose();
    this._transitionSynth?.dispose();
    this._transitionFilter?.dispose();
    
    this.compressor?.dispose();
    this.limiter?.dispose();
    
    this._dataSynth = null;
    this._alertSynth = null;
    this._revealSynth = null;
    this._transitionSynth = null;
    this._transitionFilter = null;
    
    this.isInitialized = false;
  }

  // --- Lazy Synth Getters ---
  
  private get dataSynth(): Tone.FMSynth {
    if (!this._dataSynth) {
      this._dataSynth = new Tone.FMSynth({
        harmonicity: 1.5,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.3 }
      }).connect(this.compressor);
    }
    return this._dataSynth;
  }

  private get alertSynth(): Tone.MembraneSynth {
    if (!this._alertSynth) {
      this._alertSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        oscillator: { type: 'square4' } as any,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 }
      }).connect(this.compressor);
    }
    return this._alertSynth;
  }

  private get revealSynth(): Tone.PolySynth {
    if (!this._revealSynth) {
      this._revealSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.5, decay: 0.3, sustain: 0.4, release: 2 }
      }).connect(this.compressor);
    }
    return this._revealSynth;
  }

  private get transitionSynth(): Tone.NoiseSynth {
    if (!this._transitionSynth) {
      this._transitionFilter = new Tone.Filter(200, "lowpass").connect(this.compressor);
      this._transitionSynth = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.1, decay: 0.5, sustain: 0, release: 0.5 }
      }).connect(this._transitionFilter);
    }
    return this._transitionSynth;
  }

  // --- Playback Methods ---

  public playData(value: number, intensity: number): void {
    if (!this.isInitialized) return;
    
    // Map value [0,1] to C3-C6 (130.81 - 1046.50 Hz)
    const minFreq = 130.81;
    const maxFreq = 1046.50;
    const freq = minFreq + (Math.max(0, Math.min(1, value)) * (maxFreq - minFreq));
    
    // Map intensity to modulationIndex (1-50)
    const modIndex = 1 + (Math.max(0, Math.min(1, intensity)) * 49);
    
    this.dataSynth.modulationIndex.value = modIndex;
    this.dataSynth.triggerAttackRelease(freq, 0.1);
  }

  public playAlert(): void {
    if (!this.isInitialized) return;
    
    const now = Tone.now();
    this.alertSynth.triggerAttackRelease("C2", "8n", now);
    this.alertSynth.triggerAttackRelease("C2", "8n", now + 0.15);
  }

  public playVerdict(isPositive: boolean): void {
    if (!this.isInitialized) return;
    
    if (isPositive) {
      this.revealSynth.triggerAttackRelease(["C3", "E3", "G3", "C4"], 1.5);
    } else {
      this.revealSynth.triggerAttackRelease(["C2", "C#2", "G2"], 2);
    }
  }

  public playWhoosh(): void {
    if (!this.isInitialized) return;
    
    const synth = this.transitionSynth; // ensures filter is created
    const filter = this._transitionFilter!;
    
    const now = Tone.now();
    filter.frequency.setValueAtTime(200, now);
    // Use setTargetAtTime instead of rampTo per perf rules
    filter.frequency.setTargetAtTime(8000, now, 0.1);
    
    synth.triggerAttackRelease(0.3, now);
  }
}
