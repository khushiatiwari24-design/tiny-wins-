/**
 * Web Audio API Sound & Study Music Engine
 * 100% native synthesis - zero external MP3s, zero network requests, 100% offline.
 */

export type FocusAudioType =
  | "off"
  | "rain"
  | "cafe"
  | "brown"
  | "lofi"
  | "alpha"
  | "piano";

export interface FocusAudioTrack {
  id: FocusAudioType;
  label: string;
  icon: string;
  description: string;
  category: "ambient" | "music";
}

export const FOCUS_AUDIO_TRACKS: FocusAudioTrack[] = [
  { id: "off", label: "Off", icon: "🔇", description: "Mute all audio", category: "ambient" },
  { id: "rain", label: "Rain", icon: "🌧️", description: "Soothing rainfall noise", category: "ambient" },
  { id: "cafe", label: "Cafe", icon: "☕", description: "Warm pink noise ambiance", category: "ambient" },
  { id: "brown", label: "Brown", icon: "🌊", description: "Deep brown noise for ADHD focus", category: "ambient" },
  { id: "lofi", label: "Lo-Fi", icon: "🎹", description: "Chill vintage chords & vinyl beat", category: "music" },
  { id: "alpha", label: "Alpha Waves", icon: "🧠", description: "10Hz binaural study beat & pad", category: "music" },
  { id: "piano", label: "Soft Piano", icon: "🌌", description: "Gentle harmonic study notes", category: "music" },
];

class FocusAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: FocusAudioType = "off";
  private currentVolume: number = 0.6;

  // Active nodes & timers for cleanup
  private activeSources: AudioNode[] = [];
  private activeTimers: number[] = [];

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private initMasterGain(ctx: AudioContext): GainNode {
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    this.updateMasterVolume();
    return this.masterGain;
  }

  private updateMasterVolume(): void {
    if (this.masterGain && this.ctx) {
      const vol = Math.max(0, Math.min(1, this.currentVolume));
      this.masterGain.gain.setValueAtTime(vol * 0.35, this.ctx.currentTime);
    }
  }

  public setVolume(volume: number): void {
    this.currentVolume = volume;
    this.updateMasterVolume();
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getCurrentTrack(): FocusAudioType {
    return this.currentTrack;
  }

  public isPlaying(): boolean {
    return this.currentTrack !== "off";
  }

  public stop(): void {
    // Clear all interval/timeout timers
    for (const timer of this.activeTimers) {
      window.clearInterval(timer);
      window.clearTimeout(timer);
    }
    this.activeTimers = [];

    // Stop and disconnect all active nodes
    for (const node of this.activeSources) {
      try {
        if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore already stopped nodes
      }
    }
    this.activeSources = [];
    this.currentTrack = "off";
  }

  public play(track: FocusAudioType): void {
    if (track === "off") {
      this.stop();
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    this.stop();
    this.currentTrack = track;
    const master = this.initMasterGain(ctx);

    try {
      switch (track) {
        case "rain":
          this.startRain(ctx, master);
          break;
        case "cafe":
          this.startCafe(ctx, master);
          break;
        case "brown":
          this.startBrown(ctx, master);
          break;
        case "lofi":
          this.startLoFi(ctx, master);
          break;
        case "alpha":
          this.startAlphaWaves(ctx, master);
          break;
        case "piano":
          this.startSoftPiano(ctx, master);
          break;
      }
    } catch (err) {
      console.warn("Could not start focus audio:", err);
    }
  }

  // 1. Rain Ambiance
  private startRain(ctx: AudioContext, master: GainNode): void {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        const droplet = Math.random() > 0.998 ? Math.random() * 0.28 : 0;
        data[i] = (b0 + b1 + b2) * 0.2 + droplet;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, ctx.currentTime);

    source.connect(filter);
    filter.connect(master);
    source.start();

    this.activeSources.push(source, filter);
  }

  // 2. Cafe Pink Noise
  private startCafe(ctx: AudioContext, master: GainNode): void {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.1;
        b6 = white * 0.115926;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(650, ctx.currentTime);
    filter.Q.setValueAtTime(0.7, ctx.currentTime);

    source.connect(filter);
    filter.connect(master);
    source.start();

    this.activeSources.push(source, filter);
  }

  // 3. Brown Noise (ADHD focus)
  private startBrown(ctx: AudioContext, master: GainNode): void {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 1.8;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    source.connect(filter);
    filter.connect(master);
    source.start();

    this.activeSources.push(source, filter);
  }

  // 4. Lo-Fi Study Chords & Tape Beat
  private startLoFi(ctx: AudioContext, master: GainNode): void {
    // 1. Vinyl crackle loop
    const crackleBufferSize = ctx.sampleRate * 3;
    const crackleBuffer = ctx.createBuffer(1, crackleBufferSize, ctx.sampleRate);
    const cData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < crackleBufferSize; i++) {
      const isPop = Math.random() > 0.9996;
      cData[i] = isPop ? (Math.random() * 2 - 1) * 0.35 : (Math.random() * 2 - 1) * 0.015;
    }
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;
    crackleSource.loop = true;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = "bandpass";
    crackleFilter.frequency.setValueAtTime(2200, ctx.currentTime);
    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.2, ctx.currentTime);

    crackleSource.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(master);
    crackleSource.start();
    this.activeSources.push(crackleSource, crackleFilter, crackleGain);

    // 2. Chilled Lo-Fi Chord Progression: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
    const chords: number[][] = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
      [164.81, 196.00, 246.94, 293.66], // Em7   (E3, G3, B3, D4)
      [146.83, 174.61, 220.00, 261.63], // Dm7   (D3, F3, A3, C4)
      [130.81, 164.81, 196.00, 246.94], // Cmaj7 (C3, E3, G3, B3)
    ];

    let chordIndex = 0;

    const playChord = () => {
      if (this.currentTrack !== "lofi") return;
      const currentChord = chords[chordIndex % chords.length];
      chordIndex++;

      const now = ctx.currentTime;
      const chordDuration = 3.6;

      // Soft kick pulse on chord start
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = "sine";
      kickOsc.frequency.setValueAtTime(95, now);
      kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
      kickGain.gain.setValueAtTime(0.4, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      kickOsc.connect(kickGain);
      kickGain.connect(master);
      kickOsc.start(now);
      kickOsc.stop(now + 0.18);

      // Play warm rhodes/electric piano notes
      for (const freq of currentChord) {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        // Subtle tape flutter/vibrato LFO
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(4.2, now);
        lfoGain.gain.setValueAtTime(2.2, now);
        lfo.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + chordDuration);

        // Warm lowpass filter
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(750, now);
        filter.frequency.exponentialRampToValueAtTime(480, now + chordDuration);

        // Gentle envelope
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(0.12, now + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.06, now + 1.2);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + chordDuration - 0.05);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(master);

        osc.start(now);
        osc.stop(now + chordDuration);
      }
    };

    playChord();
    const chordTimer = window.setInterval(playChord, 3500);
    this.activeTimers.push(chordTimer);
  }

  // 5. 10Hz Alpha Waves Binaural Beats + Warm Drone
  private startAlphaWaves(ctx: AudioContext, master: GainNode): void {
    // Left ear: 200 Hz
    const leftOsc = ctx.createOscillator();
    const leftGain = ctx.createGain();
    leftOsc.type = "sine";
    leftOsc.frequency.setValueAtTime(200, ctx.currentTime);
    leftGain.gain.setValueAtTime(0.18, ctx.currentTime);

    // Right ear: 210 Hz (210 - 200 = 10Hz Alpha binaural beat)
    const rightOsc = ctx.createOscillator();
    const rightGain = ctx.createGain();
    rightOsc.type = "sine";
    rightOsc.frequency.setValueAtTime(210, ctx.currentTime);
    rightGain.gain.setValueAtTime(0.18, ctx.currentTime);

    // Channel merger for true stereo binaural separation
    const merger = ctx.createChannelMerger(2);
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0); // left to ch 0

    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1); // right to ch 1

    merger.connect(master);

    leftOsc.start();
    rightOsc.start();
    this.activeSources.push(leftOsc, rightOsc, leftGain, rightGain, merger);

    // Layer with deep warm ambient pad
    const padOsc1 = ctx.createOscillator();
    const padOsc2 = ctx.createOscillator();
    const padFilter = ctx.createBiquadFilter();
    const padGain = ctx.createGain();

    padOsc1.type = "triangle";
    padOsc1.frequency.setValueAtTime(100, ctx.currentTime);

    padOsc2.type = "sine";
    padOsc2.frequency.setValueAtTime(100.5, ctx.currentTime); // subtle phase chorus

    padFilter.type = "lowpass";
    padFilter.frequency.setValueAtTime(320, ctx.currentTime);

    padGain.gain.setValueAtTime(0.14, ctx.currentTime);

    padOsc1.connect(padFilter);
    padOsc2.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(master);

    padOsc1.start();
    padOsc2.start();
    this.activeSources.push(padOsc1, padOsc2, padFilter, padGain);
  }

  // 6. Soft Ambient Piano (Harmonic Pentatonic Study Notes)
  private startSoftPiano(ctx: AudioContext, master: GainNode): void {
    const scale = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
    ];

    let noteIdx = 0;

    const playPianoNote = () => {
      if (this.currentTrack !== "piano") return;
      const now = ctx.currentTime;
      const freq = scale[noteIdx % scale.length];
      noteIdx = (noteIdx + Math.floor(Math.random() * 3) + 1) % scale.length;

      // Primary tone: warm triangle
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      // Soft harmonic sparkle
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 2, now);

      // Acoustic hammer damping filter
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 2.5);

      // Long natural piano decay
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 3.3);
      osc2.stop(now + 3.3);
    };

    playPianoNote();
    const pianoTimer = window.setInterval(playPianoNote, 1900);
    this.activeTimers.push(pianoTimer);
  }
}

// Global singleton instance for seamless playback across components
export const focusAudio = new FocusAudioEngine();
