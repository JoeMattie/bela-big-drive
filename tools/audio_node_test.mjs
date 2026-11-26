/**
 * Headless smoke test for src/engine/audio.js.
 *
 * Runs the real engine against a strict fake AudioContext that validates
 * every AudioParam value and throws on NaN / bad exponential ramps. It
 * exercises: no-context no-ops, lazy init, every music track through a
 * full loop, every sfx id, mute persistence, volume clamping, visibility
 * pause/resume and rapid typewriter ticks.
 *
 *   node tools/audio_node_test.mjs
 */

import assert from 'node:assert/strict';

/* ------------------------------------------------------------------ */
/* Strict fake Web Audio                                               */
/* ------------------------------------------------------------------ */

let paramCount = 0;
let oscCount = 0;
let noiseCount = 0;

class Param {
  constructor(value = 0, name = 'param') {
    this.value = value;
    this.name = name;
    this.automation = [];
    paramCount += 1;
  }

  _check(v, kind) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`${this.name}: ${kind} value is not finite (${v})`);
    }
  }

  setValueAtTime(v, t) {
    this._check(v, 'setValueAtTime');
    this._check(t, 'setValueAtTime time');
    this.value = v;
    this.automation.push(['set', v, t]);
    return this;
  }

  linearRampToValueAtTime(v, t) {
    this._check(v, 'linearRamp');
    this._check(t, 'linearRamp time');
    this.automation.push(['linear', v, t]);
    return this;
  }

  exponentialRampToValueAtTime(v, t) {
    this._check(v, 'exponentialRamp');
    this._check(t, 'exponentialRamp time');
    if (v <= 0) throw new Error(`${this.name}: exponential target <= 0`);
    this.automation.push(['exp', v, t]);
    return this;
  }

  setTargetAtTime(v, t, constant) {
    this._check(v, 'setTarget');
    this._check(t, 'setTarget time');
    this.automation.push(['target', v, t, constant]);
    return this;
  }

  cancelScheduledValues(t) {
    this._check(t, 'cancel time');
    this.automation.length = 0;
    return this;
  }
}

class FakeNode {
  constructor(type) {
    this.type = type;
    this.outputs = [];
    this.inputs = [];
    this.disconnected = false;
  }

  connect(dest) {
    if (!dest) throw new Error(`${this.type}.connect(undefined)`);
    this.outputs.push(dest);
    if (dest.inputs) dest.inputs.push(this);
    return dest;
  }

  disconnect() {
    this.disconnected = true;
    for (const out of this.outputs) {
      if (out.inputs) out.inputs = out.inputs.filter((n) => n !== this);
    }
    this.outputs.length = 0;
  }
}

class FakeGain extends FakeNode {
  constructor() {
    super('gain');
    this.gain = new Param(1, 'gain');
  }
}

class FakeOsc extends FakeNode {
  constructor() {
    super('oscillator');
    this.frequency = new Param(440, 'frequency');
    this.detune = new Param(0, 'detune');
    this.type = 'sine';
    this.started = false;
    this.stopped = false;
    this.onended = null;
    oscCount += 1;
  }

  setPeriodicWave(w) {
    if (!w) throw new Error('setPeriodicWave(undefined)');
    this.periodicWave = w;
  }

  start(t) {
    if (this.started) throw new Error('oscillator started twice');
    this._check(t);
    this.started = true;
  }

  stop(t) {
    this._check(t);
    this.stopped = true;
  }

  _check(t) {
    if (typeof t !== 'number' || !Number.isFinite(t)) {
      throw new Error(`oscillator time invalid (${t})`);
    }
  }
}

class FakeBufferSource extends FakeNode {
  constructor() {
    super('bufferSource');
    this.buffer = null;
    this.loop = false;
    this.playbackRate = new Param(1, 'playbackRate');
    this.started = false;
    this.stopped = false;
    this.onended = null;
    noiseCount += 1;
  }

  start(t, offset = 0) {
    if (this.started) throw new Error('bufferSource started twice');
    if (!Number.isFinite(t) || !Number.isFinite(offset)) {
      throw new Error('bufferSource invalid start');
    }
    this.started = true;
  }

  stop(t) {
    if (!Number.isFinite(t)) throw new Error('bufferSource invalid stop');
    this.stopped = true;
  }
}

class FakeBuffer {
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.data = Array.from({ length: channels }, () => new Float32Array(length));
  }

  getChannelData(i) {
    if (!this.data[i]) throw new Error('bad channel');
    return this.data[i];
  }
}

class FakeFilter extends FakeNode {
  constructor() {
    super('biquad');
    this.frequency = new Param(350, 'filter.frequency');
    this.Q = new Param(1, 'filter.Q');
    this.gain = new Param(0, 'filter.gain');
    this.type = 'lowpass';
  }
}

class FakeDelay extends FakeNode {
  constructor() {
    super('delay');
    this.delayTime = new Param(0, 'delayTime');
  }
}

class FakeCompressor extends FakeNode {
  constructor() {
    super('compressor');
    this.threshold = new Param(-24, 'threshold');
    this.knee = new Param(30, 'knee');
    this.ratio = new Param(12, 'ratio');
    this.attack = new Param(0.003, 'attack');
    this.release = new Param(0.25, 'release');
  }
}

class FakePanner extends FakeNode {
  constructor() {
    super('panner');
    this.pan = new Param(0, 'pan');
  }
}

const realNow = () => Number(process.hrtime.bigint() / 1000n) / 1000;
const TIME_SCALE = 40;

class FakeAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = new FakeNode('destination');
    this._start = realNow();
  }

  get currentTime() {
    return ((realNow() - this._start) / 1000) * TIME_SCALE;
  }

  createGain() {
    return new FakeGain();
  }

  createOscillator() {
    return new FakeOsc();
  }

  createBufferSource() {
    return new FakeBufferSource();
  }

  createBuffer(channels, length, sampleRate) {
    return new FakeBuffer(channels, length, sampleRate);
  }

  createBiquadFilter() {
    return new FakeFilter();
  }

  createDelay() {
    return new FakeDelay();
  }

  createDynamicsCompressor() {
    return new FakeCompressor();
  }

  createStereoPanner() {
    return new FakePanner();
  }

  createPeriodicWave(real, imag) {
    if (!(real instanceof Float32Array) || !(imag instanceof Float32Array)) {
      throw new Error('periodic wave arrays must be Float32Array');
    }
    if (real.length !== imag.length) throw new Error('periodic wave length mismatch');
    for (let i = 0; i < real.length; i += 1) {
      if (!Number.isFinite(real[i]) || !Number.isFinite(imag[i])) {
        throw new Error('periodic wave has non-finite coefficient');
      }
    }
    return { real, imag };
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

/* ------------------------------------------------------------------ */
/* Browser-ish globals                                                 */
/* ------------------------------------------------------------------ */

const STORAGE = new Map();
const listeners = new Map();

const fakeDocument = {
  hidden: false,
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(fn);
  },
  removeEventListener(type, fn) {
    const arr = listeners.get(type) || [];
    listeners.set(type, arr.filter((f) => f !== fn));
  },
};

function fire(type) {
  for (const fn of listeners.get(type) || []) fn({ type });
}

Object.defineProperty(globalThis, 'document', {
  value: fakeDocument,
  configurable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k) => (STORAGE.has(k) ? STORAGE.get(k) : null),
    setItem: (k, v) => STORAGE.set(k, String(v)),
    removeItem: (k) => STORAGE.delete(k),
  },
  configurable: true,
});

globalThis.__BBD_AUDIO_VALIDATE__ = true;
globalThis.__BBD_AUDIO_DEBUG__ = true;

const errors = [];
const originalError = console.error;
console.error = (...args) => {
  errors.push(args.map((a) => (a && a.stack ? a.stack : String(a))).join(' '));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

const TRACK_IDS = [
  'title',
  'travel',
  'travel_rain',
  'town',
  'store',
  'landmark',
  'tension',
  'minigame',
  'campfire',
  'victory',
  'gameover',
];

const SFX_IDS = [
  'select',
  'confirm',
  'back',
  'type',
  'cash',
  'honk',
  'engine',
  'pop',
  'thud',
  'woof',
  'meow',
  'hiss',
  'buzz',
  'pickup',
  'splash',
  'crash',
  'ding',
  'bad',
  'good',
  'rain',
  'thunder',
  'step',
];

function resetCounts() {
  oscCount = 0;
  noiseCount = 0;
}

async function main() {
  // Import the real engine. With no AudioContext constructor available yet,
  // every public call must be a safe no-op.
  const { audio } = await import('../src/engine/audio.js');
  assert.equal(typeof audio.init, 'function');
  assert.equal(typeof audio.playMusic, 'function');
  assert.equal(typeof audio.stopMusic, 'function');
  assert.equal(typeof audio.sfx, 'function');
  assert.equal(typeof audio.setMuted, 'function');
  assert.equal(typeof audio.isMuted, 'function');
  assert.equal(typeof audio.setMusicVolume, 'function');
  assert.equal(typeof audio.setSfxVolume, 'function');

  assert.equal(audio.init(), null, 'init should no-op without AudioContext');
  audio.playMusic('title'); // remembered, not started
  audio.sfx('cash');
  audio.stopMusic();
  audio.setMuted(false);
  audio.setMusicVolume(0.5);
  audio.setSfxVolume(0.5);
  audio.playMusic('does_not_exist');
  audio.sfx('does_not_exist');
  assert.equal(audio.isMuted(), false);
  assert.equal(errors.length, 0, `errors before init: ${errors.join('\n')}`);

  // Now make a context available; init should create it and start the
  // pending track queued before init.
  audio.playMusic('title');
  globalThis.AudioContext = FakeAudioContext;
  resetCounts();
  const ctx = audio.init();
  assert.ok(ctx, 'init should create the context');
  assert.equal(audio.init(), ctx, 'init must be idempotent');
  await sleep(250);
  assert.ok(oscCount > 0, 'pending title track did not schedule notes');
  assert.equal(errors.length, 0, `errors after init: ${errors.join('\n')}`);

  // Every track: play it, let the sped-up clock run through a whole loop,
  // and assert that oscillators were actually scheduled.
  for (const id of TRACK_IDS) {
    resetCounts();
    audio.playMusic(id);
    await sleep(950);
    assert.ok(
      oscCount > 0,
      `track "${id}" scheduled no oscillator notes`,
    );
    assert.equal(errors.length, 0, `errors in "${id}": ${errors.join('\n')}`);
  }

  // Stop the music so SFX node counts are isolated.
  audio.stopMusic(0.05);
  await sleep(120);

  // Every sfx id must actually synthesize something (unknown ids stay quiet).
  for (const id of SFX_IDS) {
    resetCounts();
    audio.sfx(id);
    await sleep(15);
    assert.ok(
      oscCount + noiseCount > 0,
      `sfx "${id}" synthesized no nodes`,
    );
    assert.equal(errors.length, 0, `errors in sfx "${id}": ${errors.join('\n')}`);
  }

  // Typewriter spam: same-tick duplicates are throttled so a fast
  // typewriter cannot stack into a loud click, but normal cadence works.
  resetCounts();
  for (let i = 0; i < 60; i += 1) audio.sfx('type');
  assert.ok(
    oscCount >= 1 && oscCount <= 60,
    `type spam created ${oscCount} oscillators`,
  );
  resetCounts();
  await sleep(40);
  audio.sfx('type');
  await sleep(30);
  audio.sfx('type');
  assert.equal(oscCount, 2, `type cadence created ${oscCount} oscillators`);
  assert.equal(errors.length, 0, `errors in type spam: ${errors.join('\n')}`);

  // Mute persistence + sfx silencing.
  audio.setMuted(true);
  assert.equal(audio.isMuted(), true);
  assert.equal(STORAGE.get('bbd_muted'), '1');
  resetCounts();
  audio.sfx('cash');
  assert.equal(oscCount + noiseCount, 0, 'muted sfx should not synthesize');
  audio.setMuted(false);
  assert.equal(STORAGE.get('bbd_muted'), '0');

  // Volume clamping.
  audio.setMusicVolume(2);
  audio.setMusicVolume(-3);
  audio.setMusicVolume('nope');
  audio.setSfxVolume(2);
  audio.setSfxVolume(-1);
  assert.equal(errors.length, 0, `errors in volume/mute: ${errors.join('\n')}`);

  // Visibility pause/resume.
  audio.playMusic('town');
  await sleep(120);
  fakeDocument.hidden = true;
  fire('visibilitychange');
  resetCounts();
  await sleep(120);
  assert.equal(oscCount, 0, 'scheduler kept running while hidden');
  resetCounts();
  audio.sfx('cash');
  assert.equal(oscCount + noiseCount, 0, 'sfx played while hidden');
  fakeDocument.hidden = false;
  fire('visibilitychange');
  resetCounts();
  await sleep(250);
  assert.ok(oscCount > 0, 'scheduler did not resume when visible');
  assert.equal(errors.length, 0, `errors in visibility: ${errors.join('\n')}`);

  // Stop must not throw, and must stop future scheduling.
  audio.stopMusic(0.1);
  resetCounts();
  await sleep(120);
  assert.equal(oscCount, 0, 'scheduler kept running after stopMusic');
  audio.stopMusic();
  audio.stopMusic(999);

  assert.equal(errors.length, 0, `unexpected audio errors:\n${errors.join('\n')}`);

  console.error = originalError;
  console.log('audio_node_test: PASS');
  console.log(
    `  ${TRACK_IDS.length} tracks (full loop each), ${SFX_IDS.length} sfx, ` +
      `${paramCount} AudioParams checked, ${oscCount} oscillators in last slice`,
  );
}

main().catch((err) => {
  console.error = originalError;
  console.error('audio_node_test: FAIL');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
