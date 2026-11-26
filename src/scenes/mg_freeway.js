// Minigame: "Freeway Frenzy" — vertical-scrolling top-down highway dodge.
// Steer the RV between 4 lanes, dodge traffic and debris, grab gas cans.
// params.theme: 'debris' | 'snow' | 'traffic'
// outcome = { hits, gas, score }
import { gfx, PAL, W, H } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { game } from '../game/game.js';

const DUR = 35;
const ROAD_X = 160;            // road_tile.png drawn at 1x, 160px wide, centered
const LANES = [30.5, 63.5, 96.5, 129.5].map((x) => ROAD_X + x);
const RV_Y = 234;              // RV center y (screen)
const PX_PER_MILE = 2200;

const THEMES = {
  debris: {
    name: 'LA FREEWAY DEBRIS', blurb: 'Mattresses, ladders, a whole couch. Classic 405.',
    speed: 235, interval: [0.62, 0.42], mix: { car: 0.32, haz: 0.56, couch: 0.08, semi: 0.04 },
    haz: [0, 1, 2, 3, 4, 5], ground: ['#c8a468', '#b8945a', '#d6b47a'], scenery: 'socal', chp: true,
  },
  traffic: {
    name: 'BUMPER TO BUMPER', blurb: 'Everyone is in a hurry. Nobody uses a blinker.',
    speed: 225, interval: [0.55, 0.4], mix: { car: 0.72, semi: 0.16, haz: 0.12 },
    haz: [0, 1, 5], ground: ['#7c8a6a', '#6e7c5e', '#8a967a'], scenery: 'city', chp: true,
  },
  snow: {
    name: 'SNOW ON THE PASS', blurb: 'Slick road! The RV slides - steer early.',
    speed: 170, interval: [0.85, 0.6], mix: { car: 0.46, haz: 0.24, ice: 0.3 },
    haz: [0, 1, 5], ground: ['#e8eef4', '#dfe7ee', '#f4f8fb'], scenery: 'snow', chp: false, slick: true,
  },
};

const CAR_COLORS = ['#8ab4c8', '#3a7a3a', '#c83a3a', '#d8c08a', '#3a6ac8', '#202028'];

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weighted(mix) {
  let r = Math.random(), last = null;
  for (const k in mix) { last = k; r -= mix[k]; if (r <= 0) return k; }
  return last;
}
function blink(t, rate = 2) { return Math.floor(t * rate) % 2 === 0; }
function ellipse(cx, cy, rx, ry, col) {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.01))));
    gfx.rect(cx - w, cy + dy, w * 2 + 1, 1, col);
  }
}

game.register('freeway', () => ({
  enter(params) {
    this.params = params || {};
    this.themeId = THEMES[this.params.theme] ? this.params.theme : 'traffic';
    this.th = THEMES[this.themeId];
    this.phase = 'intro';
    this.t = 0; this.pt = 0; this.time = DUR;
    this.finished = false;
    this.scroll = 0;           // total distance in px
    this.speedMul = 1; this.boost = 1; this.slow = 1;
    this.rv = { lane: 1, x: LANES[1], vx: 0, y: RV_Y, vy: 0, inv: 0, drift: 0 };
    this.objs = [];
    this.spawnT = 1.2; this.gasT = 2.5; this.chpDone = !this.th.chp; this.chpAt = rnd(12, 22);
    this.hits = 0; this.gas = 0; this.close = 0; this.closeChain = 0; this.closeT = 0; this.bonus = 0;
    this.parts = []; this.pops = [];
    this.flakes = [];
    if (this.th.slick) for (let i = 0; i < 70; i++) this.flakes.push({ x: Math.random() * W, y: Math.random() * H, s: rnd(0.5, 1.5), z: Math.random() < 0.3 ? 2 : 1 });
    audio.playMusic('minigame');
  },

  get speed() { return this.th.speed * this.speedMul * this.boost * this.slow; },
  score() { return Math.max(0, Math.floor(this.scroll / 10) + this.gas * 100 + this.bonus - this.hits * 75); },

  pop(x, y, text, col, size = 16, life = 1, head = false) { this.pops.push({ x, y, text, col, size, life, max: life, head }); },
  burst(x, y, n, cols, sp = 80) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(sp * 0.3, sp);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.7), max: 0.7, col: cols[i % cols.length], size: Math.random() < 0.3 ? 3 : 2 });
    }
  },

  update(dt) {
    this.t += dt;
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += (p.vy + this.speed * 0.6) * dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const p of this.pops) { p.life -= dt; p.y -= 20 * dt; }
    this.pops = this.pops.filter((p) => p.life > 0);
    for (const f of this.flakes) {
      f.y += (30 + this.speed * 0.25 * f.z) * dt * f.s; f.x += Math.sin(this.t * 2 + f.y * 0.05) * 12 * dt - 6 * dt;
      if (f.y > H) { f.y = -2; f.x = Math.random() * W; }
      if (f.x < 0) f.x += W;
    }
    if (this.phase === 'intro') {
      this.scroll += 60 * dt;
      if (this.t > 0.4 && input.anyKey()) { this.phase = 'play'; this.pt = 0; audio.sfx('honk'); input.consumeClicks(); input.consumeKeys(); this.pop(W / 2, 120, 'GO!', PAL.hi, 20, 1, true); }
      return;
    }
    if (this.phase === 'play') { this.updatePlay(dt); return; }
    if (this.phase === 'over') {
      this.pt += dt;
      this.speedMul += (0.4 - this.speedMul) * dt * 2;
      this.scroll += this.speed * dt;
      this.moveObjs(dt);
      this.steer(dt);
      if (this.pt > 1.6) { this.phase = 'results'; this.pt = 0; audio.sfx(this.hits <= 1 ? 'good' : 'ding'); }
      return;
    }
    if (this.phase === 'results') {
      this.pt += dt;
      this.scroll += 40 * dt;
      if (this.pt > 0.8 && input.anyKey() && !this.finished) {
        this.finished = true;
        audio.sfx('confirm');
        const outcome = { hits: this.hits, gas: this.gas, score: this.score() };
        if (this.params.onFinish) this.params.onFinish(outcome);
      }
    }
  },

  updatePlay(dt) {
    this.pt += dt;
    this.time = Math.max(0, DUR - this.pt);
    const rv = this.rv;
    // ---- input ----
    if (input.any('ArrowLeft', 'a')) this.changeLane(-1);
    if (input.any('ArrowRight', 'd')) this.changeLane(1);
    let want = 1;
    if (input.held('ArrowUp') || input.held('w')) want = 1.28;
    if (input.held('ArrowDown') || input.held('s')) want = 0.72;
    if (input.pointerHeld && input.mouse.x >= 0) {
      // the whole screen width maps to the 4 lanes, so a thumb anywhere works
      const l = clamp(Math.floor(input.mouse.x / (W / 4)), 0, 3);
      if (l !== rv.lane) { rv.lane = l; audio.sfx('select'); }
      if (input.mouse.y < 110) want = 1.28; else if (input.mouse.y > 270) want = 0.72;
    }
    this.boost += (want - this.boost) * Math.min(1, dt * 3);
    this.slow += (1 - this.slow) * Math.min(1, dt * 0.9);
    this.speedMul = 1 + (this.pt / DUR) * 0.18; // gentle ramp
    this.scroll += this.speed * dt;

    this.steer(dt);
    if (rv.inv > 0) rv.inv -= dt;

    // ---- spawning ----
    const lvl = this.pt / DUR;
    this.spawnT -= dt * (this.speed / this.th.speed);
    if (this.spawnT <= 0) {
      this.spawn();
      const [a, b] = this.th.interval;
      this.spawnT = (a + (b - a) * lvl) * rnd(0.8, 1.2);
    }
    this.gasT -= dt;
    if (this.gasT <= 0) { this.spawnGas(); this.gasT = rnd(3, 4.5); }
    if (!this.chpDone && this.pt > this.chpAt) this.spawnChp();

    this.moveObjs(dt);
    this.collide();
    if (this.closeT > 0) { this.closeT -= dt; if (this.closeT <= 0) this.closeChain = 0; }

    if (this.time <= 0) {
      this.phase = 'over'; this.pt = 0;
      audio.sfx('ding'); gfx.flash('#fff', 0.15);
      this.pop(W / 2, 110, 'EXIT AHEAD!', PAL.good, 12, 1.6, true);
    }
  },

  changeLane(d) {
    const rv = this.rv;
    const l = clamp(rv.lane + d, 0, 3);
    if (l !== rv.lane) { rv.lane = l; audio.sfx('select'); }
    else { audio.sfx('thud'); rv.vx += d * 40; } // bump the rumble strip
  },

  steer(dt) {
    const rv = this.rv;
    const tx = LANES[rv.lane];
    if (this.th.slick) {
      // icy: soft spring, little damping -> slides & overshoots
      const k = 18, c = 4.2;
      rv.vx += ((tx - rv.x) * k - rv.vx * c + rv.drift) * dt;
      if (Math.random() < dt * 0.6) rv.drift = rnd(-60, 60);
      rv.drift *= Math.pow(0.3, dt);
    } else {
      const k = 90, c = 2 * Math.sqrt(k) * 0.9;
      rv.vx += ((tx - rv.x) * k - rv.vx * c) * dt;
    }
    rv.x += rv.vx * dt;
    rv.x = clamp(rv.x, ROAD_X + 14, ROAD_X + 146);
    const ty = RV_Y - (this.boost - 1) * 50;
    rv.y += (ty - rv.y) * Math.min(1, dt * 4);
  },

  // lanes blocked by solid objects in a vertical window (screen y)
  blocked(y0, y1, ignore) {
    const set = new Set();
    for (const o of this.objs) {
      if (o === ignore || !o.solid || o.dead) continue;
      if (o.y + o.h / 2 > y0 && o.y - o.h / 2 < y1) { set.add(o.lane); if (o.lane2 !== undefined) set.add(o.lane2); }
    }
    return set;
  },

  spawn() {
    let kind = weighted(this.th.mix);
    const o = { kind, lane: 0, y: 0, rel: 1, solid: true, t: 0, vx: 0 };
    if (kind === 'car') { o.idx = Math.floor(Math.random() * 5); o.w = 24; o.h = 44; o.own = rnd(0.42, 0.66); }
    else if (kind === 'semi') { o.w = 32; o.h = 112; o.own = rnd(0.5, 0.6); }
    else if (kind === 'haz') { o.idx = pick(this.th.haz); o.w = 24; o.h = 24; o.own = 0; if (o.idx === 3) o.vx = pick([-1, 1]) * rnd(18, 30); }
    else if (kind === 'couch') { o.w = 28; o.h = 20; o.own = 0; }
    else if (kind === 'ice') { o.w = 30; o.h = 40; o.own = 0; o.solid = false; }
    o.y = -o.h / 2 - 10;
    // fairness: keep at least two lanes open in the window around the spawn
    const win = this.blocked(-220, 30);
    const free = [0, 1, 2, 3].filter((l) => !win.has(l));
    if (o.solid && free.length <= 2) return;
    const near = this.blocked(o.y - o.h - 40, o.y + o.h + 40);
    const opts = (o.solid ? free : [0, 1, 2, 3]).filter((l) => !near.has(l));
    if (!opts.length) return;
    o.lane = pick(opts);
    o.x = LANES[o.lane];
    this.objs.push(o);
  },

  spawnGas() {
    const near = this.blocked(-140, 60);
    const opts = [0, 1, 2, 3].filter((l) => !near.has(l));
    if (!opts.length) return;
    const lane = pick(opts);
    this.objs.push({ kind: 'gas', lane, x: LANES[lane], y: -20, w: 16, h: 16, own: 0, solid: false, t: 0, vx: 0 });
  },

  spawnChp() {
    const rv = this.rv;
    const win = this.blocked(140, H + 160);
    const opts = [0, 1, 2, 3].filter((l) => !win.has(l) && Math.abs(l - rv.lane) >= 1);
    if (!opts.length) { this.chpAt += 1; return; }
    this.chpDone = true;
    const lane = pick(opts);
    this.objs.push({ kind: 'car', idx: 5, chp: true, lane, x: LANES[lane], y: H + 40, w: 24, h: 44, own: 1.45, solid: true, t: 0, vx: 0 });
    this.pop(W / 2, 70, 'CHP coming through!', '#8ab4ff', 16, 1.6);
    audio.sfx('honk');
  },

  moveObjs(dt) {
    const sp = this.speed;
    // stop cars rear-ending each other: an upper car never closes on a lower one
    const cars = this.objs.filter((o) => o.kind === 'car' || o.kind === 'semi');
    for (const o of cars) {
      o.t += dt;
      // AI lane changes, with a blinker first
      if (!o.chp && !o.hit && o.kind === 'car' && o.sig === undefined && o.y > -20 && o.y < 120 && Math.random() < dt * (this.themeId === 'traffic' ? 0.35 : 0.15)) {
        const d = pick([-1, 1]), nl = o.lane + d;
        if (nl >= 0 && nl <= 3 && !this.blocked(o.y - 80, o.y + 80, o).has(nl)) { o.sig = d; o.sigT = 0.9; }
      }
      if (o.sig !== undefined) {
        o.sigT -= dt;
        if (o.sigT <= 0 && o.lane2 === undefined) {
          const nl = o.lane + o.sig;
          if (!this.blocked(o.y - 70, o.y + 70, o).has(nl)) o.lane2 = nl; else o.sig = undefined;
        }
        if (o.lane2 !== undefined) {
          const tx = LANES[o.lane2];
          o.x += Math.sign(tx - o.x) * Math.min(Math.abs(tx - o.x), 40 * dt);
          if (Math.abs(tx - o.x) < 0.5) { o.lane = o.lane2; o.lane2 = undefined; o.sig = undefined; }
        }
      }
    }
    const relOf = (o) => {
      const r = sp - this.th.speed * o.own;      // own = absolute speed as a fraction of cruise speed
      return o.y > this.rv.y + 20 && !o.chp ? Math.max(r, 20) : r; // traffic behind us never rear-ends us
    };
    for (const o of this.objs) {
      let rel = relOf(o);
      if ((o.kind === 'car' || o.kind === 'semi') && !o.chp) {
        for (const q of cars) {
          if (q === o || q.lane !== o.lane || q.dead) continue;
          const qrel = relOf(q);
          if (q.y > o.y) { const gap = (q.y - q.h / 2) - (o.y + o.h / 2); if (gap < 14 && rel > qrel) rel = qrel; }
          else { const gap = (o.y - o.h / 2) - (q.y + q.h / 2); if (gap < 14 && rel < qrel) rel = qrel; }
        }
      }
      o.y += rel * dt;
      if (o.dead) { o.x += o.vx * dt; o.spin = (o.spin || 0) + dt * 10; o.fade = (o.fade || 1) - dt * 1.5; }
      else if (o.vx && o.kind === 'haz') {
        o.x += o.vx * dt;
        if (o.x < ROAD_X + 18 || o.x > ROAD_X + 142) o.vx *= -1;
        o.lane = clamp(Math.round((o.x - LANES[0]) / 33), 0, 3);
      }
    }
    this.objs = this.objs.filter((o) => o.y < H + 140 && o.y > -260 && !(o.dead && o.fade <= 0));
  },

  collide() {
    const rv = this.rv;
    const rx0 = rv.x - 12, rx1 = rv.x + 12, ry0 = rv.y - 36, ry1 = rv.y + 36;
    for (const o of this.objs) {
      if (o.dead || o.taken || o.hit) continue;
      const sx = o.kind === 'haz' || o.kind === 'gas' ? 4 : 3, sy = o.kind === 'semi' ? 4 : 3;
      const ox0 = o.x - o.w / 2 + sx, ox1 = o.x + o.w / 2 - sx, oy0 = o.y - o.h / 2 + sy, oy1 = o.y + o.h / 2 - sy;
      const overlap = rx0 < ox1 && rx1 > ox0 && ry0 < oy1 && ry1 > oy0;
      if (o.kind === 'gas') {
        if (overlap) {
          o.taken = true; o.dead = true; o.fade = 0; this.gas++;
          audio.sfx('pickup'); this.pop(o.x, o.y - 18, '+GAS', PAL.good, 16, 1);
          this.burst(o.x, o.y, 10, ['#ff4a3a', '#ffd75e', '#fff'], 70);
        }
        continue;
      }
      if (o.kind === 'ice') {
        if (overlap && !o.slid) { o.slid = true; rv.vx += pick([-1, 1]) * 140; audio.sfx('splash'); this.pop(rv.x, rv.y - 50, 'ICE!', '#bfe6ff', 16, 0.9); }
        continue;
      }
      if (overlap && rv.inv <= 0) { this.hit(o); continue; }
      // near miss: object passes the RV's front without touching
      if (!o.passed && o.y - o.h / 2 > ry0 + 20) {
        o.passed = true;
        const gap = Math.max(ox0 - rx1, rx0 - ox1);
        if (gap >= 0 && gap < 9 && o.y + o.h / 2 > ry0 && rv.inv <= 0) {
          this.closeChain = this.closeT > 0 ? this.closeChain + 1 : 1;
          this.closeT = 2.5;
          const pts = 25 * this.closeChain;
          this.bonus += pts; this.close++;
          this.pop(rv.x + (o.x < rv.x ? -28 : 28), rv.y - 20, this.closeChain > 1 ? `CLOSE x${this.closeChain}!` : 'CLOSE!', PAL.hi, 8, 0.9, true);
          this.pop(rv.x + (o.x < rv.x ? -28 : 28), rv.y - 8, '+' + pts, PAL.hi, 14, 0.9);
          audio.sfx('ding');
        }
      }
    }
  },

  hit(o) {
    const rv = this.rv;
    this.hits++;
    rv.inv = 1.4;
    this.slow = 0.45;
    this.closeChain = 0; this.closeT = 0;
    o.hit = true;
    const side = o.x < rv.x ? -1 : 1;
    if (o.kind === 'haz' || o.kind === 'couch') {
      o.dead = true; o.vx = side * rnd(80, 140); o.fade = 1;
      audio.sfx(o.kind === 'haz' && o.idx === 0 ? 'thud' : 'crash');
      gfx.shake(4, 0.3);
    } else {
      // the other driver floors it and gets away from you, honking
      o.own = 1.35; o.sig = undefined; o.lane2 = undefined;
      o.x += side * 3;
      audio.sfx('crash'); audio.sfx('honk');
      gfx.shake(6, 0.4);
      this.pop(o.x, o.y - o.h / 2 - 10, 'HONK!', PAL.warn, 12, 0.9, true);
    }
    rv.vx += -side * 90;
    gfx.flash('#ff3a2a', 0.15);
    this.burst((rv.x + o.x) / 2, rv.y - 30, 16, ['#fff', '#ffd75e', '#8a8a8a', '#c83a3a'], 110);
    this.pop(rv.x, rv.y - 56, pick(['WHAM!', 'CRUNCH!', 'OOF!', 'YIKES!']), PAL.bad, 12, 1, true);
  },

  // ---------- drawing ----------
  draw() {
    this.drawScenery();
    this.drawRoad();
    const order = [...this.objs].sort((a, b) => (a.solid ? 1 : 0) - (b.solid ? 1 : 0));
    for (const o of order) this.drawObj(o);
    this.drawRV();
    for (const p of this.parts) gfx.alpha(Math.min(1, p.life / 0.35), () => gfx.rect(p.x, p.y, p.size, p.size, p.col));
    if (this.th.slick) this.drawSnow();
    for (const p of this.pops) {
      const a = Math.min(1, p.life * 2.5);
      const big = p.max - p.life < 0.1 ? -2 : 0;
      gfx.alpha(a, () => gfx.text(p.text, p.x, p.y + big, { size: p.size, head: p.head, align: 'center', color: p.col }));
    }
    if (this.phase === 'intro') this.drawIntro();
    else if (this.phase === 'results') this.drawResults();
    else this.drawHud();
  },

  drawScenery() {
    const th = this.th;
    const g = th.ground;
    gfx.rect(0, 0, ROAD_X, H, g[0]);
    gfx.rect(ROAD_X + 160, 0, W - ROAD_X - 160, H, g[0]);
    const ROW = 24;
    const off = this.scroll % ROW;
    const base = Math.floor(this.scroll / ROW);
    // texture specks
    for (let r = -1; r <= H / ROW + 1; r++) {
      const id = base - r;
      const y = r * ROW + off;
      for (let k = 0; k < 6; k++) {
        const hx = hash(id * 7.1 + k);
        const x = hx < 0.5 ? hx * 2 * (ROAD_X - 8) : ROAD_X + 168 + (hx - 0.5) * 2 * (W - ROAD_X - 176);
        gfx.rect(x, y + hash(id + k * 3.3) * ROW, 2, 1, g[1 + (k % 2)]);
      }
    }
    // big features, two columns each side
    const FR = 48;
    const foff = this.scroll % FR, fbase = Math.floor(this.scroll / FR);
    for (let r = -2; r <= H / FR + 2; r++) {
      const id = fbase - r;
      const y = r * FR + foff;
      for (const side of [0, 1]) {
        for (const col of [0, 1, 2]) {
          const hv = hash(id * 13.7 + side * 101 + col * 37);
          if (hv > 0.55) continue;
          const xBase = side === 0 ? 14 + col * 48 : ROAD_X + 174 + col * 48;
          const x = xBase + hash(id + col * 9 + side) * 20;
          this.feature(th.scenery, hv, x, y + hash(id * 3 + col) * 20, col, side);
        }
      }
    }
    // guard rails / sound walls along the shoulders
    const railCol = th.scenery === 'snow' ? '#9aa4ae' : '#a8a8a0';
    gfx.rect(ROAD_X - 6, 0, 4, H, '#5a5a58'); gfx.rect(ROAD_X - 5, 0, 2, H, railCol);
    gfx.rect(ROAD_X + 162, 0, 4, H, '#5a5a58'); gfx.rect(ROAD_X + 163, 0, 2, H, railCol);
    for (let y = (this.scroll % 32) - 32; y < H; y += 32) { gfx.rect(ROAD_X - 7, y, 6, 3, '#4a4a48'); gfx.rect(ROAD_X + 161, y, 6, 3, '#4a4a48'); }
    if (th.scenery === 'snow') {
      // snowbanks pushed off by the plows
      for (let y = (this.scroll % 16) - 16; y < H; y += 16) {
        const a = hash(Math.floor((this.scroll - y) / 16));
        gfx.rect(ROAD_X - 2, y, 3 + Math.round(a * 3), 16, '#ffffff');
        gfx.rect(ROAD_X + 159 - Math.round(a * 3), y, 3 + Math.round(a * 3), 16, '#ffffff');
      }
    }
  },

  feature(kind, hv, x, y, col, side) {
    if (kind === 'socal') {
      if (hv < 0.2) { // palm tree from above
        gfx.alpha(0.25, () => ellipse(x + 6, y + 6, 12, 5, '#000'));
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + hv * 3; gfx.rect(x + Math.cos(a) * 7 - 2, y + Math.sin(a) * 7 - 2, 5, 5, i % 2 ? '#2f7a32' : '#3e9a3c'); }
        gfx.rect(x - 2, y - 2, 4, 4, '#7a5a32');
      } else if (hv < 0.32) { // oleander bush
        ellipse(x, y, 9, 6, '#2f6a32'); gfx.rect(x - 4, y - 2, 2, 2, '#ff7eb6'); gfx.rect(x + 3, y + 1, 2, 2, '#ffffff'); gfx.rect(x, y - 4, 2, 2, '#ff7eb6');
      } else if (hv < 0.45 && col !== 2) { // flat roof with AC unit
        gfx.rect(x - 14, y - 10, 30, 22, '#8a7a6a'); gfx.rect(x - 13, y - 9, 28, 20, '#b8a890'); gfx.rect(x - 4, y - 4, 8, 6, '#d8d8d8'); gfx.rect(x - 3, y - 3, 6, 1, '#888');
      } else { ellipse(x, y, 5, 3, '#a8884e'); }
    } else if (kind === 'city') {
      if (hv < 0.25 && col !== 2) {
        const c = ['#6a6a74', '#7a6a5a', '#5a6a7a'][Math.floor(hv * 12) % 3];
        gfx.rect(x - 16, y - 12, 34, 26, '#3a3a42'); gfx.rect(x - 15, y - 11, 32, 24, c);
        gfx.rect(x - 10, y - 6, 6, 4, '#2a2a30'); gfx.rect(x + 4, y + 3, 8, 5, '#2a2a30');
      } else if (hv < 0.42) {
        gfx.alpha(0.25, () => ellipse(x + 3, y + 4, 9, 5, '#000'));
        ellipse(x, y, 9, 8, '#2e5e30'); ellipse(x - 2, y - 2, 5, 4, '#3e7a3c');
      } else { gfx.rect(x - 1, y - 1, 3, 3, '#5a5a5a'); }
    } else { // snow
      if (hv < 0.32) { // pine from above, dusted with snow
        gfx.alpha(0.2, () => ellipse(x + 4, y + 5, 11, 5, '#3a4a6a'));
        ellipse(x, y, 10, 10, '#1f4a32'); ellipse(x, y, 7, 7, '#2a5e3c'); ellipse(x, y, 4, 4, '#3a6e4a');
        gfx.rect(x - 6, y - 3, 3, 2, '#ffffff'); gfx.rect(x + 3, y - 6, 3, 2, '#ffffff'); gfx.rect(x + 1, y + 4, 3, 2, '#ffffff'); gfx.rect(x - 1, y - 1, 2, 2, '#ffffff');
      } else if (hv < 0.4) { ellipse(x, y, 6, 3, '#c8d4de'); }
      else { gfx.rect(x, y, 2, 2, '#c0ccd8'); }
    }
  },

  drawRoad() {
    const tile = assets.get('minigame/road_tile');
    const off = Math.floor(this.scroll % 64);
    for (let y = off - 64; y < H; y += 64) {
      if (tile) gfx.image(tile, ROAD_X, y);
      else {
        gfx.rect(ROAD_X, y, 160, 64, PAL.road);
        gfx.rect(ROAD_X, y, 12, 64, '#5a6a4a'); gfx.rect(ROAD_X + 148, y, 12, 64, '#5a6a4a');
        gfx.rect(ROAD_X + 13, y, 2, 64, '#f0c638'); gfx.rect(ROAD_X + 145, y, 2, 64, '#ececE4');
        for (const lx of [46, 79, 112]) { gfx.rect(ROAD_X + lx, y + 4, 2, 24, '#ececE4'); }
        for (let i = 0; i < 20; i++) gfx.rect(ROAD_X + 16 + ((i * 37) % 128), y + ((i * 23) % 64), 1, 1, '#4a4954');
      }
    }
    if (this.th.slick) {
      gfx.alpha(0.22, () => gfx.rect(ROAD_X + 14, 0, 132, H, '#ffffff'));
      // drifting snow patches on the asphalt
      const R = 18, off = this.scroll % R, base = Math.floor(this.scroll / R);
      for (let r = -1; r <= H / R + 1; r++) {
        const id = base - r, y = r * R + off;
        for (let k = 0; k < 3; k++) {
          const hx = hash(id * 5.3 + k * 17.1);
          if (hx > 0.55) continue;
          const x = ROAD_X + 18 + hash(id * 2.1 + k) * 120;
          gfx.alpha(0.3, () => ellipse(x, y + hash(id + k) * R, 4 + Math.round(hx * 8), 2, '#ffffff'));
        }
      }
    }
  },

  drawObj(o) {
    const a = o.dead ? Math.max(0, o.fade) : 1;
    if (a <= 0) return;
    const x = Math.round(o.x), y = Math.round(o.y);
    gfx.alpha(a, () => {
      if (o.kind === 'car') {
        gfx.alpha(0.28, () => gfx.rect(x - 6, y - 17, 17, 41, '#000'));
        const img = assets.get('minigame/cars');
        if (img) this.rot(o, () => gfx.frame(img, 24, 44, o.idx, 0, -12, -22));
        else this.rot(o, () => {
          const c = CAR_COLORS[o.idx];
          gfx.rect(-10, -21, 20, 42, '#111'); gfx.rect(-9, -20, 18, 40, c);
          gfx.rect(-7, -12, 14, 7, '#2a3a4a'); gfx.rect(-7, 8, 14, 5, '#2a3a4a');
          if (o.idx === 5) { gfx.rect(-9, -2, 18, 6, '#fff'); }
        });
        // blinker
        if (o.sig !== undefined && blink(this.t, 6)) {
          const bx = x + (o.sig < 0 ? -12 : 10);
          gfx.rect(bx, y - 22, 2, 3, '#ffb347'); gfx.rect(bx, y + 19, 2, 3, '#ffb347');
        }
        if (o.chp) {
          const on = blink(this.t, 8);
          gfx.rect(x - 8, y - 3, 7, 3, on ? '#ff2a2a' : '#5a1010'); gfx.rect(x + 1, y - 3, 7, 3, on ? '#10105a' : '#3a6aff');
          gfx.alpha(0.25, () => ellipse(on ? x - 5 : x + 5, y - 2, 14, 10, on ? '#ff2a2a' : '#3a6aff'));
        }
      } else if (o.kind === 'semi') {
        gfx.alpha(0.28, () => gfx.rect(x - 10, y - 50, 27, 108, '#000'));
        const img = assets.get('minigame/semi');
        if (img) gfx.image(img, x - 16, y - 56);
        else {
          gfx.rect(x - 15, y - 54, 30, 22, '#b83a2a'); gfx.rect(x - 11, y - 50, 22, 6, '#2a3a4a');
          gfx.rect(x - 15, y - 30, 30, 84, '#d8d8d0'); for (let i = 0; i < 8; i++) gfx.rect(x - 14, y - 26 + i * 10, 28, 1, '#a8a8a0');
        }
      } else if (o.kind === 'haz') {
        const img = assets.get('minigame/hazards');
        const bob = o.idx === 3 ? Math.round(Math.abs(Math.sin(this.t * 10)) * -3) : 0;
        if (o.idx === 3) gfx.alpha(0.25, () => ellipse(x, y + 8, 8, 3, '#000'));
        if (img) this.rot(o, () => gfx.frame(img, 24, 24, o.idx, 0, -12, -12 + bob));
        else this.rot(o, () => this.hazFallback(o.idx, bob));
      } else if (o.kind === 'couch') {
        this.rot(o, () => {
          gfx.alpha(0.3, () => gfx.rect(-12, -7, 28, 20, '#000'));
          gfx.rect(-14, -10, 28, 20, '#4a2a1a'); gfx.rect(-13, -9, 26, 6, '#8a5a3a');
          gfx.rect(-13, -3, 4, 12, '#8a5a3a'); gfx.rect(9, -3, 4, 12, '#8a5a3a');
          gfx.rect(-9, -2, 9, 10, '#a86e44'); gfx.rect(0, -2, 9, 10, '#9a6440'); gfx.rect(-8, -1, 7, 1, '#c88a5a');
        });
      } else if (o.kind === 'ice') {
        gfx.alpha(0.6, () => ellipse(x, y, 14, 18, '#bfe6ff'));
        gfx.alpha(0.8, () => { gfx.rect(x - 6, y - 8, 6, 1, '#ffffff'); gfx.rect(x + 2, y + 4, 5, 1, '#ffffff'); });
      } else if (o.kind === 'gas') {
        const bob = Math.round(Math.sin(this.t * 6 + o.y * 0.1) * 2);
        gfx.alpha(0.3, () => ellipse(x, y + 7, 6, 2, '#000'));
        if (blink(this.t + o.y * 0.01, 3)) gfx.alpha(0.35, () => ellipse(x, y + bob, 11, 11, '#ffd75e'));
        const img = assets.get('minigame/gas_can');
        if (img) gfx.image(img, x - 8, y - 8 + bob);
        else { gfx.rect(x - 6, y - 5 + bob, 12, 12, '#d83a2a'); gfx.rect(x - 4, y - 8 + bob, 4, 3, '#222'); gfx.rect(x - 4, y - 2 + bob, 8, 1, '#ffd75e'); }
      }
    });
  },

  hazFallback(idx, bob) {
    if (idx === 0) { ellipse(0, 0, 9, 6, '#1e1e24'); ellipse(0, 0, 6, 4, '#2a2a30'); }
    else if (idx === 1) { gfx.rect(-7, 4, 14, 4, '#e06020'); gfx.rect(-5, -6, 10, 10, '#ff7a2a'); gfx.rect(-5, -2, 10, 2, '#fff'); }
    else if (idx === 2) { gfx.rect(-10, -8, 20, 16, '#e8e4dc'); gfx.rect(-9, -4, 18, 1, '#b8b4ac'); gfx.rect(-9, 2, 18, 1, '#b8b4ac'); }
    else if (idx === 3) { ellipse(0, bob, 8, 8, '#a8844e'); ellipse(0, bob, 5, 5, '#c8a46a'); }
    else if (idx === 4) { gfx.rect(-8, -10, 2, 20, '#c8c8c8'); gfx.rect(6, -10, 2, 20, '#c8c8c8'); for (let i = -8; i <= 8; i += 4) gfx.rect(-6, i, 12, 1, '#a8a8a8'); }
    else { gfx.rect(-9, -2, 6, 5, '#222'); gfx.rect(-3, 0, 8, 4, '#2a2a2a'); gfx.rect(4, -3, 5, 5, '#1a1a1a'); }
  },

  rot(o, fn) {
    const c = gfx.ctx;
    c.save();
    c.translate(Math.round(o.x), Math.round(o.y));
    if (o.spin) c.rotate(o.spin * Math.sign(o.vx || 1));
    fn();
    c.restore();
  },

  drawRV() {
    const rv = this.rv;
    if (rv.inv > 0 && blink(this.t, 14)) return;
    const c = gfx.ctx;
    const x = Math.round(rv.x), y = Math.round(rv.y);
    gfx.alpha(0.28, () => gfx.rect(x - 10, y - 35, 27, 77, '#000'));
    const roll = clamp(rv.vx * 0.0022, -0.12, 0.12);
    c.save();
    c.translate(x, y);
    c.rotate(roll);
    const img = assets.get('sprites/rv_top');
    if (img) gfx.image(img, -16, -40);
    else {
      gfx.rect(-14, -39, 28, 78, '#6a5a48'); gfx.rect(-13, -38, 26, 76, '#ece4d0');
      gfx.rect(-11, -36, 22, 8, '#2a3a4a'); gfx.rect(-13, -10, 26, 3, '#8a5a3a'); gfx.rect(-13, 4, 26, 3, '#3a6a8a');
      gfx.rect(-6, -20, 12, 8, '#d8d0bc'); gfx.rect(-5, 14, 10, 8, '#d8d0bc');
    }
    // brake lights when slowing
    if (this.boost < 0.9 || this.slow < 0.8) { gfx.rect(-13, 37, 4, 2, '#ff3a2a'); gfx.rect(9, 37, 4, 2, '#ff3a2a'); }
    c.restore();
    // exhaust puffs at speed
    if (this.phase === 'play' && Math.random() < 0.25) this.parts.push({ x: x + 8, y: y + 40, vx: rnd(-8, 8), vy: 20, life: 0.4, max: 0.4, col: this.th.slick ? '#e8eef4' : '#8a8a8a', size: 2 });
  },

  drawSnow() {
    for (const f of this.flakes) gfx.rect(f.x, f.y, f.z, f.z, '#ffffff');
    gfx.alpha(0.12, () => { gfx.rect(0, 0, W, 10, '#fff'); gfx.rect(0, H - 10, W, 10, '#fff'); });
  },

  drawHud() {
    // left dash: miles + speed
    gfx.panel(4, 4, 140, 64, { shadow: false });
    const miles = this.scroll / PX_PER_MILE;
    gfx.text('MILES', 12, 11, { size: 8, head: true, color: PAL.dim });
    gfx.text(miles.toFixed(1), 136, 8, { size: 20, align: 'right', color: PAL.hi });
    const mph = Math.round(this.speed / this.th.speed * 62);
    gfx.text('MPH', 12, 32, { size: 8, head: true, color: PAL.dim });
    gfx.text(String(mph), 136, 29, { size: 20, align: 'right', color: mph > 70 ? PAL.warn : PAL.text });
    gfx.text('SCORE ' + this.score(), 12, 50, { size: 14, color: PAL.teal });
    // right dash: time, gas, hits
    gfx.panel(W - 144, 4, 140, 64, { shadow: false });
    const tw = 120, tx = W - 134;
    gfx.rect(tx - 1, 11, tw + 2, 8, '#000');
    const f = this.time / DUR;
    gfx.rect(tx, 12, Math.round(tw * f), 6, f > 0.25 ? PAL.good : blink(this.t, 4) ? PAL.bad : PAL.warn);
    gfx.text(Math.ceil(this.time) + 's', W - 12, 20, { size: 14, align: 'right' });
    const gi = assets.get('minigame/gas_can');
    if (gi) gfx.image(gi, tx, 24); else gfx.rect(tx + 2, 26, 12, 12, '#d83a2a');
    gfx.text('x' + this.gas, tx + 18, 22, { size: 16, color: PAL.good });
    gfx.text('DINGS', tx, 46, { size: 8, head: true, color: PAL.dim });
    gfx.text(String(this.hits), tx + 52, 42, { size: 16, color: this.hits ? PAL.bad : PAL.good });
    // controls reminder at bottom of the bands
    const touch = input.lastPointerType === 'touch';
    gfx.text(touch ? 'tap a quarter of the screen' : '← → change lane', 80, H - 30, { size: 14, align: 'center', color: '#00000088', shadow: false });
    gfx.text(touch ? 'top=faster  bottom=slower' : '↑ ↓ speed', W - 80, H - 30, { size: 14, align: 'center', color: '#00000088', shadow: false });
  },

  drawIntro() {
    gfx.alpha(0.55, () => gfx.rect(0, 0, W, H, '#000'));
    gfx.panel(60, 30, 360, 240);
    gfx.text('FREEWAY FRENZY', W / 2, 44, { size: 12, head: true, align: 'center', color: PAL.hi });
    gfx.text(this.th.name, W / 2, 62, { size: 8, head: true, align: 'center', color: PAL.warn });
    gfx.text(this.th.blurb, W / 2, 76, { size: 16, align: 'center', color: PAL.dim });
    const touch = input.lastPointerType === 'touch';
    const lines = touch
      ? ['Tap / drag on a quarter of the screen', 'to steer into that lane.', 'Hold near the top to speed up.']
      : ['← → / A D : change lanes', '↑ ↓ / W S : faster / slower'];
    lines.forEach((l, i) => gfx.text(l, W / 2, 100 + i * 18, { size: 16, align: 'center' }));
    // legend
    const ly = 162;
    const haz = assets.get('minigame/hazards'), gas = assets.get('minigame/gas_can');
    if (haz) gfx.frame(haz, 24, 24, 1, 0, 92, ly); else gfx.rect(96, ly + 2, 14, 16, '#ff7a2a');
    if (haz) gfx.frame(haz, 24, 24, 2, 0, 116, ly); else gfx.rect(118, ly + 2, 20, 16, '#e8e4dc');
    gfx.text('Dodge traffic & junk', 146, ly + 2, { size: 16, color: PAL.bad });
    if (gas) gfx.image(gas, 290, ly + 3); else gfx.rect(290, ly + 4, 14, 14, '#d83a2a');
    gfx.text('Grab gas', 310, ly + 2, { size: 16, color: PAL.good });
    gfx.text('Squeak past cars for CLOSE CALL bonus!', W / 2, 194, { size: 16, align: 'center', color: PAL.hi });
    gfx.text(`Survive ${DUR} seconds to the next exit.`, W / 2, 212, { size: 16, align: 'center', color: PAL.dim });
    if (blink(this.t)) gfx.text(touch ? 'Tap to start' : 'Press any key / tap to start', W / 2, 238, { size: 16, align: 'center', color: PAL.hi });
  },

  drawResults() {
    gfx.alpha(0.6, () => gfx.rect(0, 0, W, H, '#000'));
    gfx.panel(100, 36, 280, 228, { body: '#2a2038' });
    gfx.text('MADE IT TO THE EXIT', W / 2, 50, { size: 10, head: true, align: 'center', color: PAL.hi });
    const rows = [
      ['Miles driven', (this.scroll / PX_PER_MILE).toFixed(1), PAL.text],
      ['Gas cans', String(this.gas), PAL.good],
      ['Close calls', String(this.close), PAL.hi],
      ['Dings & dents', String(this.hits), this.hits ? PAL.bad : PAL.good],
    ];
    rows.forEach(([k, v, c], i) => {
      const y = 76 + i * 22;
      if (this.pt > 0.15 * i) {
        gfx.text(k, 126, y, { size: 16, color: PAL.dim });
        gfx.text(v, 354, y, { size: 16, align: 'right', color: c });
      }
    });
    gfx.rect(126, 166, 228, 1, PAL.edge);
    gfx.text('SCORE', 126, 176, { size: 10, head: true, color: PAL.teal });
    const sc = Math.round(this.score() * Math.min(1, this.pt / 0.8));
    gfx.text(String(sc), 354, 170, { size: 24, align: 'right', color: PAL.teal });
    const h = this.hits;
    const verdict = h === 0 ? 'Not a scratch. Road warrior!' : h <= 2 ? 'A few new dents. She’ll live.' : h <= 4 ? 'The RV has seen better days.' : 'Insurance is going to call...';
    gfx.text(verdict, W / 2, 204, { size: 16, align: 'center', color: h <= 2 ? PAL.good : PAL.bad });
    if (this.pt > 0.8 && blink(this.pt)) {
      const touch = input.lastPointerType === 'touch';
      gfx.text(touch ? 'Tap to continue' : 'Press any key to continue', W / 2, 236, { size: 14, align: 'center', color: PAL.dim });
    }
  },
}));
