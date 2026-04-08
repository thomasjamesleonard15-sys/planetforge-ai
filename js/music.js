let ctx = null;
let masterGain = null;
let playing = false;
let nodes = [];
let loopTimer = null;

const SCALES = {
  galaxy: [0, 3, 5, 7, 10, 12, 15, 17],       // minor pentatonic + octave
  space: [0, 2, 4, 7, 9, 12, 14, 16],           // major pentatonic
  surface: [0, 2, 3, 5, 7, 8, 10, 12],          // natural minor
  battle: [0, 1, 4, 5, 7, 8, 11, 12],           // harmonic minor
  batman: [0, 1, 3, 5, 7, 8, 10, 12],           // phrygian — dark and dramatic
};

const BASE_NOTES = {
  galaxy: 55,    // A1
  space: 65.41,  // C2
  surface: 73.42, // D2
  battle: 61.74, // B1
  batman: 48.99, // G1 — deep and dark
};

export class MusicSystem {
  constructor() {
    this.mode = 'galaxy';
    this.volume = 0.7;
    this.muted = false;
    this.beat = 0;
    this.measureLen = 8;
    this.bpm = 72;
    this.nextNoteTime = 0;
  }

  init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = this.volume;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.beat = 0;
    this.bpm = mode === 'batman' ? 95 : mode === 'space' ? 60 : 72;
  }

  toggle() {
    this.muted = !this.muted;
    if (masterGain) masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, ctx.currentTime, 0.3);
  }

  start() {
    this.init();
    if (ctx.state === 'suspended') ctx.resume();
    if (playing) return;
    playing = true;
    this.nextNoteTime = ctx.currentTime;
    this.schedule();
  }

  stop() {
    playing = false;
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    for (const n of nodes) { try { n.stop(); } catch (_) {} }
    nodes = [];
  }

  schedule() {
    if (!playing) return;
    while (this.nextNoteTime < ctx.currentTime + 0.2) {
      this.playBeat(this.nextNoteTime);
      this.beat = (this.beat + 1) % (this.measureLen * 4);
      this.nextNoteTime += 60 / this.bpm / 2;
    }
    loopTimer = setTimeout(() => this.schedule(), 100);
  }

  playBeat(time) {
    if (this.mode === 'batman') { this.playBatmanBeat(time); return; }
    if (this.mode === 'space') { this.playSpaceBeat(time); return; }
    const scale = SCALES[this.mode] || SCALES.galaxy;
    const base = BASE_NOTES[this.mode] || 55;
    const beat = this.beat;

    // Bass drone - plays on beat 0 of each measure
    if (beat % this.measureLen === 0) {
      this.playTone(base, time, 1.5, 'sine', 0.25, 0);
      this.playTone(base * 1.5, time, 1.5, 'sine', 0.12, 0);
    }

    // Sub bass pulse
    if (beat % 4 === 0) {
      this.playTone(base * 0.5, time, 0.4, 'sine', 0.2, 0);
    }

    // Melody - procedural based on beat position
    if (beat % 2 === 0 && Math.random() > 0.3) {
      const idx = this.melodyIndex(beat);
      const note = base * 2 * Math.pow(2, scale[idx % scale.length] / 12);
      const dur = Math.random() > 0.5 ? 0.4 : 0.2;
      this.playTone(note, time, dur, 'triangle', 0.15, 0.01);
    }

    // High shimmer - arpeggiated notes
    if (beat % 3 === 0 && Math.random() > 0.5) {
      const idx = (beat / 3 + (Math.random() * 3 | 0)) % scale.length;
      const note = base * 4 * Math.pow(2, scale[idx] / 12);
      this.playTone(note, time, 0.6, 'sine', 0.08, 0.05);
    }

    // Pad chord - sustained, changes every 2 measures
    if (beat === 0 || beat === this.measureLen * 2) {
      const chordRoot = beat === 0 ? 0 : (Math.random() > 0.5 ? 3 : 5);
      const root = base * 2 * Math.pow(2, scale[chordRoot % scale.length] / 12);
      const third = base * 2 * Math.pow(2, scale[(chordRoot + 2) % scale.length] / 12);
      const fifth = base * 2 * Math.pow(2, scale[(chordRoot + 4) % scale.length] / 12);
      this.playPad(root, time, 3, 0.08);
      this.playPad(third, time, 3, 0.06);
      this.playPad(fifth, time, 3, 0.06);
    }

    // Percussion - mode dependent
    if (this.mode === 'battle' || this.mode === 'space') {
      if (beat % 4 === 0) this.playNoise(time, 0.08, 0.12, 800);
      if (beat % 4 === 2) this.playNoise(time, 0.05, 0.06, 3000);
      if (beat % 2 === 1 && Math.random() > 0.6) this.playNoise(time, 0.03, 0.04, 5000);
    } else {
      if (beat % 8 === 0) this.playNoise(time, 0.1, 0.06, 600);
      if (beat % 8 === 4 && Math.random() > 0.4) this.playNoise(time, 0.06, 0.04, 2000);
    }
  }

  playBatmanBeat(time) {
    const scale = SCALES.batman;
    const base = BASE_NOTES.batman;
    const beat = this.beat;

    // Deep power bass — heavy hits on downbeats
    if (beat % 8 === 0) {
      this.playTone(base, time, 2, 'sawtooth', 0.2, 0.02);
      this.playTone(base * 0.5, time, 2.5, 'sine', 0.25, 0.01);
      this.playTone(base * 1.5, time, 1.5, 'triangle', 0.1, 0.02);
    }

    // Pounding war drums
    if (beat % 4 === 0) {
      this.playNoise(time, 0.15, 0.2, 100);
      this.playTone(base * 0.25, time, 0.3, 'sine', 0.3, 0);
    }
    if (beat % 4 === 2) {
      this.playNoise(time, 0.1, 0.15, 150);
    }
    // Aggressive snare hits
    if (beat % 8 === 4) {
      this.playNoise(time, 0.08, 0.18, 3000);
      this.playNoise(time + 0.01, 0.06, 0.1, 5000);
    }
    // Fast hi-hat drive
    if (beat % 2 === 0) {
      this.playNoise(time, 0.03, 0.06, 8000);
    }
    if (beat % 2 === 1 && Math.random() > 0.3) {
      this.playNoise(time, 0.02, 0.04, 10000);
    }

    // Dark brass stabs — power fifth intervals
    if (beat % 16 === 0 || beat % 16 === 6) {
      const root = base * 2;
      const fifth = root * Math.pow(2, 7 / 12);
      this.playTone(root, time, 0.6, 'sawtooth', 0.12, 0.03);
      this.playTone(fifth, time, 0.6, 'sawtooth', 0.08, 0.03);
      this.playTone(root * 2, time, 0.4, 'square', 0.05, 0.03);
    }

    // Dramatic string melody
    if (beat % 2 === 0 && Math.random() > 0.2) {
      const patterns = [0, 3, 5, 7, 5, 3, 0, 7, 5, 3, 1, 0, 3, 5, 7, 5];
      const idx = patterns[beat % patterns.length] + ((beat / 16 | 0) % 2);
      const note = base * 4 * Math.pow(2, scale[idx % scale.length] / 12);
      this.playTone(note, time, 0.35, 'sawtooth', 0.09, 0.02);
      this.playTone(note * 1.003, time, 0.35, 'sawtooth', 0.06, 0.02);
    }

    // Ominous low pad — shifts every 2 measures
    if (beat === 0 || beat === this.measureLen * 2) {
      const chordIdx = beat === 0 ? 0 : 3;
      const root = base * 2 * Math.pow(2, scale[chordIdx] / 12);
      const third = base * 2 * Math.pow(2, scale[(chordIdx + 2) % scale.length] / 12);
      const fifth = base * 2 * Math.pow(2, scale[(chordIdx + 4) % scale.length] / 12);
      this.playPad(root, time, 4, 0.07);
      this.playPad(third, time, 4, 0.05);
      this.playPad(fifth, time, 4, 0.05);
    }

    // Tension risers on offbeats
    if (beat % 8 === 3 || beat % 8 === 7) {
      const note = base * 3 * Math.pow(2, scale[(beat * 3) % scale.length] / 12);
      this.playTone(note, time, 0.2, 'square', 0.06, 0.01);
    }

    // Eerie whisper tones — high detuned sine ghosts
    if (beat % 16 === 0 && Math.random() > 0.4) {
      const ghost = base * 8 * Math.pow(2, scale[Math.floor(Math.random() * scale.length)] / 12);
      this.playTone(ghost, time, 2.5, 'sine', 0.03, 0.8);
      this.playTone(ghost * 1.01, time + 0.3, 2, 'sine', 0.02, 1);
    }

    // Reverse swell — volume builds up then cuts
    if (beat % 32 === 14) {
      const swellNote = base * 3;
      this.playTone(swellNote, time, 1.5, 'sawtooth', 0.0, 0.01);
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = swellNote;
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.exponentialRampToValueAtTime(0.12, time + 1.4);
        gain.gain.setValueAtTime(0, time + 1.41);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 1.5);
        nodes.push(osc);
      }
    }

    // Low rumble pulses — sub bass that throbs
    if (beat % 6 === 0) {
      this.playTone(base * 0.25, time, 0.8, 'sine', 0.15, 0.2);
    }

    // Dissonant stinger — random chromatic clash
    if (beat % 24 === 11) {
      const d1 = base * 4 * Math.pow(2, 1 / 12);
      const d2 = base * 4 * Math.pow(2, 6 / 12);
      this.playTone(d1, time, 0.4, 'square', 0.05, 0.01);
      this.playTone(d2, time, 0.4, 'square', 0.05, 0.01);
    }

    // Heartbeat — double thump
    if (beat % 16 === 0) {
      this.playTone(base * 0.5, time, 0.12, 'sine', 0.2, 0);
      this.playTone(base * 0.5, time + 0.18, 0.1, 'sine', 0.15, 0);
    }
  }

  playSpaceBeat(time) {
    const scale = SCALES.space;
    const base = BASE_NOTES.space;
    const beat = this.beat;

    // Deep space drone — sustained low sine
    if (beat % 16 === 0) {
      this.playPad(base * 0.5, time, 6, 0.15);
      this.playPad(base * 0.75, time, 6, 0.1);
    }

    // Slow ethereal pad chords every 4 measures
    if (beat % (this.measureLen * 2) === 0) {
      const root = base * 2 * Math.pow(2, scale[0] / 12);
      const third = base * 2 * Math.pow(2, scale[2] / 12);
      const fifth = base * 2 * Math.pow(2, scale[4] / 12);
      const seventh = base * 2 * Math.pow(2, scale[6] / 12);
      this.playPad(root, time, 8, 0.08);
      this.playPad(third, time, 8, 0.06);
      this.playPad(fifth, time, 8, 0.06);
      this.playPad(seventh, time, 8, 0.04);
    }
    // Alternate chord
    if (beat === this.measureLen) {
      const root = base * 2 * Math.pow(2, scale[3] / 12);
      const third = base * 2 * Math.pow(2, scale[5] / 12);
      const fifth = base * 2 * Math.pow(2, scale[7] / 12);
      this.playPad(root, time, 6, 0.07);
      this.playPad(third, time, 6, 0.05);
      this.playPad(fifth, time, 6, 0.05);
    }

    // Sparse twinkling high notes — like distant stars
    if (beat % 4 === 0 && Math.random() > 0.4) {
      const idx = Math.floor(Math.random() * scale.length);
      const note = base * 6 * Math.pow(2, scale[idx] / 12);
      this.playTone(note, time, 1.2, 'sine', 0.06, 0.3);
    }
    if (beat % 6 === 0 && Math.random() > 0.5) {
      const idx = Math.floor(Math.random() * scale.length);
      const note = base * 8 * Math.pow(2, scale[idx] / 12);
      this.playTone(note, time, 0.9, 'sine', 0.04, 0.4);
    }

    // Slow drifting arpeggio every 8 beats
    if (beat % 8 === 0) {
      const notes = [scale[0], scale[2], scale[4], scale[6], scale[4], scale[2]];
      for (let i = 0; i < notes.length; i++) {
        const note = base * 4 * Math.pow(2, notes[i] / 12);
        this.playTone(note, time + i * 0.4, 0.5, 'sine', 0.05, 0.1);
      }
    }

    // Whoosh — slow filtered noise sweep every 16 beats
    if (beat % 32 === 0 && ctx) {
      const dur = 4;
      const bufSize = ctx.sampleRate * dur;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, time);
      filter.frequency.linearRampToValueAtTime(2000, time + dur);
      filter.Q.value = 8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.06, time + dur * 0.5);
      gain.gain.linearRampToValueAtTime(0, time + dur);
      src.connect(filter); filter.connect(gain); gain.connect(masterGain);
      src.start(time); src.stop(time + dur + 0.1);
      nodes.push(src);
      this.cleanNodes();
    }

    // Subtle radio bleeps — like distant signals
    if (beat % 12 === 5) {
      const note = base * 5 * Math.pow(2, scale[Math.floor(Math.random() * scale.length)] / 12);
      this.playTone(note, time, 0.08, 'square', 0.04, 0.005);
    }
  }

  melodyIndex(beat) {
    // Simple deterministic melody pattern with variation
    const patterns = [0, 2, 4, 3, 5, 4, 2, 1, 0, 3, 5, 7, 4, 2, 3, 0];
    return patterns[beat % patterns.length] + ((beat / 16 | 0) % 3);
  }

  playTone(freq, time, dur, type, vol, attack) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + (attack || 0.01));
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
    nodes.push(osc);
    this.cleanNodes();
  }

  playPad(freq, time, dur, vol) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.002; // slight detune for width
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.5);
    gain.gain.linearRampToValueAtTime(vol * 0.7, time + dur - 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc2.start(time);
    osc.stop(time + dur + 0.1);
    osc2.stop(time + dur + 0.1);
    nodes.push(osc, osc2);
    this.cleanNodes();
  }

  playNoise(time, dur, vol, filterFreq) {
    if (!ctx) return;
    const bufSize = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(time);
    src.stop(time + dur + 0.01);
    nodes.push(src);
    this.cleanNodes();
  }

  playHomeJingle() {
    this.init();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.05;
    const bpm = 140;
    const beat = 60 / bpm;

    // Fast country/fiddle-style melody in A major
    const melody = [
      440, 494, 554, 494, 440, 370, 330, 370,
      440, 554, 659, 554, 440, 494, 554, 440,
      370, 330, 370, 440, 494, 554, 659, 740,
      659, 554, 440, 370, 330, 370, 440, 440,
    ];

    // Fiddle melody — sawtooth with filter for twangy sound
    for (let i = 0; i < melody.length; i++) {
      const time = t + i * beat * 0.5;
      this.playFiddle(melody[i], time, beat * 0.45, 0.12);
    }

    // Bass stomps on beats
    for (let i = 0; i < 16; i++) {
      const time = t + i * beat;
      this.playTone(110, time, beat * 0.3, 'sine', 0.2, 0);
      if (i % 2 === 0) this.playTone(55, time, beat * 0.2, 'sine', 0.15, 0);
    }

    // Kick drum on every beat
    for (let i = 0; i < 16; i++) {
      this.playNoise(t + i * beat, 0.06, 0.15, 200);
    }

    // Snare on offbeats
    for (let i = 0; i < 16; i++) {
      this.playNoise(t + i * beat + beat * 0.5, 0.04, 0.08, 4000);
    }

    // Fast hi-hat
    for (let i = 0; i < 32; i++) {
      this.playNoise(t + i * beat * 0.5, 0.02, 0.04, 8000);
    }
  }

  playFiddle(freq, time, dur, vol) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.005; // slight detune
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.setValueAtTime(vol, time + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter); osc2.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(time); osc2.start(time);
    osc.stop(time + dur + 0.05); osc2.stop(time + dur + 0.05);
    nodes.push(osc, osc2);
    this.cleanNodes();
  }

  cleanNodes() {
    if (nodes.length > 60) nodes = nodes.slice(-30);
  }
}

export const music = new MusicSystem();
