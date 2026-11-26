/**
 * Bela's Big Drive — audio engine
 * ------------------------------------------------------------------
 * A self-contained chiptune music + sound-effect engine built on the
 * Web Audio API. Everything is synthesized at runtime: no audio files,
 * no libraries, no samples. The music is original and written inline
 * below as tiny note grids (see TRACKS).
 *
 * The public surface is intentionally small:
 *
 *   audio.init()
 *   audio.playMusic(trackId)
 *   audio.stopMusic(fadeSec = 0.5)
 *   audio.sfx(id)
 *   audio.setMuted(bool) / audio.isMuted()
 *   audio.setMusicVolume(0..1) / audio.setSfxVolume(0..1)
 *
 * All methods are safe to call at any time: before init, with no
 * AudioContext available, or with unknown track/sfx ids they simply
 * do nothing. Audio is created lazily on the first user gesture.
 *
 * Tracks: title, travel, travel_rain, town, store, landmark, tension,
 *         minigame, campfire, victory, gameover
 * SFX:    select, confirm, back, type, cash, honk, engine, pop, thud,
 *         woof, meow, hiss, buzz, pickup, splash, crash, ding, bad,
 *         good, rain, thunder, step
 */

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

const DEBUG =
  typeof globalThis !== 'undefined' && !!(globalThis.__BBD_AUDIO_DEBUG__);
const LS_MUTE = 'bbd_muted';
const MASTER_VOLUME = 0.9;

const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
};

const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noteNameToMidi = (name) => {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name);
  if (!m) return null;
  let semis = NOTE_BASE[m[1].toUpperCase()];
  if (m[2] === '#') semis += 1;
  else if (m[2] === 'b') semis -= 1;
  return semis + (parseInt(m[3], 10) + 1) * 12;
};

/** "62" or "F#4" -> midi number, or null. */
const parsePitch = (txt) => {
  if (/^-?\d+$/.test(txt)) return parseInt(txt, 10);
  return noteNameToMidi(txt);
};

/** `C4+E4+G4:16` -> { midis:[60,64,67], dur:16 } (dur optional) */
const parseNoteToken = (tok) => {
  const cut = tok.lastIndexOf(':');
  let body = tok;
  let dur = 1;
  if (cut > 0 && /^\d+$/.test(tok.slice(cut + 1))) {
    body = tok.slice(0, cut);
    dur = Math.max(1, parseInt(tok.slice(cut + 1), 10));
  }
  const midis = [];
  for (const part of body.split('+')) {
    const midi = parsePitch(part.trim());
    if (midi === null) return null;
    if (midi < 12 || midi > 120) return null;
    midis.push(midi);
  }
  if (!midis.length) return null;
  return { midis, dur };
};

const REP = (s, n) => Array.from({ length: n }, () => s);

/** Build a bar of `spb` sixteenth steps from chord tones and an order. */
const arpLine = (notes, order = [0, 1, 2, 3], dur = 2, spb = 16) => {
  const out = [];
  let i = 0;
  for (let pos = 0; pos < spb; pos += dur, i += 1) {
    const idx = order[i % order.length];
    out.push(`${notes[idx % notes.length]}:${dur}`);
  }
  return out.join(' ');
};

/** Root / fifth / octave bass figure. */
const bassLine = (root, order = [0, 0, 1, 0, 2, 1, 0, 1], dur = 2, spb = 16) => {
  return arpLine([root, root + 7, root + 12, root + 7], order, dur, spb);
};

const padBar = (notes, dur = 16) => `${notes.join('+')}:${dur}`;

/* ------------------------------------------------------------------ */
/* Running state                                                       */
/* ------------------------------------------------------------------ */

const state = {
  ctx: null,
  master: null,
  limiter: null,
  musicBus: null,
  sfxBus: null,
  echoIn: null,
  echoDelay: null,

  muted: false,
  musicVol: 0.72,
  sfxVol: 0.85,

  current: null,
  pendingTrack: null,
  schedulerId: null,
  lastTypeAt: -1,
  hidden: false,
  visibilityBound: false,
  resumeBound: false,

  noiseBuffer: null,
  waves: new Map(),
};

/* ------------------------------------------------------------------ */
/* AudioContext / master graph                                         */
/* ------------------------------------------------------------------ */

const getAudioContextCtor = () => {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
};

function loadMutedPref() {
  try {
    return globalThis.localStorage?.getItem(LS_MUTE) === '1';
  } catch {
    return false;
  }
}

function saveMutedPref(muted) {
  try {
    globalThis.localStorage?.setItem(LS_MUTE, muted ? '1' : '0');
  } catch {
    /* private mode / no storage: ignore */
  }
}

state.muted = loadMutedPref();

function makeNoiseBuffer(ctx) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * 2));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // A deterministic-ish PRNG keeps the noise pleasant and avoids
  // pathological sample runs from Math.random().
  let seed = 0x1234567;
  for (let i = 0; i < len; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x3fffffff) - 1;
  }
  return buffer;
}

/** Band-limited pulse wave with a given duty cycle (0.125, 0.25, 0.5). */
function pulseWave(ctx, duty) {
  const key = duty.toFixed(3);
  const cached = state.waves.get(key);
  if (cached) return cached;
  const harmonics = 48;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  // Fourier cosine coefficients for a bipolar pulse of width `duty`.
  for (let n = 1; n <= harmonics; n += 1) {
    real[n] = (4 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  }
  const wave = ctx.createPeriodicWave(real, imag, {
    disableNormalization: false,
  });
  state.waves.set(key, wave);
  return wave;
}

function buildGraph(ctx) {
  const master = ctx.createGain();
  master.gain.value = state.muted ? 0 : MASTER_VOLUME;

  const limiter = ctx.createDynamicsCompressor();
  try {
    limiter.threshold.value = -14;
    limiter.knee.value = 10;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
  } catch {
    /* not all stubs implement every AudioParam */
  }

  const musicBus = ctx.createGain();
  musicBus.gain.value = state.musicVol;

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = state.sfxVol;

  musicBus.connect(master);
  sfxBus.connect(master);
  master.connect(limiter);
  limiter.connect(ctx.destination);

  // Warm little echo used by melodies and arpeggios.
  const echoIn = ctx.createGain();
  echoIn.gain.value = 0.9;
  const echoDelay = ctx.createDelay(1.0);
  echoDelay.delayTime.value = 0.27;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const echoFilter = ctx.createBiquadFilter();
  echoFilter.type = 'lowpass';
  echoFilter.frequency.value = 2400;
  echoFilter.Q.value = 0.5;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;

  echoIn.connect(echoDelay);
  echoDelay.connect(echoFilter);
  echoFilter.connect(feedback);
  feedback.connect(echoDelay);
  echoFilter.connect(wet);
  wet.connect(musicBus);

  Object.assign(state, {
    ctx,
    master,
    limiter,
    musicBus,
    sfxBus,
    echoIn,
    echoDelay,
  });

  state.noiseBuffer = makeNoiseBuffer(ctx);
}

function tryResume() {
  const ctx = state.ctx;
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      const p = ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  } catch {
    /* ignored */
  }
}

function bindUnlock() {
  if (state.resumeBound) return;
  if (typeof document === 'undefined' || !document.addEventListener) return;
  state.resumeBound = true;
  const unlock = () => {
    tryResume();
    if (state.pendingTrack) {
      const pending = state.pendingTrack;
      state.pendingTrack = null;
      playMusic(pending);
    }
    try {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    } catch {
      /* ignore */
    }
  };
  try {
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock, { passive: true });
  } catch {
    state.resumeBound = false;
  }
}

function bindVisibility() {
  if (state.visibilityBound) return;
  if (typeof document === 'undefined' || !document.addEventListener) return;
  state.visibilityBound = true;
  try {
    document.addEventListener('visibilitychange', () => {
      try {
        handleVisibility();
      } catch (err) {
        if (DEBUG) console.error('[audio] visibility handler', err);
      }
    });
  } catch {
    state.visibilityBound = false;
  }
}

function handleVisibility() {
  const hidden = typeof document !== 'undefined' ? !!document.hidden : false;
  state.hidden = hidden;
  if (hidden) {
    stopScheduler();
    return;
  }
  tryResume();
  if (state.current && state.ctx) {
    state.current.nextTime = Math.max(
      state.current.nextTime,
      state.ctx.currentTime + 0.06,
    );
    ensureScheduler();
    schedulerTick();
  }
}

/* ------------------------------------------------------------------ */
/* Voice primitives                                                    */
/* ------------------------------------------------------------------ */

const WAVE_TRIM = {
  pulse12: 1.65,
  pulse25: 1.18,
  pulse50: 1,
  square: 1,
  triangle: 1.05,
  saw: 0.8,
  sine: 1,
};

const VOICE_DEFAULTS = {
  lead: { attack: 0.007, decay: 0.11, sustain: 0.7, release: 0.05, legato: 0.94 },
  bass: { attack: 0.005, decay: 0.05, sustain: 0.9, release: 0.03, legato: 0.92 },
  arp: { attack: 0.003, decay: 0.045, sustain: 0.22, release: 0.025, legato: 0.8 },
  pad: { attack: 0.2, decay: 0.15, sustain: 0.82, release: 0.28, legato: 1 },
  stab: { attack: 0.004, decay: 0.07, sustain: 0.35, release: 0.04, legato: 0.75 },
  drum: { attack: 0.001, decay: 0.05, sustain: 0.4, release: 0.02, legato: 1 },
};

function applyPerc(p, t, dur, peak, attack) {
  const a = Math.max(0.001, Math.min(attack, dur * 0.5));
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(Math.max(0.0002, peak), t + a);
  p.exponentialRampToValueAtTime(0.0001, t + dur);
}

function applyAdsr(p, t, dur, peak, o) {
  const a = Math.min(o.attack, dur * 0.4);
  const d = Math.min(o.decay, dur * 0.4);
  const r = Math.min(o.release, dur * 0.5);
  const sustain = clamp01(o.sustain);
  const relStart = Math.max(t + a + d, t + dur - r);
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(Math.max(0.0002, peak), t + a);
  p.linearRampToValueAtTime(
    Math.max(0.0001, peak * sustain),
    t + a + d,
  );
  p.setValueAtTime(Math.max(0.0001, peak * sustain), relStart);
  p.linearRampToValueAtTime(0.0001, t + dur);
}

/**
 * One synth note (or chord-free blip).
 *
 * opts: { wave, freq, freqEnd, t, dur, gain, attack, decay, sustain,
 *         release, env:'perc'|'adsr', vibrato:{rate,depth,delay},
 *         scoop, filterFreq, filterType, filterQ, filterFreqEnd,
 *         pan, echo, dest }
 */
function tone(opts) {
  const ctx = state.ctx;
  if (!ctx) return null;
  const o = opts || {};
  const t = Math.max(0, o.t ?? ctx.currentTime);
  const dur = Math.max(0.012, o.dur ?? 0.1);
  const end = t + dur;
  const wave = o.wave || 'square';
  const peak = Math.max(
    0.0001,
    (o.gain ?? 0.1) * (WAVE_TRIM[wave] ?? 1),
  );
  const dest = o.dest || state.sfxBus;

  const gainNode = ctx.createGain();
  let out = gainNode;

  let panner = null;
  if (o.pan && typeof ctx.createStereoPanner === 'function') {
    panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, o.pan));
    gainNode.connect(panner);
    out = panner;
  }
  out.connect(dest);

  let filter = null;
  if (o.filterFreq) {
    filter = ctx.createBiquadFilter();
    filter.type = o.filterType || 'lowpass';
    try {
      filter.frequency.setValueAtTime(Math.max(30, o.filterFreq), t);
      if (o.filterFreqEnd) {
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(30, o.filterFreqEnd),
          end,
        );
      }
      filter.Q.value = o.filterQ ?? 0.7;
    } catch {
      /* ignore */
    }
  }

  const osc = ctx.createOscillator();
  try {
    if (wave === 'pulse12') osc.setPeriodicWave(pulseWave(ctx, 0.125));
    else if (wave === 'pulse25') osc.setPeriodicWave(pulseWave(ctx, 0.25));
    else if (wave === 'pulse50' || wave === 'square') osc.type = 'square';
    else if (wave === 'saw') osc.type = 'sawtooth';
    else if (wave === 'triangle') osc.type = 'triangle';
    else osc.type = 'sine';
  } catch {
    osc.type = wave === 'saw' ? 'sawtooth' : 'sine';
  }

  const base = Math.max(20, o.freq ?? 440);
  try {
    const fp = osc.frequency;
    if (o.scoop) {
      const startF = Math.max(
        20,
        base * Math.pow(2, -Math.abs(o.scoop) / 12),
      );
      fp.setValueAtTime(startF, t);
      fp.exponentialRampToValueAtTime(
        base,
        Math.min(end, t + (o.scoopTime ?? 0.05)),
      );
    } else {
      fp.setValueAtTime(base, t);
    }
    if (o.freqEnd) {
      fp.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), end);
    }
  } catch {
    /* ignore */
  }

  if (o.vibrato && o.vibrato.depth > 0) {
    try {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = o.vibrato.rate || 5;
      const lfoGain = ctx.createGain();
      const delay = Math.max(0.02, o.vibrato.delay ?? 0.15);
      lfoGain.gain.setValueAtTime(0, t);
      lfoGain.gain.linearRampToValueAtTime(
        Math.max(0.5, o.vibrato.depth),
        Math.min(end, t + delay),
      );
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(end + 0.05);
      osc.onended = () => {
        try {
          lfo.disconnect();
          lfoGain.disconnect();
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* ignore */
    }
  }

  if (filter) osc.connect(filter);
  if (filter) filter.connect(gainNode);
  else osc.connect(gainNode);

  const env = o.env || 'adsr';
  if (env === 'perc') {
    applyPerc(gainNode.gain, t, dur, peak, o.attack ?? 0.004);
  } else {
    applyAdsr(gainNode.gain, t, dur, peak, {
      attack: o.attack ?? 0.008,
      decay: o.decay ?? 0.1,
      sustain: o.sustain ?? 0.7,
      release: o.release ?? 0.06,
    });
  }

  let send = null;
  if (o.echo > 0 && state.echoIn) {
    send = ctx.createGain();
    send.gain.value = Math.max(0, o.echo);
    gainNode.connect(send);
    send.connect(state.echoIn);
  }

  const prevOnEnded = osc.onended;
  osc.onended = () => {
    try {
      if (prevOnEnded) prevOnEnded();
    } catch {
      /* ignore */
    }
    try {
      osc.disconnect();
      if (filter) filter.disconnect();
      gainNode.disconnect();
      if (panner) panner.disconnect();
      if (send) send.disconnect();
    } catch {
      /* ignore */
    }
  };

  const stopAt = Math.max(end + 0.03, ctx.currentTime + 0.03);
  try {
    osc.start(t);
    osc.stop(stopAt);
  } catch {
    /* ignore */
  }
  return osc;
}

/**
 * One noise voice. opts: { t,dur,gain,filterType,filterFreq,filterFreqEnd,
 * q, attack, env, loop, pan, dest }
 */
function noise(opts) {
  const ctx = state.ctx;
  if (!ctx || !state.noiseBuffer) return null;
  const o = opts || {};
  const t = Math.max(0, o.t ?? ctx.currentTime);
  const dur = Math.max(0.01, o.dur ?? 0.1);
  const end = t + dur;
  const dest = o.dest || state.sfxBus;

  const src = ctx.createBufferSource();
  src.buffer = state.noiseBuffer;
  src.loop = !!o.loop;

  let node = src;
  let filter = null;
  if (o.filterFreq) {
    filter = ctx.createBiquadFilter();
    filter.type = o.filterType || 'bandpass';
    try {
      filter.frequency.setValueAtTime(Math.max(30, o.filterFreq), t);
      if (o.filterFreqEnd) {
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(30, o.filterFreqEnd),
          end,
        );
      }
      filter.Q.value = o.q ?? 0.7;
    } catch {
      /* ignore */
    }
    src.connect(filter);
    node = filter;
  }

  const gainNode = ctx.createGain();
  node.connect(gainNode);
  let out = gainNode;
  let panner = null;
  if (o.pan && typeof ctx.createStereoPanner === 'function') {
    panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, o.pan));
    gainNode.connect(panner);
    out = panner;
  }
  out.connect(dest);

  const peak = Math.max(0.0001, o.gain ?? 0.1);
  if (o.env === 'adsr') {
    applyAdsr(gainNode.gain, t, dur, peak, {
      attack: o.attack ?? 0.02,
      decay: o.decay ?? 0.1,
      sustain: o.sustain ?? 0.8,
      release: o.release ?? 0.1,
    });
  } else {
    applyPerc(gainNode.gain, t, dur, peak, o.attack ?? 0.003);
  }

  const offset = Math.random() * 1.1;
  try {
    src.start(t, offset);
    src.stop(Math.max(end + 0.03, ctx.currentTime + 0.03));
  } catch {
    /* ignore */
  }
  src.onended = () => {
    try {
      src.disconnect();
      if (filter) filter.disconnect();
      gainNode.disconnect();
      if (panner) panner.disconnect();
    } catch {
      /* ignore */
    }
  };
  return src;
}

/* ------------------------------------------------------------------ */
/* Drum kit                                                            */
/* ------------------------------------------------------------------ */

/**
 * kind: k kick, s snare, h closed hat, o open hat, c crash, t tom,
 *       r rim, x clap, a shaker. Uppercase = accent.
 */
function drum(kind, t, dest, vol = 1) {
  const isAccent =
    kind === kind.toUpperCase() && kind !== kind.toLowerCase();
  const k = kind.toLowerCase();
  const v = Math.max(0, vol) * (isAccent ? 1.35 : 1);
  switch (k) {
    case 'k':
      tone({
        wave: 'sine',
        freq: 150,
        freqEnd: 47,
        t,
        dur: 0.17,
        gain: 0.5 * v,
        env: 'perc',
        attack: 0.003,
        dest,
      });
      noise({
        t,
        dur: 0.022,
        gain: 0.07 * v,
        filterType: 'highpass',
        filterFreq: 2800,
        dest,
      });
      break;
    case 's':
      noise({
        t,
        dur: 0.16,
        gain: 0.26 * v,
        filterType: 'bandpass',
        filterFreq: 1850,
        q: 0.9,
        env: 'perc',
        dest,
      });
      tone({
        wave: 'triangle',
        freq: 190,
        t,
        dur: 0.075,
        gain: 0.12 * v,
        env: 'perc',
        dest,
      });
      break;
    case 'h':
      noise({
        t,
        dur: 0.035,
        gain: 0.11 * v,
        filterType: 'highpass',
        filterFreq: 7200,
        env: 'perc',
        dest,
      });
      break;
    case 'o':
      noise({
        t,
        dur: 0.19,
        gain: 0.1 * v,
        filterType: 'highpass',
        filterFreq: 6200,
        env: 'perc',
        dest,
      });
      break;
    case 'c':
      noise({
        t,
        dur: 1.1,
        gain: 0.16 * v,
        filterType: 'highpass',
        filterFreq: 3800,
        env: 'perc',
        attack: 0.006,
        dest,
      });
      tone({
        wave: 'triangle',
        freq: 2400,
        freqEnd: 1500,
        t,
        dur: 0.35,
        gain: 0.035 * v,
        env: 'perc',
        dest,
      });
      break;
    case 't':
      tone({
        wave: 'sine',
        freq: 220,
        freqEnd: 105,
        t,
        dur: 0.2,
        gain: 0.24 * v,
        env: 'perc',
        dest,
      });
      break;
    case 'r':
      noise({
        t,
        dur: 0.03,
        gain: 0.09 * v,
        filterType: 'highpass',
        filterFreq: 3600,
        env: 'perc',
        dest,
      });
      tone({
        wave: 'triangle',
        freq: 1300,
        t,
        dur: 0.025,
        gain: 0.035 * v,
        env: 'perc',
        dest,
      });
      break;
    case 'x':
      for (let i = 0; i < 3; i += 1) {
        noise({
          t: t + i * 0.014,
          dur: 0.055,
          gain: (0.16 - i * 0.03) * v,
          filterType: 'bandpass',
          filterFreq: 1200,
          q: 1.2,
          env: 'perc',
          dest,
        });
      }
      break;
    case 'a':
      noise({
        t,
        dur: 0.06,
        gain: 0.05 * v,
        filterType: 'highpass',
        filterFreq: 5600,
        env: 'perc',
        dest,
      });
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Music composition helpers                                           */
/* ------------------------------------------------------------------ */

// Chord voicings (MIDI). Arp channels add an octave where needed.
const CH = {
  D: [50, 54, 57, 62],
  Bm: [47, 50, 54, 59],
  G: [43, 47, 50, 55],
  A: [45, 49, 52, 57],
  Em: [40, 43, 47, 52],
  E: [40, 44, 47, 52],
  'F#m': [42, 45, 49, 54],
  Am: [45, 48, 52, 57],
  F: [41, 45, 48, 53],
  C: [48, 52, 55, 60],
  Dm: [50, 53, 57, 62],
  Fmaj7: [41, 45, 48, 52],
  Dm7: [50, 53, 57, 60],
  Gm7: [43, 46, 50, 53],
  C7: [48, 52, 55, 58],
  Bbmaj7: [46, 50, 53, 57],
  Bb: [46, 50, 53, 58],
  Gm: [43, 46, 50, 55],
  Eb: [39, 43, 46, 51],
  Cm: [36, 39, 43, 48],
  D7: [38, 42, 45, 48],
  A7: [45, 49, 52, 55],
};

const ROOT = {
  D: 38,
  Bm: 47,
  G: 43,
  A: 45,
  Em: 40,
  E: 40,
  'F#m': 42,
  Am: 45,
  F: 41,
  C: 48,
  Dm: 38,
  Fmaj7: 41,
  Dm7: 38,
  Gm7: 43,
  C7: 48,
  Bbmaj7: 46,
  Bb: 46,
  Gm: 43,
  Eb: 39,
  Cm: 48,
  D7: 38,
  A7: 45,
};

const up12 = (notes) => notes.map((n) => n + 12);

/* ------------------------------------------------------------------ */
/* TRACKS — original compositions, written as note grids.              */
/*                                                                     */
/* Each bar is a list of tokens: `C4:4` is a quarter note, `.:2` is a  */
/* rest, `-` ties. Drum bars are compact strings, one char per 16th.   */
/* ------------------------------------------------------------------ */

const TRACKS = {
  /* ---------------- title: open-road anthem, D major ---------------- */
  title: {
    bpm: 128,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 16,
    echoTime: 0.27,
    volume: 1,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse25',
        gain: 0.095,
        filterFreq: 6000,
        echo: 0.24,
        vibrato: { rate: 5.5, depth: 5, delay: 0.16 },
        bars: [
          'F#5:2 A5:2 D6:4 A5:2 F#5:2 E5:4',
          'D6:2 B5:2 F#5:6 .:2 B5:2 A5:2',
          'G5:4 B5:4 D6:4 B5:2 A5:2',
          'A5:8 E5:4 C#5:4',
          'F#5:2 A5:2 D6:4 A5:2 F#5:2 E5:4',
          'D6:2 B5:2 F#5:4 D5:2 F#5:2 B5:4',
          'G5:2 A5:2 B5:4 D6:2 B5:2 A5:4',
          'A5:4 C#6:4 E6:4 C#6:4',
          'B5:4 D6:4 G6:4 D6:4',
          'C#6:4 A5:4 E5:4 A5:4',
          'D6:4 C#6:2 A5:2 F#5:4 A5:2 C#6:2',
          'B5:6 F#5:2 D5:4 B4:4',
          'G5:2 B5:2 D6:2 G6:2 F#6:4 D6:4',
          'E6:4 C#6:4 A5:4 E5:4',
          'F#5:2 A5:2 D6:2 F#6:2 E6:4 D6:4',
          'A5:4 F#5:4 D5:4 A4:4',
        ],
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.036,
        filterFreq: 5200,
        echo: 0.32,
        pan: -0.12,
        bars: [
          'D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A',
          'G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D',
        ].map((c) => arpLine(up12(CH[c]), [0, 1, 2, 3, 2, 1, 0, 1], 1, 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.15,
        filterFreq: 1100,
        bars: [
          'D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A',
          'G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D',
        ].map((c) => bassLine(ROOT[c], [0, 0, 1, 0, 2, 1, 0, 1], 2, 16)),
      },
      {
        id: 'drums',
        kind: 'drums',
        gain: 0.95,
        bars: [
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.stt.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.hk',
          'k.h.s.h.kkh.s.hc',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.hc',
          'k.h.s.h.kks.h.t.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.stt.',
          'k.h.s.h.kkh.s.hk',
        ],
      },
    ],
  },

  /* ---------------- travel: steady driving groove, A major ---------------- */
  travel: {
    bpm: 120,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 16,
    echoTime: 0.29,
    volume: 1,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse25',
        gain: 0.09,
        filterFreq: 5600,
        echo: 0.2,
        vibrato: { rate: 5, depth: 4.5, delay: 0.2 },
        bars: [
          'C#5:2 E5:2 A5:4 E5:2 C#5:2 B4:4',
          'A5:2 F#5:2 C#5:6 .:2 F#5:2 E5:2',
          'F#5:4 A5:4 C#6:4 A5:2 F#5:2',
          'A5:4 F#5:4 D5:4 F#5:4',
          'C#5:2 E5:2 A5:4 E5:2 C#5:2 B4:4',
          'A5:2 F#5:2 C#5:4 A4:2 C#5:2 F#5:4',
          'F#5:2 G#5:2 A5:4 B5:2 A5:2 F#5:4',
          'E5:4 F#5:4 A5:4 B5:4',
          'C#6:4 A5:4 F#5:4 C#5:4',
          'D6:4 B5:4 A5:4 F#5:4',
          'E5:2 A5:2 C#6:4 B5:2 A5:2 E5:4',
          'G#5:4 B5:4 E6:4 B5:4',
          'F#5:2 A5:2 C#6:2 F#6:2 E6:4 C#6:4',
          'B5:4 G#5:4 E5:4 G#5:4',
          'A5:2 B5:2 D6:2 B5:2 A5:4 F#5:4',
          'E5:4 C#5:4 A4:4 E4:4',
        ],
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.032,
        filterFreq: 4800,
        echo: 0.26,
        pan: 0.13,
        bars: [
          'A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'D',
          'F#m', 'D', 'A', 'E', 'F#m', 'E', 'D', 'A',
        ].map((c) => arpLine(up12(CH[c]), [0, 2, 1, 3], 2, 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.15,
        filterFreq: 1050,
        bars: [
          'A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'D',
          'F#m', 'D', 'A', 'E', 'F#m', 'E', 'D', 'A',
        ].map((c) => bassLine(ROOT[c], [0, 0, 1, 2, 0, 1, 2, 1], 2, 16)),
      },
      {
        id: 'drums',
        kind: 'drums',
        gain: 0.85,
        bars: [
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.stt.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.stt.',
          'k.h.s.h.kkh.s.hk',
        ],
      },
    ],
  },

  /* ---------------- travel_rain: mellow A minor night drive ---------------- */
  travel_rain: {
    bpm: 92,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 12,
    echoTime: 0.34,
    volume: 0.95,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse12',
        gain: 0.068,
        filterFreq: 3200,
        echo: 0.36,
        vibrato: { rate: 4.5, depth: 4, delay: 0.26 },
        bars: [
          'E5:8 C5:4 A4:4',
          'F5:6 E5:2 C5:8',
          'G5:4 E5:4 C5:8',
          'D5:8 B4:4 G4:4',
          'A4:4 C5:4 E5:8',
          'D5:8 F5:4 A5:4',
          'E5:4 G5:4 B4:8',
          'A4:12 .:4',
          'C6:4 A5:4 F5:8',
          'G5:4 E5:4 C5:8',
          'D5:6 B4:2 G4:8',
          'A4:16',
        ],
      },
      {
        id: 'pad',
        kind: 'pad',
        wave: 'triangle',
        gain: 0.026,
        filterFreq: 2200,
        echo: 0.2,
        pan: 0.1,
        bars: [
          'Am', 'F', 'C', 'G', 'Am', 'Dm', 'Em', 'Am', 'F', 'C', 'G', 'Am',
        ].map((c) => padBar(CH[c], 16)),
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.027,
        filterFreq: 3600,
        echo: 0.4,
        pan: -0.16,
        bars: [
          'Am', 'F', 'C', 'G', 'Am', 'Dm', 'Em', 'Am', 'F', 'C', 'G', 'Am',
        ].map((c) => arpLine(up12(CH[c]), [0, 1, 2, 3, 2, 1], 2, 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.11,
        filterFreq: 850,
        bars: [
          'Am', 'F', 'C', 'G', 'Am', 'Dm', 'Em', 'Am', 'F', 'C', 'G', 'Am',
        ].map((c) => bassLine(ROOT[c], [0, 0, 1, 2], 4, 16)),
      },
      {
        id: 'drums',
        kind: 'drums',
        gain: 0.55,
        bars: REP('k.......s.......', 12),
      },
      {
        id: 'hats',
        kind: 'drums',
        gain: 0.32,
        pan: 0.18,
        bars: REP('.h.h.h.h.h.h.h.h', 12),
      },
    ],
  },

  /* ---------------- town: bouncy shopping music, G major ---------------- */
  town: {
    bpm: 144,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 12,
    echoTime: 0.24,
    volume: 0.95,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse25',
        gain: 0.085,
        filterFreq: 5600,
        echo: 0.14,
        vibrato: { rate: 6, depth: 4, delay: 0.1 },
        bars: [
          'G4:2 B4:2 D5:2 G5:2 D5:2 B4:2 G4:4',
          'E5:2 G5:2 C6:4 G5:2 E5:2 C5:4',
          'F#5:2 A5:2 D6:4 A5:2 F#5:2 D5:4',
          'G5:4 D5:2 B4:2 G4:4 B4:4',
          'E5:2 G5:2 B5:4 G5:2 E5:2 B4:4',
          'C5:2 E5:2 G5:2 C6:2 G5:2 E5:2 C5:4',
          'D5:2 F#5:2 A5:2 D6:2 A5:2 F#5:2 D5:4',
          'G5:4 B5:4 D6:4 B5:4',
          'C6:4 G5:4 E5:4 G5:4',
          'D6:4 A5:4 F#5:4 A5:4',
          'B5:2 G5:2 D5:2 G5:2 B5:4 D6:4',
          'G5:4 D5:4 B4:4 G4:4',
        ],
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.038,
        filterFreq: 5200,
        echo: 0.2,
        pan: 0.14,
        bars: [
          'G', 'C', 'D', 'G', 'Em', 'C', 'D', 'G', 'C', 'D', 'G', 'G',
        ].map((c) => arpLine(up12(CH[c]), [0, 1, 2, 3, 2, 1, 0, 1], 1, 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.16,
        filterFreq: 1200,
        bars: [
          'G', 'C', 'D', 'G', 'Em', 'C', 'D', 'G', 'C', 'D', 'G', 'G',
        ].map((c) => bassLine(ROOT[c], [0, 1, 0, 2, 0, 1, 2, 1], 2, 16)),
      },
      {
        id: 'drums',
        kind: 'drums',
        gain: 0.9,
        bars: [
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.hk',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.hk',
          'k.h.s.h.kkh.s.ho',
          'k.h.s.h.kkh.s.h.',
          'k.hks.h.kkh.s.t.',
          'k.h.s.h.kkh.s.hk',
        ],
      },
    ],
  },

  /* ---------------- store: cheesy big-box bossa, F major ---------------- */
  store: {
    bpm: 104,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 12,
    beatSwing: 0.22,
    echoTime: 0.33,
    volume: 0.9,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse12',
        gain: 0.07,
        filterFreq: 3000,
        echo: 0.3,
        vibrato: { rate: 5.2, depth: 5, delay: 0.18 },
        bars: [
          'A4:4 C5:2 E5:2 F5:4 E5:4',
          'D5:4 F5:4 A5:4 F5:4',
          'G4:4 Bb4:2 D5:2 G5:4 D5:4',
          'C5:4 E5:2 G5:2 Bb5:4 G5:4',
          'A5:4 F5:2 A5:2 C6:4 A5:4',
          'F5:4 A5:2 C6:2 A5:8',
          'D5:4 G5:2 Bb5:2 D6:4 Bb5:4',
          'G5:4 E5:2 C5:2 G4:8',
          'C6:4 A5:2 F5:2 A5:8',
          'D6:4 Bb5:2 G5:2 D5:8',
          'E5:4 G5:4 Bb5:4 G5:4',
          'E5:8 G5:4 Bb5:4',
        ],
      },
      {
        id: 'pad',
        kind: 'pad',
        wave: 'triangle',
        gain: 0.024,
        filterFreq: 2000,
        echo: 0.14,
        pan: -0.2,
        bars: [
          'Fmaj7', 'Dm7', 'Gm7', 'C7',
          'Fmaj7', 'Dm7', 'Gm7', 'C7',
          'Bbmaj7', 'Dm7', 'Gm7', 'C7',
        ].map((c) => padBar(CH[c], 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.13,
        filterFreq: 900,
        bars: [
          'Fmaj7', 'Dm7', 'Gm7', 'C7',
          'Fmaj7', 'Dm7', 'Gm7', 'C7',
          'Bbmaj7', 'Dm7', 'Gm7', 'C7',
        ].map((c) => bassLine(ROOT[c], [0, 1, 0, 2, 0, 1, 1, 2], 2, 16)),
      },
      {
        id: 'rim',
        kind: 'drums',
        gain: 0.6,
        bars: REP('....r.......r...', 12),
      },
      {
        id: 'hats',
        kind: 'drums',
        gain: 0.3,
        pan: -0.18,
        bars: REP('.h.h.h.h.h.h.h.h', 12),
      },
    ],
  },

  /* ---------------- landmark: wonder / scenic, F major ---------------- */
  landmark: {
    bpm: 88,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 12,
    echoTime: 0.38,
    volume: 0.9,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse12',
        gain: 0.06,
        filterFreq: 3800,
        echo: 0.44,
        vibrato: { rate: 4.2, depth: 4, delay: 0.3 },
        bars: [
          'C6:8 A5:8',
          'E6:8 C6:8',
          'D6:8 Bb5:8',
          'C6:12 G5:4',
          'D6:8 A5:8',
          'F6:8 D6:8',
          'C6:8 A5:8',
          'G5:8 E5:8',
          'Bb5:8 D6:8',
          'C6:8 E6:8',
          'F6:12 C6:4',
          'A5:8 F5:8',
        ],
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.027,
        filterFreq: 4600,
        echo: 0.5,
        pan: 0.18,
        bars: [
          'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'F', 'F',
        ].map((c) => arpLine(up12(CH[c]), [0, 1, 2, 3, 2, 1, 0, 1], 1, 16)),
      },
      {
        id: 'pad',
        kind: 'pad',
        wave: 'triangle',
        gain: 0.025,
        filterFreq: 2600,
        echo: 0.25,
        pan: -0.15,
        bars: [
          'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'F', 'F',
        ].map((c) => padBar(CH[c], 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.105,
        filterFreq: 800,
        bars: [
          'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'F', 'F',
        ].map((c) => bassLine(ROOT[c], [0, 1], 8, 16)),
      },
      {
        id: 'drums',
        kind: 'drums',
        gain: 0.6,
        bars: [
          'k.......t.......',
          'k.......t.......',
          'k.......t.......',
          'k.......t.....c.',
          'k.......t.......',
          'k.......t.......',
          'k.......t.......',
          'k.......t.....c.',
          'k.......t.......',
          'k.......t.......',
          'k.......t.......',
          'k.......t.....c.',
        ],
      },
    ],
  },

  /* ---------------- tension: mountain pass / ferry, D minor ---------------- */
  tension: {
    bpm: 140,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 12,
    echoTime: 0.2,
    volume: 1,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse25',
        gain: 0.07,
        filterFreq: 4200,
        echo: 0.14,
        vibrato: { rate: 6.5, depth: 3, delay: 0.08 },
        bars: [
          'D4:2 .:2 D4:2 Eb4:2 D4:2 .:2 A3:4',
          'D4:2 .:2 D4:2 Eb4:2 D4:2 .:2 A3:4',
          'Eb4:4 D4:4 A3:4 D4:4',
          'D4:2 .:2 D4:2 Eb4:2 D4:4 A3:4',
          'D4:4 F4:4 Bb4:4 F4:4',
          'G4:4 Bb4:4 D5:4 Bb4:4',
          'C#5:4 E5:4 G4:4 C#5:4',
          'D5:8 A4:4 D4:4',
          'D4:2 .:2 D4:2 Eb4:2 D4:2 .:2 A3:4',
          'Eb4:4 D4:4 Eb4:4 D4:4',
          'D4:2 .:2 D4:2 Eb4:2 D4:4 A3:4',
          'A4:4 C#5:4 E5:8',
        ],
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.032,
        filterFreq: 3800,
        echo: 0.15,
        pan: -0.14,
        bars: [
          'Dm', 'Dm', 'Eb', 'Dm', 'Bb', 'Gm', 'A7', 'Dm',
          'Dm', 'Eb', 'Dm', 'A7',
        ].map((c) => arpLine(up12(CH[c]), [0, 2, 1, 3], 2, 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.15,
        filterFreq: 950,
        bars: [
          'Dm', 'Dm', 'Eb', 'Dm', 'Bb', 'Gm', 'A7', 'Dm',
          'Dm', 'Eb', 'Dm', 'A7',
        ].map((c, i) => {
          const root = ROOT[c];
          const order =
            i % 4 === 2 ? [0, 0, 0, 3, 0, 0, 3, 0] : [0, 0, 1, 0, 0, 0, 1, 0];
          return arpLine([root, root + 7, root + 12, root + 1], order, 2, 16);
        }),
      },
      {
        id: 'drums',
        kind: 'drums',
        gain: 1,
        bars: [
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.h.s.tt',
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.hsttss',
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.h.s.h.',
          'k.h.s.h.k.stt...',
        ],
      },
      {
        id: 'hats',
        kind: 'drums',
        gain: 0.35,
        pan: 0.2,
        bars: REP('.h.h.h.h.h.h.h.h', 12),
      },
    ],
  },

  /* ---------------- minigame: fast and energetic, A major ---------------- */
  minigame: {
    bpm: 168,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 16,
    echoTime: 0.18,
    volume: 1,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse25',
        gain: 0.085,
        filterFreq: 5800,
        echo: 0.1,
        vibrato: { rate: 6, depth: 4, delay: 0.08 },
        bars: [
          'A4:2 C#5:2 E5:2 A5:2 G#5:2 E5:2 C#5:2 A4:2',
          'D5:2 F#5:2 A5:2 D6:2 C#6:2 A5:2 F#5:2 D5:2',
          'E5:2 G#5:2 B5:2 E6:2 D6:2 B5:2 G#5:2 E5:2',
          'A5:4 E5:4 C#5:4 A4:4',
          'F#5:2 A5:2 C#6:2 A5:2 F#5:2 A5:2 C#6:2 A5:2',
          'D6:2 A5:2 F#5:2 A5:2 D6:2 A5:2 F#5:2 D5:2',
          'E6:2 B5:2 G#5:2 B5:2 E6:2 B5:2 G#5:2 E5:2',
          'A5:8 .:4 E5:4',
          'A4:2 C#5:2 E5:2 A5:2 G#5:2 E5:2 C#5:2 A4:2',
          'D5:2 F#5:2 A5:2 D6:2 C#6:2 A5:2 F#5:2 D5:2',
          'G5:2 B5:2 D6:2 G6:2 F#6:2 D6:2 B5:2 G5:2',
          'A5:2 C#6:2 E6:2 A6:2 G6:2 E6:2 C#6:2 A5:2',
          'F#5:2 A5:2 C#6:2 F#6:2 E6:2 C#6:2 A5:2 F#5:2',
          'G5:2 B5:2 D6:2 G6:2 F#6:2 D6:2 B5:2 G5:2',
          'A5:4 E5:4 A5:4 C#6:4',
          'E6:8 A5:4 E5:4',
        ],
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.036,
        filterFreq: 5600,
        echo: 0.16,
        pan: -0.18,
        bars: [
          'A', 'D', 'E', 'A', 'F#m', 'D', 'E', 'A',
          'A', 'D', 'G', 'A', 'F#m', 'G', 'A', 'A',
        ].map((c) => arpLine(up12(CH[c]), [0, 1, 2, 3, 2, 1, 0, 1], 1, 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.155,
        filterFreq: 1150,
        bars: [
          'A', 'D', 'E', 'A', 'F#m', 'D', 'E', 'A',
          'A', 'D', 'G', 'A', 'F#m', 'G', 'A', 'A',
        ].map((c) => bassLine(ROOT[c], [0, 0, 1, 0, 2, 1, 0, 1], 2, 16)),
      },
      {
        id: 'drums',
        kind: 'drums',
        gain: 1,
        bars: [
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.sstt..',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.sstt..',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.sstt..',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.hks.h.',
          'k.hks.h.k.scs...',
        ],
      },
    ],
  },

  /* ---------------- campfire: gentle 3/4 lullaby, C major ---------------- */
  campfire: {
    bpm: 76,
    beatsPerBar: 3,
    stepsPerBar: 12,
    bars: 12,
    echoTime: 0.42,
    volume: 0.9,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse12',
        gain: 0.058,
        filterFreq: 3000,
        echo: 0.38,
        vibrato: { rate: 4, depth: 4, delay: 0.34 },
        bars: [
          'E5:4 G5:2 G5:2 A5:4',
          'A5:4 G5:2 E5:2 C5:4',
          'F5:4 A5:2 C6:2 A5:4',
          'G5:6 B5:2 D5:4',
          'C6:4 G5:2 E5:2 G5:4',
          'E5:4 G5:2 B5:2 G5:4',
          'A5:4 F5:2 A5:2 C6:4',
          'D6:6 B5:2 G5:4',
          'E5:2 G5:2 C6:4 E6:4',
          'A5:4 E5:2 C5:2 A4:4',
          'F5:2 A5:2 C6:4 A5:4',
          'C6:6 G5:2 E5:4',
        ],
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.028,
        filterFreq: 3400,
        echo: 0.35,
        pan: 0.16,
        bars: [
          'C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G', 'C', 'Am', 'F', 'C',
        ].map((c) => arpLine(CH[c], [0, 1, 2, 3, 2, 1], 2, 12)),
      },
      {
        id: 'pad',
        kind: 'pad',
        wave: 'triangle',
        gain: 0.024,
        filterFreq: 2200,
        echo: 0.2,
        pan: -0.16,
        bars: [
          'C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G', 'C', 'Am', 'F', 'C',
        ].map((c) => padBar(CH[c], 12)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.095,
        filterFreq: 780,
        bars: [
          'C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G', 'C', 'Am', 'F', 'C',
        ].map((c) => bassLine(ROOT[c], [0, 0, 1], 4, 12)),
      },
      {
        id: 'perc',
        kind: 'drums',
        gain: 0.45,
        bars: REP('k...h...h...', 12),
      },
    ],
  },

  /* ---------------- victory: fanfare then calm loop ---------------- */
  victory: {
    bpm: 124,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 12,
    loopStartBar: 4,
    echoTime: 0.3,
    volume: 1,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'pulse25',
        gain: 0.095,
        filterFreq: 6200,
        echo: 0.22,
        vibrato: { rate: 5.4, depth: 5, delay: 0.1 },
        bars: [
          'G4:2 C5:2 E5:2 G5:4 E5:2 G5:4',
          'A5:2 F5:2 C5:2 F5:2 A5:4 F5:4',
          'B5:2 G5:2 D5:2 G5:2 B5:4 G5:4',
          'C6:8 G5:4 E5:4',
          'E5:4 G5:4 C6:8',
          'A5:4 E5:4 C5:8',
          'F5:4 A5:4 C6:8',
          'G5:4 B5:4 D6:8',
          'E5:2 G5:2 C6:4 G5:4 E5:4',
          'C6:4 A5:4 E5:4 A5:4',
          'D6:4 A5:4 F5:4 D5:4',
          'G5:8 D5:4 G4:4',
        ],
      },
      {
        id: 'arp',
        kind: 'arp',
        wave: 'pulse12',
        gain: 0.036,
        filterFreq: 5400,
        echo: 0.24,
        pan: 0.14,
        bars: [
          'C', 'F', 'G', 'C', 'C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G',
        ].map((c) => arpLine(up12(CH[c]), [0, 1, 2, 3, 2, 1, 0, 1], 1, 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.155,
        filterFreq: 1150,
        bars: [
          'C', 'F', 'G', 'C', 'C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G',
        ].map((c) => bassLine(ROOT[c], [0, 0, 1, 0, 2, 1, 0, 1], 2, 16)),
      },
      {
        id: 'drums',
        kind: 'drums',
        gain: 0.95,
        bars: [
          'k.h.s.h.kkh.s.hc',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.stt.',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.h.',
          'k.h.s.h.kkh.s.hk',
        ],
      },
    ],
  },

  /* ---------------- gameover: sad-but-funny trombone, G minor ---------------- */
  gameover: {
    bpm: 88,
    beatsPerBar: 4,
    stepsPerBar: 16,
    bars: 8,
    echoTime: 0.3,
    volume: 0.58,
    channels: [
      {
        id: 'lead',
        kind: 'lead',
        wave: 'saw',
        gain: 0.1,
        filterFreq: 1200,
        echo: 0.3,
        scoop: 1.4,
        vibrato: { rate: 5.8, depth: 15, delay: 0.04 },
        bars: [
          'D5:4 C5:2 Bb4:2 A4:4 G4:4',
          'Eb5:4 D5:2 C5:2 Bb4:8',
          'C5:4 Bb4:2 Ab4:2 G4:4 F4:4',
          'D5:6 C5:2 A4:8',
          'D5:4 C5:2 Bb4:2 A4:4 G4:4',
          'Eb5:2 F5:2 G5:4 F5:4 Eb5:4',
          'D5:4 C5:4 Bb4:4 A4:4',
          'G4:12 .:4',
        ],
      },
      {
        id: 'pad',
        kind: 'pad',
        wave: 'triangle',
        gain: 0.03,
        filterFreq: 1800,
        echo: 0.15,
        bars: [
          'Gm', 'Eb', 'Cm', 'D7', 'Gm', 'Eb', 'D7', 'Gm',
        ].map((c) => padBar(CH[c], 16)),
      },
      {
        id: 'bass',
        kind: 'bass',
        wave: 'triangle',
        gain: 0.12,
        filterFreq: 800,
        bars: [
          'Gm', 'Eb', 'Cm', 'D7', 'Gm', 'Eb', 'D7', 'Gm',
        ].map((c) => bassLine(ROOT[c], [0, 1], 8, 16)),
      },
      {
        id: 'perc',
        kind: 'drums',
        gain: 0.4,
        bars: [
          'r.......r.......',
          'r.......r.......',
          'r.......r.......',
          'r.......r...r...',
          'r.......r.......',
          'r.......r.......',
          'r.......r...r...',
          'r...............',
        ],
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Track parsing / scheduling                                          */
/* ------------------------------------------------------------------ */

/** Parse one channel's bars into step events + authoring diagnostics. */
function parseChannel(channel, def) {
  const spb = def.stepsPerBar;
  const total = def.bars * spb;
  const events = [];
  const issues = [];
  const isDrums = channel.kind === 'drums';

  for (let b = 0; b < def.bars; b += 1) {
    const line = (channel.bars && channel.bars[b]) || '';
    const base = b * spb;

    if (isDrums) {
      const s = String(line).replace(/\s+/g, '');
      if (s.length !== spb) {
        issues.push(`${channel.id}: drum bar ${b + 1} has ${s.length}/${spb} steps`);
      }
      for (let i = 0; i < spb; i += 1) {
        const tok = s[i] || '.';
        if (tok !== '.' && tok !== '-') {
          events.push({ step: base + i, dur: 1, drum: tok });
        }
      }
      continue;
    }

    const toks = String(line).trim() ? String(line).trim().split(/\s+/) : [];
    let pos = 0;
    let last = null;

    for (const tok of toks) {
      if (tok === '-' || tok.startsWith('-:')) {
        pos += 1;
        if (last) last.dur += 1;
        continue;
      }
      if (tok === '.' || tok.startsWith('.:')) {
        const d = tok.startsWith('.:')
          ? Math.max(1, parseInt(tok.slice(2), 10) || 1)
          : 1;
        pos += d;
        last = null;
        continue;
      }
      const note = parseNoteToken(tok);
      if (!note) {
        issues.push(`${channel.id}: bad token "${tok}" in bar ${b + 1}`);
        pos += 1;
        last = null;
        continue;
      }
      const ev = {
        step: base + pos,
        dur: note.dur,
        midis: note.midis,
      };
      events.push(ev);
      last = ev;
      pos += note.dur;
    }

    if (pos !== spb) {
      issues.push(
        `${channel.id}: bar ${b + 1} is ${pos}/${spb} steps long`,
      );
    }
  }

  for (const ev of events) {
    if (ev.step >= total) {
      issues.push(`${channel.id}: event past end of loop`);
    }
  }
  return { events, issues };
}

function buildTrack(def) {
  const spb = def.stepsPerBar;
  const total = def.bars * spb;
  const eventsByStep = Array.from({ length: total }, () => []);

  def.channels.forEach((channel, ci) => {
    const { events } = parseChannel(channel, def);
    for (const ev of events) {
      if (ev.step < 0 || ev.step >= total) continue;
      let dur = ev.dur;
      if (ev.step + dur > total) dur = total - ev.step;
      if (dur <= 0) continue;
      eventsByStep[ev.step].push({
        ci,
        dur,
        midis: ev.midis,
        drum: ev.drum,
      });
    }
  });

  return {
    eventsByStep,
    totalSteps: total,
    stepDur: 60 / def.bpm / 4,
    loopStartStep:
      (def.loopStartBar || 0) * spb,
  };
}

function scheduleStep(cur, stepIndex, time) {
  const def = cur.def;
  const events = cur.built.eventsByStep[stepIndex];
  if (!events || !events.length) return;

  for (const ev of events) {
    const channel = def.channels[ev.ci];
    if (!channel) continue;

    let t = time;
    if (def.beatSwing && stepIndex % 4 === 2) {
      t += def.beatSwing * cur.built.stepDur;
    }

    if (ev.drum) {
      drum(ev.drum, t, cur.gain, channel.gain);
      continue;
    }

    const defaults = VOICE_DEFAULTS[channel.kind] || VOICE_DEFAULTS.lead;
    const legato = channel.legato ?? defaults.legato;
    const dur = Math.max(0.03, ev.dur * cur.built.stepDur * legato);
    const vol = def.volume ?? 1;

    for (const midi of ev.midis) {
      playNote(channel, midi, t, dur, cur.gain, vol);
    }
  }
}

function playNote(channel, midi, t, dur, dest, vol) {
  const defaults = VOICE_DEFAULTS[channel.kind] || VOICE_DEFAULTS.lead;
  tone({
    wave: channel.wave || 'pulse25',
    freq: midiToFreq(midi),
    t,
    dur,
    gain: (channel.gain ?? 0.08) * vol,
    attack: channel.attack ?? defaults.attack,
    decay: channel.decay ?? defaults.decay,
    sustain: channel.sustain ?? defaults.sustain,
    release: channel.release ?? defaults.release,
    filterFreq: channel.filterFreq,
    filterType: channel.filterType,
    filterQ: channel.filterQ,
    pan: channel.pan,
    echo: channel.echo,
    vibrato: channel.vibrato,
    scoop: channel.scoop,
    dest,
  });
}

function ensureScheduler() {
  if (state.schedulerId !== null) return;
  if (!state.ctx || !state.current || state.hidden) return;
  try {
    state.schedulerId = setInterval(schedulerTick, 25);
  } catch {
    state.schedulerId = null;
  }
}

function stopScheduler() {
  if (state.schedulerId === null) return;
  try {
    clearInterval(state.schedulerId);
  } catch {
    /* ignore */
  }
  state.schedulerId = null;
}

function schedulerTick() {
  if (!state.ctx || !state.current || state.hidden) return;
  const cur = state.current;
  try {
    const ctx = state.ctx;
    const horizon = ctx.currentTime + 0.11;
    let guard = 0;
    while (cur.nextTime < horizon && guard < 64) {
      scheduleStep(cur, cur.stepIndex, cur.nextTime);

      cur.nextTime += cur.built.stepDur;
      cur.stepIndex += 1;
      if (cur.stepIndex >= cur.built.totalSteps) {
        cur.stepIndex = cur.built.loopStartStep;
      }
      guard += 1;
    }
    // Tab throttling / sleep: don't machine-gun a backlog of notes.
    if (cur.nextTime < ctx.currentTime - 0.15) {
      cur.nextTime = ctx.currentTime + 0.04;
    }
  } catch (err) {
    if (DEBUG) console.error('[audio] scheduler', err);
  }
}

/* ------------------------------------------------------------------ */
/* Music transport                                                     */
/* ------------------------------------------------------------------ */

function fadeOutAndDispose(gainNode, seconds) {
  const ctx = state.ctx;
  if (!ctx || !gainNode) return;
  try {
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(Math.max(0.0001, gainNode.gain.value), now);
    gainNode.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.02, seconds));
  } catch {
    /* ignore */
  }
  try {
    setTimeout(
      () => {
        try {
          gainNode.disconnect();
        } catch {
          /* ignore */
        }
      },
      Math.max(0, seconds) * 1000 + 120,
    );
  } catch {
    /* ignore */
  }
}

function playMusicInternal(trackId) {
  const ctx = state.ctx;
  const def = TRACKS[trackId];
  if (!ctx || !def) return;

  if (state.current && state.current.trackId === trackId) return;

  tryResume();

  const built = buildTrack(def);
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(state.musicBus);

  const old = state.current;
  const now = ctx.currentTime;
  const fade = 0.4;

  try {
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(1, now + fade);
  } catch {
    gainNode.gain.value = 1;
  }

  if (old) {
    fadeOutAndDispose(old.gain, fade);
  }

  if (state.echoDelay) {
    try {
      state.echoDelay.delayTime.setTargetAtTime(
        def.echoTime ?? 0.27,
        now,
        0.08,
      );
    } catch {
      state.echoDelay.delayTime.value = def.echoTime ?? 0.27;
    }
  }

  state.current = {
    trackId,
    def,
    built,
    gain: gainNode,
    stepIndex: 0,
    nextTime: now + 0.08,
  };
  ensureScheduler();
  schedulerTick();
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const audio = {
  /** Create/resume the AudioContext. Safe to call repeatedly. */
  init() {
    if (state.ctx) {
      tryResume();
      return state.ctx;
    }
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      buildGraph(ctx);
      bindVisibility();
      bindUnlock();
      tryResume();
      const pending = state.pendingTrack;
      state.pendingTrack = null;
      if (pending) playMusicInternal(pending);
      return ctx;
    } catch (err) {
      if (DEBUG) console.error('[audio] init failed', err);
      state.ctx = null;
      return null;
    }
  },

  /** Crossfade to a looping track. Unknown ids are ignored. */
  playMusic(trackId) {
    try {
      if (!hasOwn(TRACKS, trackId)) return;
      if (!state.ctx) {
        state.pendingTrack = trackId;
        this.init();
        return;
      }
      playMusicInternal(trackId);
    } catch (err) {
      if (DEBUG) console.error('[audio] playMusic', err);
    }
  },

  /** Fade out the current music. */
  stopMusic(fadeSec = 0.5) {
    try {
      state.pendingTrack = null;
      const cur = state.current;
      state.current = null;
      stopScheduler();
      if (!cur || !state.ctx) return;
      const fade = Math.max(0, Math.min(3, Number(fadeSec) || 0));
      fadeOutAndDispose(cur.gain, fade);
    } catch (err) {
      if (DEBUG) console.error('[audio] stopMusic', err);
    }
  },

  /** Fire-and-forget one-shot sound effect. */
  sfx(id) {
    try {
      if (!state.ctx || state.muted || state.hidden) return;
      if (!hasOwn(SFX, id) || typeof SFX[id] !== 'function') return;
      SFX[id](state.ctx.currentTime + 0.012);
    } catch (err) {
      if (DEBUG) console.error('[audio] sfx', id, err);
    }
  },

  setMuted(muted) {
    try {
      state.muted = !!muted;
      saveMutedPref(state.muted);
      if (state.ctx && state.master) {
        const now = state.ctx.currentTime;
        const g = state.master.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(Math.max(0.0001, g.value), now);
        g.linearRampToValueAtTime(
          state.muted ? 0.0001 : MASTER_VOLUME,
          now + 0.03,
        );
      }
    } catch (err) {
      if (DEBUG) console.error('[audio] setMuted', err);
    }
  },

  isMuted() {
    return state.muted;
  },

  setMusicVolume(v) {
    try {
      state.musicVol = clamp01(v);
      if (state.ctx && state.musicBus) {
        const now = state.ctx.currentTime;
        const g = state.musicBus.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(state.musicVol, now + 0.05);
      }
    } catch (err) {
      if (DEBUG) console.error('[audio] setMusicVolume', err);
    }
  },

  setSfxVolume(v) {
    try {
      state.sfxVol = clamp01(v);
      if (state.ctx && state.sfxBus) {
        const now = state.ctx.currentTime;
        const g = state.sfxBus.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(state.sfxVol, now + 0.05);
      }
    } catch (err) {
      if (DEBUG) console.error('[audio] setSfxVolume', err);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Sound effects                                                       */
/* ------------------------------------------------------------------ */

const sfxTone = (o) => tone({ ...o, dest: state.sfxBus });
const sfxNoise = (o) => noise({ ...o, dest: state.sfxBus });

const SFX = {
  select(t) {
    sfxTone({
      wave: 'pulse25',
      freq: 880,
      freqEnd: 1240,
      t,
      dur: 0.06,
      gain: 0.09,
      attack: 0.004,
      env: 'adsr',
      sustain: 0.6,
      release: 0.02,
    });
  },

  confirm(t) {
    [659, 880, 1318].forEach((f, i) => {
      sfxTone({
        wave: 'pulse25',
        freq: f,
        t: t + i * 0.055,
        dur: 0.1,
        gain: 0.085,
        attack: 0.004,
        env: 'adsr',
        sustain: 0.55,
        release: 0.03,
      });
    });
  },

  back(t) {
    [523, 392].forEach((f, i) => {
      sfxTone({
        wave: 'pulse25',
        freq: f,
        t: t + i * 0.06,
        dur: 0.09,
        gain: 0.08,
        attack: 0.004,
        env: 'adsr',
        sustain: 0.5,
        release: 0.03,
      });
    });
  },

  type(t) {
    // Very cheap and very short. Throttle same-frame duplicates so a
    // fast typewriter cannot stack into a loud click.
    const now = state.ctx ? state.ctx.currentTime : 0;
    if (now - state.lastTypeAt < 0.016) return;
    state.lastTypeAt = now;
    sfxTone({
      wave: 'pulse12',
      freq: 1250 + Math.random() * 500,
      t,
      dur: 0.018,
      gain: 0.017,
      attack: 0.002,
      env: 'perc',
    });
  },

  cash(t) {
    sfxNoise({
      t,
      dur: 0.035,
      gain: 0.12,
      filterType: 'highpass',
      filterFreq: 2500,
      env: 'perc',
    });
    sfxTone({
      wave: 'pulse25',
      freq: 1568,
      t,
      dur: 0.05,
      gain: 0.06,
      env: 'perc',
    });
    [1568, 2349, 3136].forEach((f, i) => {
      sfxTone({
        wave: 'sine',
        freq: f,
        t: t + 0.075 + i * 0.008,
        dur: 0.5 - i * 0.08,
        gain: 0.075 / (i + 1),
        attack: 0.003,
        env: 'perc',
      });
    });
  },

  honk(t) {
    const blast = (start, length) => {
      [349, 440].forEach((f, i) => {
        sfxTone({
          wave: 'square',
          freq: f,
          t: start,
          dur: length,
          gain: 0.08,
          attack: 0.02,
          env: 'adsr',
          sustain: 0.85,
          release: 0.08,
          filterFreq: 2200,
          filterType: 'lowpass',
          filterQ: 0.8,
          pan: i ? 0.12 : -0.12,
          vibrato: { rate: 5.5, depth: 1.5, delay: 0.05 },
        });
      });
    };
    blast(t, 0.2);
    blast(t + 0.24, 0.26);
  },

  engine(t) {
    // Starter whine.
    sfxNoise({
      t,
      dur: 0.16,
      gain: 0.12,
      filterType: 'bandpass',
      filterFreq: 1400,
      filterFreqEnd: 600,
      q: 0.9,
      env: 'perc',
    });
    sfxTone({
      wave: 'saw',
      freq: 90,
      freqEnd: 38,
      t: t + 0.05,
      dur: 1.0,
      gain: 0.22,
      attack: 0.02,
      env: 'adsr',
      sustain: 0.75,
      release: 0.25,
      filterFreq: 380,
      filterType: 'lowpass',
      filterQ: 1,
      vibrato: { rate: 7.5, depth: 5, delay: 0.03 },
    });
    sfxTone({
      wave: 'saw',
      freq: 45.5,
      freqEnd: 39,
      t: t + 0.08,
      dur: 0.95,
      gain: 0.16,
      attack: 0.03,
      env: 'adsr',
      sustain: 0.8,
      release: 0.25,
      filterFreq: 240,
      filterType: 'lowpass',
    });
    // V10 flutter.
    sfxNoise({
      t: t + 0.08,
      dur: 0.9,
      gain: 0.035,
      filterType: 'lowpass',
      filterFreq: 180,
      env: 'adsr',
      attack: 0.06,
      sustain: 0.8,
      release: 0.2,
    });
  },

  pop(t) {
    sfxNoise({
      t,
      dur: 0.26,
      gain: 0.24,
      filterType: 'bandpass',
      filterFreq: 3200,
      filterFreqEnd: 700,
      q: 0.7,
      env: 'perc',
    });
    sfxTone({
      wave: 'sine',
      freq: 110,
      freqEnd: 42,
      t,
      dur: 0.22,
      gain: 0.22,
      env: 'perc',
    });
    sfxNoise({
      t: t + 0.16,
      dur: 0.35,
      gain: 0.08,
      filterType: 'highpass',
      filterFreq: 3000,
      env: 'perc',
    });
  },

  thud(t) {
    sfxTone({
      wave: 'sine',
      freq: 95,
      freqEnd: 44,
      t,
      dur: 0.19,
      gain: 0.3,
      env: 'perc',
    });
    sfxNoise({
      t,
      dur: 0.06,
      gain: 0.1,
      filterType: 'lowpass',
      filterFreq: 900,
      env: 'perc',
    });
  },

  woof(t) {
    const bark = (start, pitch, len) => {
      sfxTone({
        wave: 'saw',
        freq: pitch,
        freqEnd: pitch * 0.42,
        t: start,
        dur: len,
        gain: 0.17,
        attack: 0.004,
        env: 'adsr',
        sustain: 0.4,
        release: 0.035,
        filterFreq: 950,
        filterType: 'bandpass',
        filterQ: 1.1,
      });
      sfxNoise({
        t: start,
        dur: len * 0.7,
        gain: 0.07,
        filterType: 'bandpass',
        filterFreq: 1300,
        filterFreqEnd: 700,
        q: 1.2,
        env: 'perc',
      });
    };
    bark(t, 500, 0.085);
    bark(t + 0.145, 560, 0.1);
  },

  meow(t) {
    sfxTone({
      wave: 'sine',
      freq: 520,
      freqEnd: 860,
      t,
      dur: 0.19,
      gain: 0.11,
      attack: 0.015,
      env: 'adsr',
      sustain: 0.75,
      release: 0.05,
      vibrato: { rate: 8, depth: 22, delay: 0.02 },
      filterFreq: 1400,
      filterType: 'bandpass',
      filterQ: 1.2,
    });
    sfxTone({
      wave: 'sine',
      freq: 860,
      freqEnd: 470,
      t: t + 0.18,
      dur: 0.24,
      gain: 0.095,
      attack: 0.01,
      env: 'adsr',
      sustain: 0.7,
      release: 0.08,
      vibrato: { rate: 7, depth: 18, delay: 0.02 },
      filterFreq: 1200,
      filterType: 'bandpass',
      filterQ: 1.1,
    });
  },

  hiss(t) {
    sfxNoise({
      t,
      dur: 0.55,
      gain: 0.065,
      filterType: 'highpass',
      filterFreq: 3600,
      q: 0.7,
      env: 'adsr',
      attack: 0.08,
      sustain: 0.8,
      release: 0.2,
    });
  },

  buzz(t) {
    sfxTone({
      wave: 'saw',
      freq: 210,
      freqEnd: 185,
      t,
      dur: 0.5,
      gain: 0.065,
      attack: 0.01,
      env: 'adsr',
      sustain: 0.8,
      release: 0.1,
      filterFreq: 850,
      filterType: 'bandpass',
      filterQ: 1.4,
      vibrato: { rate: 31, depth: 35, delay: 0.02 },
    });
    sfxTone({
      wave: 'square',
      freq: 105,
      t,
      dur: 0.45,
      gain: 0.025,
      attack: 0.01,
      env: 'adsr',
      sustain: 0.7,
      release: 0.08,
      filterFreq: 500,
      filterType: 'lowpass',
      vibrato: { rate: 29, depth: 10, delay: 0.02 },
    });
  },

  pickup(t) {
    [880, 1108, 1318, 1760].forEach((f, i) => {
      sfxTone({
        wave: 'pulse12',
        freq: f,
        t: t + i * 0.045,
        dur: 0.085,
        gain: 0.07,
        attack: 0.003,
        env: 'adsr',
        sustain: 0.45,
        release: 0.025,
      });
    });
  },

  splash(t) {
    sfxNoise({
      t,
      dur: 0.38,
      gain: 0.17,
      filterType: 'lowpass',
      filterFreq: 2400,
      filterFreqEnd: 380,
      q: 0.6,
      env: 'perc',
    });
    [0, 0.09, 0.2].forEach((d, i) => {
      sfxTone({
        wave: 'sine',
        freq: 380 + i * 160,
        freqEnd: 700 + i * 220,
        t: t + d,
        dur: 0.09,
        gain: 0.05,
        env: 'perc',
      });
    });
  },

  crash(t) {
    sfxNoise({
      t,
      dur: 0.7,
      gain: 0.28,
      filterType: 'highpass',
      filterFreq: 900,
      env: 'perc',
      attack: 0.003,
    });
    sfxTone({
      wave: 'sine',
      freq: 90,
      freqEnd: 40,
      t,
      dur: 0.35,
      gain: 0.28,
      env: 'perc',
    });
    [317, 487, 733].forEach((f, i) => {
      sfxTone({
        wave: 'triangle',
        freq: f,
        t,
        dur: 0.26 + i * 0.05,
        gain: 0.06 / (i + 1),
        env: 'perc',
      });
    });
  },

  ding(t) {
    [1046, 1568, 2093, 2637].forEach((f, i) => {
      sfxTone({
        wave: 'sine',
        freq: f,
        t,
        dur: 1.0 - i * 0.12,
        gain: 0.09 / (i * 0.6 + 1),
        attack: 0.004,
        env: 'perc',
      });
    });
    sfxTone({
      wave: 'pulse12',
      freq: 1046,
      t,
      dur: 0.08,
      gain: 0.03,
      env: 'perc',
    });
  },

  bad(t) {
    sfxTone({
      wave: 'saw',
      freq: 392,
      freqEnd: 311,
      t,
      dur: 0.42,
      gain: 0.11,
      attack: 0.01,
      env: 'adsr',
      sustain: 0.7,
      release: 0.12,
      filterFreq: 1300,
      filterType: 'lowpass',
      vibrato: { rate: 5, depth: 8, delay: 0.04 },
    });
    sfxTone({
      wave: 'triangle',
      freq: 98,
      freqEnd: 78,
      t,
      dur: 0.5,
      gain: 0.12,
      attack: 0.01,
      env: 'adsr',
      sustain: 0.7,
      release: 0.15,
    });
  },

  good(t) {
    [523, 659, 784, 1046].forEach((f, i) => {
      sfxTone({
        wave: 'pulse25',
        freq: f,
        t: t + i * 0.06,
        dur: 0.16,
        gain: 0.06,
        attack: 0.004,
        env: 'adsr',
        sustain: 0.5,
        release: 0.05,
      });
    });
  },

  rain(t) {
    sfxNoise({
      t,
      dur: 2.0,
      gain: 0.055,
      filterType: 'highpass',
      filterFreq: 1800,
      q: 0.5,
      env: 'adsr',
      attack: 0.12,
      sustain: 0.85,
      release: 0.35,
      loop: true,
      pan: -0.15,
    });
    for (let i = 0; i < 16; i += 1) {
      const when = t + 0.05 + Math.random() * 1.8;
      const f = 900 + Math.random() * 1600;
      sfxTone({
        wave: 'sine',
        freq: f,
        freqEnd: f * 0.8,
        t: when,
        dur: 0.035,
        gain: 0.012 + Math.random() * 0.012,
        env: 'perc',
        pan: (Math.random() - 0.5) * 0.8,
      });
    }
  },

  thunder(t) {
    sfxNoise({
      t,
      dur: 0.18,
      gain: 0.16,
      filterType: 'bandpass',
      filterFreq: 700,
      filterFreqEnd: 250,
      q: 0.6,
      env: 'perc',
    });
    sfxNoise({
      t: t + 0.04,
      dur: 2.8,
      gain: 0.3,
      filterType: 'lowpass',
      filterFreq: 190,
      filterFreqEnd: 90,
      q: 0.8,
      env: 'adsr',
      attack: 0.12,
      decay: 0.4,
      sustain: 0.7,
      release: 0.9,
      loop: true,
      pan: 0.1,
    });
    sfxNoise({
      t: t + 0.9,
      dur: 1.7,
      gain: 0.14,
      filterType: 'lowpass',
      filterFreq: 240,
      filterFreqEnd: 110,
      q: 0.7,
      env: 'adsr',
      attack: 0.25,
      decay: 0.3,
      sustain: 0.6,
      release: 0.7,
      loop: true,
      pan: -0.2,
    });
  },

  step(t) {
    sfxNoise({
      t,
      dur: 0.06,
      gain: 0.045,
      filterType: 'lowpass',
      filterFreq: 620,
      env: 'perc',
      pan: (Math.random() - 0.5) * 0.4,
    });
    sfxTone({
      wave: 'sine',
      freq: 120,
      freqEnd: 70,
      t,
      dur: 0.04,
      gain: 0.03,
      env: 'perc',
    });
  },
};

/* ------------------------------------------------------------------ */
/* Authoring validation (only runs when explicitly enabled)            */
/* ------------------------------------------------------------------ */

function validateTracks() {
  const problems = [];
  for (const [id, def] of Object.entries(TRACKS)) {
    const seconds = (def.bars * def.beatsPerBar * 60) / def.bpm;
    if (seconds < 19.9 || seconds > 60.1) {
      problems.push(`${id}: loop is ${seconds.toFixed(1)}s (want 20-60s)`);
    }
    if (!def.channels || !def.channels.length) {
      problems.push(`${id}: no channels`);
      continue;
    }
    for (const ch of def.channels) {
      if (!Array.isArray(ch.bars) || ch.bars.length !== def.bars) {
        problems.push(
          `${id}/${ch.id}: ${ch.bars ? ch.bars.length : 0} bars, wanted ${def.bars}`,
        );
      }
      if (!(ch.gain >= 0 && ch.gain <= 1)) {
        problems.push(`${id}/${ch.id}: bad gain`);
      }
      const { events, issues } = parseChannel(ch, def);
      problems.push(...issues.map((m) => `${id}/${ch.id}: ${m}`));
      for (const ev of events) {
        if (ev.midis) {
          for (const m of ev.midis) {
            if (!Number.isFinite(m) || m < 24 || m > 100) {
              problems.push(`${id}/${ch.id}: midi ${m} out of range`);
            }
          }
        }
        if (ev.step + ev.dur > def.bars * def.stepsPerBar) {
          problems.push(
            `${id}/${ch.id}: note at step ${ev.step} overruns loop`,
          );
        }
      }
    }
  }
  if (problems.length) {
    throw new Error(`[audio] composition problems:\n${problems.join('\n')}`);
  }
  return true;
}

if (
  typeof globalThis !== 'undefined' &&
  globalThis.__BBD_AUDIO_VALIDATE__
) {
  validateTracks();
}
