// Minigame: "Cat Wrangle" — catch the escaped cat at a rest stop before dark.
// params.cat: 'muskrat' | 'pookah', params.treats: number available.
// outcome = { caught, time, treatsUsed }
import { gfx, PAL, W, H } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { game } from '../game/game.js';

const DUR = 40;
const SPEED = 88;
const CATCH_R = 24;
const BOUNDS = { x0: 8, x1: 448, y0: 18, y1: 294 };
// Rest-stop layout (matches reststop_bg.png)
const RV = { x: 52, y: 118, w: 104, h: 58 };
const BUILDING = { x: 224, y: 0, w: 94, h: 84 };
const CANS = [{ x: 209, y: 64, w: 14, h: 22 }, { x: 320, y: 64, w: 14, h: 22 }];
const TABLES = [{ x: 398, y: 70, w: 39, h: 29 }, { x: 329, y: 133, w: 39, h: 28 }, { x: 277, y: 220, w: 39, h: 29 }];
const TRUNKS = [{ x: 226, y: 172, w: 11, h: 14 }, { x: 204, y: 288, w: 12, h: 10 }, { x: 360, y: 42, w: 12, h: 14 }];
const SIGN = { x: 384, y: 190, w: 20, h: 18 };
const SOLID_ALL = [RV, BUILDING, ...CANS, ...TRUNKS, SIGN];      // blocks cat too
const SOLID_PLAYER = [...SOLID_ALL, ...TABLES];                   // cat can slip under tables
const HIDES = [
  ...TABLES.map((t) => ({ x: t.x + t.w / 2, y: t.y + t.h / 2 + 6, kind: 'table', r: t })),
  ...CANS.map((c) => ({ x: c.x + c.w / 2, y: c.y + 12, kind: 'can', r: c })),
];
const PATH = [[180, 100], [250, 99], [320, 100], [362, 106], [398, 124], [422, 155], [432, 192], [424, 234], [400, 262], [360, 280], [300, 284], [240, 284], [182, 283], [174, 230], [174, 160]];
const LEASH = { x: 158, y: 172, r: 22 };
const CATS = {
  muskrat: { name: 'Muskrat', fur: '#9a6a3a', dark: '#5a3a1a', belly: '#c89a6a' },
  pookah: { name: 'Pookah', fur: '#1a1a22', dark: '#0a0a10', belly: '#f4f4f0' },
};
const CAITY = { skin: '#f0c4a0', hair: '#2a1c1c', shirt: '#2a2230', pants: '#7a2a32' };
const VISITOR_LOOKS = [
  { skin: '#e8b48c', hair: '#c8a050', shirt: '#3a7ac8', pants: '#3a3a4a' },
  { skin: '#8a5a3a', hair: '#1a1a1a', shirt: '#c83a5a', pants: '#2a3a5a' },
  { skin: '#f0c8a8', hair: '#8a8a8a', shirt: '#e8d84a', pants: '#5a4a3a' },
];
const TREAT_BTN = { x: 396, y: 260, w: 78, h: 34 };

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function blink(t, rate = 2) { return Math.floor(t * rate) % 2 === 0; }
function ellipse(cx, cy, rx, ry, col) {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.01))));
    gfx.rect(cx - w, cy + dy, w * 2 + 1, 1, col);
  }
}
function shadow(cx, cy, rx, ry = 2) { gfx.alpha(0.3, () => ellipse(cx, cy, rx, ry, '#000')); }
function hitRect(x, y, hw, hh, list) {
  for (const s of list) if (x - hw < s.x + s.w && x + hw > s.x && y - hh < s.y + s.h && y > s.y) return true;
  return false;
}
function inBounds(x, y) { return x >= BOUNDS.x0 && x <= BOUNDS.x1 && y >= BOUNDS.y0 && y <= BOUNDS.y1; }
function dirOf(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); }

function drawPerson(x, y, dir, col, look, hat) {
  x = Math.round(x); y = Math.round(y);
  const st = col === 0 ? -1 : col === 2 ? 1 : 0;
  gfx.rect(x - 4, y - 9 + (st < 0 ? -1 : 0), 3, 9, look.pants);
  gfx.rect(x + 1, y - 9 + (st > 0 ? -1 : 0), 3, 9, look.pants);
  gfx.rect(x - 5, y - 1, 4, 2, '#222'); gfx.rect(x + 1, y - 1, 4, 2, '#222');
  gfx.rect(x - 6, y - 20, 12, 12, look.shirt);
  gfx.rect(x - 8, y - 19 + st, 2, 9, look.skin); gfx.rect(x + 6, y - 19 - st, 2, 9, look.skin);
  gfx.rect(x - 5, y - 30, 10, 10, look.skin);
  gfx.rect(x - 5, y - 31, 10, 4, look.hair);
  if (dir === 3) gfx.rect(x - 5, y - 30, 10, 8, look.hair);
  else if (dir === 1) gfx.rect(x + 1, y - 30, 4, 6, look.hair);
  else if (dir === 2) gfx.rect(x - 5, y - 30, 4, 6, look.hair);
  else { gfx.rect(x - 3, y - 26, 1, 2, '#111'); gfx.rect(x + 2, y - 26, 1, 2, '#111'); }
  if (hat) { gfx.rect(x - 6, y - 33, 12, 4, hat); gfx.rect(dir === 1 ? x - 9 : x - 3, y - 30, 12, 2, hat); }
}
function drawCatFallback(x, y, dir, col, c, sit) {
  x = Math.round(x); y = Math.round(y);
  const b = col === 1 ? 0 : 1;
  if (dir === 1 || dir === 2) {
    const s = dir === 2 ? 1 : -1;
    gfx.rect(x - 7, y - 9 - b, 14, 6, c.fur);
    gfx.rect(x + s * 6 - 3, y - 14 - b, 7, 7, c.fur);
    gfx.rect(x + s * 6 - 3, y - 16 - b, 2, 2, c.fur); gfx.rect(x + s * 6 + 2, y - 16 - b, 2, 2, c.fur);
    gfx.rect(x + s * 8, y - 12 - b, 1, 1, '#e0e040');
    gfx.rect(x - s * 9 - 1, y - 13 - (col === 2 ? 1 : 0), 2, 6, c.fur);
    gfx.rect(x - 6, y - 3, 2, 3, c.dark); gfx.rect(x + 4, y - 3, 2, 3, c.dark);
    gfx.rect(x - 4, y - 5 - b, 8, 2, c.belly);
  } else {
    const h = sit ? 2 : 0;
    gfx.rect(x - 5, y - 11 + h, 10, 10 - h, c.fur);
    gfx.rect(x - 5, y - 18 + h, 10, 8, c.fur);
    gfx.rect(x - 5, y - 20 + h, 3, 2, c.fur); gfx.rect(x + 2, y - 20 + h, 3, 2, c.fur);
    if (dir === 0) { gfx.rect(x - 3, y - 15 + h, 2, 1, '#e0e040'); gfx.rect(x + 1, y - 15 + h, 2, 1, '#e0e040'); gfx.rect(x - 2, y - 9 + h, 4, 6, c.belly); }
    gfx.rect(x + 5, y - 5, 4, 2, c.fur);
  }
}
function drawDogFallback(x, y, dir, col) {
  x = Math.round(x); y = Math.round(y);
  const b = col === 1 ? 0 : 1, s = dir === 1 ? -1 : 1;
  gfx.rect(x - 9, y - 12 - b, 18, 8, '#f4f0e8');
  gfx.rect(x + s * 8 - 3, y - 17 - b, 8, 8, '#f4f0e8');
  gfx.rect(x + s * 9, y - 15 - b, 1, 1, '#111');
  gfx.rect(x + s * 12 - (s > 0 ? 0 : 2), y - 13 - b, 3, 3, '#e8a0a0');
  gfx.rect(x - 8, y - 4, 2, 4, '#f4f0e8'); gfx.rect(x + 6, y - 4, 2, 4, '#f4f0e8');
}
function bubble(x, y, text, col = PAL.ink) {
  const w = Math.max(10, gfx.measure(text, 14) + 6);
  x = Math.round(x - w / 2); y = Math.round(y);
  gfx.rect(x, y, w, 13, '#fff'); gfx.rect(x + 1, y - 1, w - 2, 15, '#fff');
  gfx.rect(x + w / 2 - 1, y + 13, 3, 2, '#fff');
  gfx.text(text, x + w / 2, y - 1, { size: 14, align: 'center', color: col, shadow: false });
}

game.register('catchase', () => ({
  enter(params) {
    this.params = params || {};
    this.catId = CATS[this.params.cat] ? this.params.cat : 'muskrat';
    this.cc = CATS[this.catId];
    this.treats = Math.max(0, Math.floor(Number(this.params.treats ?? 3) || 0));
    this.treatsUsed = 0;
    this.phase = 'intro';
    this.t = 0; this.pt = 0; this.time = DUR;
    this.finished = false; this.caught = false; this.catchTime = DUR;
    this.parts = []; this.pops = [];
    this.p = { x: 176, y: 214, dir: 2, anim: 0, moving: false, swipe: 0 };
    this.walkTo = null;
    this.cat = { x: 300, y: 190, dir: 1, anim: 0, moving: false, state: 'idle', st: 2.5, alert: 0, energy: 1, tx: 0, ty: 0, speed: 0, emote: null, emoteT: 0, hide: null };
    this.treatsOnGround = [];
    this.bela = { x: 172, y: 188, dir: 2, anim: 0, barkT: rnd(4, 6), barking: 0 };
    this.butterfly = null; this.flyT = rnd(6, 10);
    this.visitors = VISITOR_LOOKS.map((look, i) => ({ look, seg: (i * 5) % PATH.length, f: 0, rev: i === 1, x: PATH[(i * 5) % PATH.length][0], y: PATH[(i * 5) % PATH.length][1], dir: 0, anim: 0, hat: i === 2 ? '#3a6a3a' : null, pause: 0 }));
    this.banner = null;
    audio.playMusic('minigame');
  },

  say(text, col = PAL.hi, t = 2) { this.banner = { text, col, t }; },
  pop(x, y, text, col, size = 16, life = 1, head = false) { this.pops.push({ x, y, text, col, size, life, max: life, head }); },
  burst(x, y, n, cols, sp = 60, g = 100) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(sp * 0.3, sp);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * 0.3, g, life: rnd(0.4, 0.9), max: 0.9, col: cols[i % cols.length], size: Math.random() < 0.3 ? 3 : 2 });
    }
  },
  emote(text, t = 1) { this.cat.emote = text; this.cat.emoteT = t; },

  update(dt) {
    this.t += dt;
    for (const p of this.parts) { p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const p of this.pops) { p.life -= dt; p.y -= 18 * dt; }
    this.pops = this.pops.filter((p) => p.life > 0);
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    if (this.phase === 'intro') {
      if (this.t > 0.4 && input.anyKey()) {
        this.phase = 'play'; this.pt = 0; audio.sfx('confirm'); input.consumeClicks(); input.consumeKeys();
        this.say(`Catch ${this.cc.name} before dark!`, PAL.hi);
        this.emote('?', 1.2);
      }
      return;
    }
    if (this.phase === 'play') { this.updatePlay(dt); return; }
    if (this.phase === 'over') {
      this.pt += dt;
      this.updateVisitors(dt);
      if (this.caught && Math.random() < dt * 8) this.parts.push({ x: this.p.x + rnd(-10, 10), y: this.p.y - 30, vx: rnd(-10, 10), vy: -30, life: 0.8, max: 0.8, col: PAL.pink, size: 2, heart: true });
      if (this.pt > 1.6) { this.phase = 'results'; this.pt = 0; }
      return;
    }
    if (this.phase === 'results') {
      this.pt += dt;
      if (this.pt > 0.8 && input.anyKey() && !this.finished) {
        this.finished = true;
        audio.sfx('confirm');
        const outcome = { caught: this.caught, time: Math.round(this.catchTime * 10) / 10, treatsUsed: this.treatsUsed };
        if (this.params.onFinish) this.params.onFinish(outcome);
      }
    }
  },

  updatePlay(dt) {
    this.pt += dt;
    this.time = Math.max(0, DUR - this.pt);
    const p = this.p, cat = this.cat;

    // ---- input ----
    let mx = 0, my = 0;
    if (input.held('ArrowLeft') || input.held('a')) mx -= 1;
    if (input.held('ArrowRight') || input.held('d')) mx += 1;
    if (input.held('ArrowUp') || input.held('w')) my -= 1;
    if (input.held('ArrowDown') || input.held('s')) my += 1;
    if (mx || my) this.walkTo = null;
    let tryCatch = false, dropTreat = false;
    for (const c of input.clicks) {
      if (c.x >= TREAT_BTN.x && c.x < TREAT_BTN.x + TREAT_BTN.w && c.y >= TREAT_BTN.y && c.y < TREAT_BTN.y + TREAT_BTN.h) { dropTreat = true; continue; }
      if (dist(c.x, c.y, cat.x, cat.y - 8) < 18) { tryCatch = dist(p.x, p.y, cat.x, cat.y) < CATCH_R + 4; if (!tryCatch) this.walkTo = { x: cat.x, y: cat.y, chase: true }; }
      else this.walkTo = { x: c.x, y: c.y + 6 };
    }
    if (input.pointerHeld && input.mouse.x >= 0 && !input.hover(TREAT_BTN.x, TREAT_BTN.y, TREAT_BTN.w, TREAT_BTN.h)) {
      this.walkTo = { x: input.mouse.x, y: input.mouse.y + 6 };
    }
    if (this.walkTo && this.walkTo.chase) { this.walkTo.x = cat.x; this.walkTo.y = cat.y; }
    if (!mx && !my && this.walkTo) {
      const dx = this.walkTo.x - p.x, dy = this.walkTo.y - p.y, d = Math.hypot(dx, dy);
      if (d > 3) { mx = dx / d; my = dy / d; } else if (!input.pointerHeld) this.walkTo = null;
    }
    if (input.any(' ', 'Enter')) {
      if (dist(p.x, p.y, cat.x, cat.y) < CATCH_R + 6 || this.treats <= 0) tryCatch = true;
      else dropTreat = true;
    }
    if (input.any('t', 'e')) dropTreat = true;

    // ---- player movement ----
    if (p.swipe > 0) p.swipe -= dt;
    const len = Math.hypot(mx, my);
    p.moving = len > 0.1 && p.swipe <= 0.15;
    if (p.moving) {
      mx /= Math.max(1, len); my /= Math.max(1, len);
      this.move(p, mx * SPEED * dt, my * SPEED * dt, SOLID_PLAYER, 6, 4, true);
      p.dir = dirOf(mx, my);
      p.anim += dt;
      if (Math.floor(p.anim * 6) !== Math.floor((p.anim - dt) * 6) && Math.floor(p.anim * 6) % 2 === 0) audio.sfx('step');
    }
    // visitors push you aside
    for (const v of this.visitors) {
      const d = dist(p.x, p.y, v.x, v.y);
      if (d < 12 && d > 0.01) { this.move(p, ((p.x - v.x) / d) * (12 - d), ((p.y - v.y) / d) * (12 - d), SOLID_PLAYER, 6, 4, true); if (!v.bumped) { v.bumped = 1.5; this.pop(v.x, v.y - 40, pick(['excuse me!', 'whoa!', 'oof', 'hey!']), PAL.dim, 14, 0.9); } }
    }

    if (dropTreat) this.dropTreat();
    if (tryCatch) this.tryCatch();

    this.updateCat(dt);
    this.updateBela(dt);
    this.updateVisitors(dt);
    this.updateButterfly(dt);

    if (this.time <= 0 && !this.caught) {
      this.phase = 'over'; this.pt = 0;
      this.catchTime = DUR;
      audio.sfx('bad');
      this.say(`${this.cc.name} is still out there...`, PAL.bad, 3);
    }
  },

  move(e, dx, dy, solids, hw, hh, isPlayer) {
    let blocked = false;
    const nx = e.x + dx, ny = e.y + dy;
    if (inBounds(nx, e.y) && !hitRect(nx, e.y, hw, hh, solids)) e.x = nx; else blocked = true;
    if (inBounds(e.x, ny) && !hitRect(e.x, ny, hw, hh, solids)) e.y = ny; else blocked = true;
    return blocked;
  },

  dropTreat() {
    if (this.treats <= 0) { this.pop(this.p.x, this.p.y - 42, 'No treats left!', PAL.bad, 14, 1); audio.sfx('back'); return; }
    const p = this.p;
    const off = [[0, 26], [-26, 0], [26, 0], [0, -22]][p.dir];
    let tx = clamp(p.x + off[0], BOUNDS.x0 + 4, BOUNDS.x1 - 4), ty = clamp(p.y + off[1], BOUNDS.y0 + 4, BOUNDS.y1 - 2);
    if (hitRect(tx, ty, 2, 2, SOLID_ALL)) { tx = p.x; ty = p.y + 2; }
    this.treats--; this.treatsUsed++;
    this.treatsOnGround.push({ x: tx, y: ty, t: 0, sx: p.x, sy: p.y - 16 });
    audio.sfx('pop');
    this.pop(p.x, p.y - 42, 'psst psst!', PAL.pink, 14, 1);
    // cat notices if it isn't already busy eating
    const cat = this.cat;
    if (cat.state !== 'eat' && dist(cat.x, cat.y, tx, ty) < 260) {
      cat.lureDelay = cat.state === 'flee' ? 0.6 : 0.3;
      cat.state = 'lured'; cat.st = 7; cat.treat = this.treatsOnGround[this.treatsOnGround.length - 1];
      this.emote('!?', 0.8);
    }
  },

  tryCatch() {
    const p = this.p, cat = this.cat;
    p.swipe = 0.3;
    const d = dist(p.x, p.y, cat.x, cat.y);
    if (d < CATCH_R) {
      this.caught = true; this.catchTime = this.pt;
      this.phase = 'over'; this.pt = 0;
      audio.sfx('meow'); audio.sfx('good');
      gfx.shake(2, 0.2); gfx.flash('#fff', 0.12);
      this.burst(cat.x, cat.y - 10, 20, [PAL.pink, PAL.hi, '#fff'], 90, 60);
      this.pop(p.x, p.y - 50, 'GOTCHA!', PAL.good, 16, 1.6, true);
      this.say(`${this.cc.name} is safe in Caity's arms!`, PAL.good, 3);
      return;
    }
    audio.sfx('back');
    this.pop(p.x, p.y - 42, pick(['swish!', 'missed!', 'so close!']), PAL.dim, 14, 0.8);
    if (d < 60) this.startle(true);
  },

  // ---- cat brain ----
  alertRadius() {
    const s = this.cat.state;
    if (s === 'eat') return 0;
    if (s === 'lured') return 24;
    if (s === 'hunt') return 30;
    if (s === 'idle') return this.cat.groom ? 46 : 60;
    if (s === 'hide') return 50;
    if (s === 'startle' || s === 'flee') return 0;
    if (this.cat.edgy > 0) return 80;
    return 66;
  },
  startle(instant = false) {
    const cat = this.cat;
    if (cat.state === 'startle' || cat.state === 'flee') return;
    let delay = cat.state === 'hide' ? 0.3 : cat.state === 'idle' ? 0.26 : 0.2;
    if (cat.edgy > 0) delay = 0.06; // still jumpy from the last chase
    cat.state = 'startle'; cat.st = instant ? 0.05 : delay;
    cat.hide = null;
    this.emote('!', 0.6);
    if (Math.random() < 0.5) audio.sfx('meow');
  },
  flee(fromX, fromY, boost = 1) {
    const cat = this.cat;
    // pick a destination away from the threat; prefer hiding spots
    const cands = HIDES.map((h) => ({ x: h.x, y: h.y, hide: h }));
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, r = rnd(70, 160); cands.push({ x: cat.x + Math.cos(a) * r, y: cat.y + Math.sin(a) * r }); }
    let best = null, bs = -1e9;
    const ax = cat.x - fromX, ay = cat.y - fromY, al = Math.hypot(ax, ay) || 1;
    for (const c of cands) {
      if (!inBounds(c.x, c.y) || hitRect(c.x, c.y, 5, 3, SOLID_ALL)) continue;
      const dx = c.x - cat.x, dy = c.y - cat.y, dl = Math.hypot(dx, dy) || 1;
      const away = (dx * ax + dy * ay) / (dl * al); // 1 = directly away
      if (away < (al < 60 ? 0.35 : -0.45)) continue;
      // would the path pass right by the threat?
      const t = clamp(((fromX - cat.x) * dx + (fromY - cat.y) * dy) / (dl * dl), 0, 1);
      const pass = dist(cat.x + dx * t, cat.y + dy * t, fromX, fromY);
      if (pass < (al < 60 ? 40 : 26)) continue;
      let clear = true;
      for (let k = 8; k < dl; k += 6) { if (hitRect(cat.x + (dx / dl) * k, cat.y + (dy / dl) * k, 5, 3, SOLID_ALL)) { clear = false; break; } }
      if (!clear) continue;
      const edge = Math.min(c.x - BOUNDS.x0, BOUNDS.x1 - c.x, c.y - BOUNDS.y0, BOUNDS.y1 - c.y);
      const s = dist(c.x, c.y, fromX, fromY) * 0.6 + away * 40 - Math.abs(dl - 110) * 0.3 + (c.hide ? 25 : 0) - Math.max(0, 40 - edge) * 1.5 + Math.random() * 20;
      if (s > bs) { bs = s; best = c; }
    }
    if (!best || dist(best.x, best.y, cat.x, cat.y) < 20) {
      // cornered: bolt along the wall, whichever side has more room
      let bd = -1;
      for (const sgn of [1, -1]) {
        for (const r of [100, 70, 45]) {
          const x = clamp(cat.x + (-ay / al) * sgn * r, BOUNDS.x0 + 6, BOUNDS.x1 - 6), y = clamp(cat.y + (ax / al) * sgn * r, BOUNDS.y0 + 6, BOUNDS.y1 - 6);
          if (hitRect(x, y, 5, 3, SOLID_ALL)) continue;
          const sc = dist(x, y, cat.x, cat.y) + dist(x, y, fromX, fromY) * 0.5;
          if (sc > bd) { bd = sc; best = { x, y }; }
          break;
        }
      }
      if (!best) best = { x: clamp(cat.x + rnd(-80, 80), 20, 440), y: clamp(cat.y + rnd(-80, 80), 30, 290) };
      boost *= 1.15;
    }
    cat.state = 'flee'; cat.tx = best.x; cat.ty = best.y; cat.goHide = best.hide || null;
    cat.speed = (118 + Math.random() * 12) * (0.72 + 0.28 * cat.energy) * boost;
    cat.st = 1.6;
    cat.energy = Math.max(0, cat.energy - 0.13);
    this.burst(cat.x, cat.y - 2, 5, ['#d8c8a8', '#a8987a'], 30, 0);
  },

  updateCat(dt) {
    const cat = this.cat, p = this.p;
    cat.st -= dt; cat.anim += dt;
    if (cat.emoteT > 0) cat.emoteT -= dt;
    cat.energy = Math.min(1, cat.energy + dt * 0.04);
    if (cat.edgy > 0) cat.edgy -= dt;
    const dP = dist(p.x, p.y, cat.x, cat.y);
    // react to the player
    if (dP < this.alertRadius() && cat.state !== 'startle' && cat.state !== 'flee') this.startle();

    let vx = 0, vy = 0;
    switch (cat.state) {
      case 'idle': {
        cat.moving = false;
        if (cat.st <= 0) {
          if (Math.random() < 0.6) this.wander();
          else { cat.st = rnd(1.5, 3); cat.groom = !cat.groom; }
        }
        if (cat.groom && Math.random() < dt * 0.8) this.emote(pick(['lick', 'lick lick', '*groom*']), 0.8);
        else if (!cat.groom && Math.random() < dt * 0.4) this.emote(pick(['sniff', '...', '♪']), 0.8);
        break;
      }
      case 'wander': {
        const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy);
        if (d < 3 || cat.st <= 0) { cat.state = 'idle'; cat.st = rnd(1.5, 3.2); cat.groom = Math.random() < 0.55; break; }
        vx = (dx / d) * 30; vy = (dy / d) * 30;
        break;
      }
      case 'startle': {
        cat.moving = false;
        if (cat.st <= 0) {
          const from = cat.spookFrom || p;
          cat.spookFrom = null;
          this.flee(from.x, from.y, from === p ? 1 : 1.1);
        }
        break;
      }
      case 'flee': {
        const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy);
        cat.speed = Math.max(66 + 34 * cat.energy, cat.speed - dt * 14); // fresh cats outrun you, tired ones don't
        if ((d < 4 || cat.st <= 0) && dP < 70 && !(cat.goHide && d < 8) && cat.energy > 0.15) { this.flee(p.x, p.y); break; } // still on her tail: keep running
        if (d < 4 || cat.st <= 0) {
          cat.edgy = 1.4;
          if (cat.goHide && d < 8) { cat.state = 'hide'; cat.hide = cat.goHide; cat.st = rnd(5, 8); cat.x = cat.goHide.x; cat.y = cat.goHide.y; this.emote('...', 1); }
          else { cat.state = 'idle'; cat.st = rnd(1, 2.2); cat.groom = Math.random() < 0.4; if (Math.random() < 0.5) this.emote('hmph', 0.8); }
          break;
        }
        vx = (dx / d) * cat.speed; vy = (dy / d) * cat.speed;
        // keep running away if the player is right on our tail
        break;
      }
      case 'hide': {
        cat.moving = false;
        if (Math.random() < dt * 0.4) this.emote(pick(['...', '*peek*']), 0.8);
        if (cat.st <= 0) { cat.hide = null; this.wander(); }
        break;
      }
      case 'lured': {
        cat.hide = null;
        const tr = cat.treat;
        if (!tr || !this.treatsOnGround.includes(tr)) { cat.state = 'idle'; cat.st = 1; break; }
        if (cat.lureDelay > 0) { cat.lureDelay -= dt; cat.moving = false; break; }
        const dx = tr.x - cat.x, dy = tr.y - cat.y, d = Math.hypot(dx, dy);
        // too suspicious to come close while you loom over the treat
        if (dist(p.x, p.y, tr.x, tr.y) < 44 && d < 64) {
          cat.moving = false; cat.dir = dirOf(dx, dy);
          if (!cat.wary) { cat.wary = true; this.emote('...?', 1.2); this.say('Back off so she comes to the treat!', PAL.warn, 1.8); }
          cat.st = Math.max(cat.st, 2);
          break;
        }
        cat.wary = false;
        if (d < 5) { cat.state = 'eat'; cat.st = 3.6; this.emote('nom', 0.8); audio.sfx('meow'); break; }
        vx = (dx / d) * 62; vy = (dy / d) * 62;
        break;
      }
      case 'eat': {
        cat.moving = false;
        if (Math.random() < dt * 2) { this.emote(pick(['nom', 'nom nom', 'mrrp', '♥']), 0.6); }
        if (cat.st <= 0) {
          this.treatsOnGround = this.treatsOnGround.filter((t) => t !== cat.treat);
          cat.treat = null;
          // another treat nearby? go for it
          const nx = this.treatsOnGround[0];
          if (nx) { cat.state = 'lured'; cat.treat = nx; cat.lureDelay = 0.2; }
          else { cat.state = 'idle'; cat.st = rnd(1, 2); cat.groom = true; this.emote('♥', 1); }
        }
        break;
      }
      case 'hunt': {
        const b = this.butterfly;
        if (!b || cat.st <= 0) { cat.state = 'idle'; cat.st = 1.2; break; }
        const dx = b.x - cat.x, dy = b.y + 14 - cat.y, d = Math.hypot(dx, dy);
        if (d > 6) { vx = (dx / d) * 34; vy = (dy / d) * 34; }
        if (d < 10 && Math.random() < dt * 1.5) { this.emote('pounce!', 0.6); cat.y -= 0; this.burst(cat.x, cat.y - 6, 4, ['#a8e070'], 20, 40); }
        break;
      }
    }
    if (vx || vy) {
      const hit = this.move(cat, vx * dt, vy * dt, SOLID_ALL, 5, 3, false);
      if (hit) {
        // slide around obstacles: try sideways
        const s = Math.random() < 0.5 ? 1 : -1;
        const sp = Math.hypot(vx, vy);
        const nx = (-vy / sp) * s, ny = (vx / sp) * s;
        const hit2 = this.move(cat, nx * sp * dt, ny * sp * dt, SOLID_ALL, 5, 3, false);
        if (hit2 && cat.state === 'wander') cat.st = 0;
        if (hit2 && cat.state === 'flee') cat.st = Math.min(cat.st, 0.2);
      }
      cat.dir = dirOf(vx, vy); cat.moving = true;
    }
    // visitors spook a fleeing cat into changing course
    for (const v of this.visitors) {
      if (dist(v.x, v.y, cat.x, cat.y) < 14 && cat.state === 'wander') { cat.tx = cat.x - (v.x - cat.x) * 3; cat.ty = cat.y - (v.y - cat.y) * 3; }
    }
    // butterflies distract a calm cat
    if (this.butterfly && (cat.state === 'idle' || cat.state === 'wander') && dist(this.butterfly.x, this.butterfly.y, cat.x, cat.y) < 90 && Math.random() < dt * 2) {
      cat.state = 'hunt'; cat.st = rnd(3, 5); this.emote('!!', 0.6);
    }
  },
  wander() {
    const cat = this.cat;
    for (let i = 0; i < 8; i++) {
      const tx = cat.x + rnd(-80, 80), ty = cat.y + rnd(-60, 60);
      if (inBounds(tx, ty) && !hitRect(tx, ty, 5, 3, SOLID_ALL) && dist(tx, ty, this.p.x, this.p.y) > 50) { cat.tx = tx; cat.ty = ty; break; }
    }
    cat.state = 'wander'; cat.st = 4;
  },

  updateBela(dt) {
    const b = this.bela, cat = this.cat;
    b.anim += dt;
    if (b.barking > 0) b.barking -= dt;
    // strain at the leash toward the cat
    const ang = Math.atan2(cat.y - LEASH.y, cat.x - LEASH.x);
    const tx = LEASH.x + Math.cos(ang) * LEASH.r, ty = LEASH.y + Math.max(0, Math.sin(ang)) * LEASH.r + 6;
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
    b.moving = d > 2;
    if (d > 2) { b.x += (dx / d) * 40 * dt; b.y += (dy / d) * 40 * dt; }
    b.dir = cat.x < b.x ? 1 : 2;
    b.barkT -= dt;
    if (b.barkT <= 0) {
      b.barkT = rnd(4.5, 7.5);
      b.barking = 0.5;
      audio.sfx('woof');
      this.pop(b.x, b.y - 36, 'WOOF!', PAL.warn, 8, 0.8, true);
      const dc = dist(b.x, b.y, cat.x, cat.y);
      if (dc < 160 && cat.state !== 'flee' && !(cat.state === 'eat' && Math.random() < 0.6)) {
        cat.hide = null;
        cat.state = 'startle'; cat.st = 0.15;
        this.emote('HISS', 0.7);
        audio.sfx('hiss');
        cat.spookFrom = { x: b.x, y: b.y };
      }
    }
  },

  updateVisitors(dt) {
    for (const v of this.visitors) {
      if (v.bumped) { v.bumped -= dt; if (v.bumped <= 0) v.bumped = 0; }
      if (v.pause > 0) { v.pause -= dt; v.moving = false; continue; }
      const n = PATH.length;
      const nextI = v.rev ? (v.seg - 1 + n) % n : (v.seg + 1) % n;
      const [tx, ty] = PATH[nextI];
      const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
      // step around the player
      const dp = dist(v.x, v.y, this.p.x, this.p.y);
      const sp = dp < 16 ? 8 : 24;
      if (d < 2) { v.seg = nextI; if (Math.random() < 0.12) v.pause = rnd(1, 2.5); continue; }
      v.x += (dx / d) * sp * dt; v.y += (dy / d) * sp * dt;
      v.dir = dirOf(dx, dy); v.anim += dt; v.moving = true;
    }
  },

  updateButterfly(dt) {
    this.flyT -= dt;
    if (!this.butterfly && this.flyT <= 0) {
      const left = Math.random() < 0.5;
      this.butterfly = { x: left ? 190 : 440, y: rnd(110, 260), vx: left ? 22 : -22, t: 0, col: pick(['#ffffff', '#ffd75e', '#ffa0d0']) };
      this.flyT = rnd(10, 14);
    }
    const b = this.butterfly;
    if (b) {
      b.t += dt; b.x += b.vx * dt; b.y += Math.sin(b.t * 3) * 20 * dt;
      if (b.t > 9 || b.x < 170 || b.x > 456) this.butterfly = null;
    }
  },

  // ---------- drawing ----------
  draw() {
    const bg = assets.get('minigame/reststop_bg');
    if (bg) gfx.image(bg, 0, 0); else this.drawBgFallback();
    // treats on ground
    for (const tr of this.treatsOnGround) {
      tr.t += 1 / 60;
      const k = Math.min(1, tr.t / 0.3);
      const x = tr.sx + (tr.x - tr.sx) * k, y = tr.sy + (tr.y - tr.sy) * k - Math.sin(k * Math.PI) * 14;
      if (k >= 1 && blink(this.t + tr.x, 3)) gfx.alpha(0.4, () => ellipse(tr.x, tr.y, 5, 3, '#fff3b0'));
      gfx.rect(x - 2, y - 2, 5, 3, '#8a5a2a'); gfx.rect(x - 1, y - 2, 3, 1, '#c88a4a');
    }
    // leash
    const b = this.bela;
    gfx.ctx.strokeStyle = '#c83a3a'; gfx.ctx.lineWidth = 1;
    gfx.ctx.beginPath(); gfx.ctx.moveTo(LEASH.x + 0.5, LEASH.y + 0.5); gfx.ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y - 10) + 0.5); gfx.ctx.stroke();

    const list = [];
    const cat = this.cat;
    if (!(this.caught && this.phase !== 'play')) list.push({ y: cat.y, fn: () => this.drawCat() });
    list.push({ y: this.p.y, fn: () => this.drawPlayer() });
    list.push({ y: b.y, fn: () => this.drawBela() });
    for (const v of this.visitors) list.push({ y: v.y, fn: () => { shadow(v.x, v.y - 1, 6, 2); drawPerson(v.x, v.y, v.dir, v.moving ? [0, 1, 2, 1][Math.floor(v.anim * 6) % 4] : 1, v.look, v.hat); } });
    list.sort((a, c) => a.y - c.y);
    for (const it of list) it.fn();
    // cat peeking from a hiding spot: redraw the prop over it
    if (cat.hide && cat.state === 'hide' && bg) {
      const r = cat.hide.r;
      gfx.ctx.drawImage(bg, r.x - 2, r.y - 2, r.w + 4, r.h + 4, r.x - 2, r.y - 2, r.w + 4, r.h + 4);
      if (cat.hide.kind === 'table') {
        // glowing eyes in the shadows + a tail poking out
        if (!blink(this.t * 0.7 + 0.3, 1.3) || Math.floor(this.t * 3) % 5) {
          gfx.rect(cat.x - 3, cat.y - 9, 2, 1, '#e8f060'); gfx.rect(cat.x + 2, cat.y - 9, 2, 1, '#e8f060');
        }
        const wag = Math.round(Math.sin(this.t * 4) * 2);
        gfx.rect(cat.x + 10, cat.y + 6 + wag, 6, 2, this.cc.fur); gfx.rect(cat.x + 15, cat.y + 4 + wag, 2, 3, this.cc.fur);
      }
    }
    // butterfly
    const bf = this.butterfly;
    if (bf) {
      const f = Math.floor(this.t * 10) % 2;
      gfx.rect(bf.x - (f ? 3 : 2), bf.y - 1, f ? 2 : 1, 3, bf.col); gfx.rect(bf.x + 1, bf.y - 1, f ? 2 : 1, 3, bf.col); gfx.rect(bf.x - 0, bf.y - 1, 1, 3, '#222');
    }
    // particles
    for (const p of this.parts) {
      gfx.alpha(Math.min(1, p.life / 0.4), () => {
        if (p.heart) { gfx.rect(p.x - 2, p.y, 2, 2, p.col); gfx.rect(p.x + 1, p.y, 2, 2, p.col); gfx.rect(p.x - 1, p.y + 1, 3, 2, p.col); gfx.rect(p.x, p.y + 3, 1, 1, p.col); }
        else gfx.rect(p.x, p.y, p.size, p.size, p.col);
      });
    }
    // cat emote bubble
    if (cat.emote && cat.emoteT > 0 && this.phase === 'play') {
      const yo = cat.state === 'hide' && cat.hide && cat.hide.kind === 'table' ? cat.hide.r.y - 18 : cat.y - 40;
      bubble(cat.x, yo, cat.emote, cat.emote === '!' || cat.emote === 'HISS' ? PAL.bad : PAL.ink);
    }
    // catch prompt
    if (this.phase === 'play' && dist(this.p.x, this.p.y, cat.x, cat.y) < CATCH_R) {
      const label = input.lastPointerType === 'touch' ? 'TAP CAT!' : 'SPACE!';
      const w = gfx.measure(label, 8, true) + 8;
      const yy = this.p.y - 50 + Math.round(Math.sin(this.t * 10));
      gfx.rect(this.p.x - w / 2, yy, w, 12, PAL.ink); gfx.strokeRect(this.p.x - w / 2, yy, w, 12, PAL.good);
      gfx.text(label, this.p.x, yy + 2, { size: 8, head: true, align: 'center', color: PAL.good, shadow: false });
    }
    // dusk
    const k = this.phase === 'intro' ? 0 : Math.min(1, (DUR - this.time) / DUR);
    if (k > 0.25) gfx.alpha((k - 0.25) * 0.55, () => gfx.rect(0, 0, W, H, '#1a1440'));
    if (k > 0.6) gfx.alpha((k - 0.6) * 0.35, () => gfx.rect(0, 0, W, H, '#ff7a3a'));
    for (const p of this.pops) {
      const a = Math.min(1, p.life * 2.5);
      gfx.alpha(a, () => gfx.text(p.text, p.x, p.y, { size: p.size, head: p.head, align: 'center', color: p.col }));
    }
    if (this.phase === 'intro') this.drawIntro();
    else if (this.phase === 'results') this.drawResults();
    else this.drawHud();
  },

  drawBgFallback() {
    gfx.rect(0, 0, W, H, '#4a9a40');
    gfx.rect(0, 0, 160, H, '#3e3e46');
    for (let y = 20; y < H; y += 34) gfx.rect(70, y, 90, 2, '#d8d8d0');
    gfx.rect(160, 0, 24, H, '#c8c4b4'); gfx.rect(160, 92, 280, 12, '#c8c4b4'); gfx.rect(160, 278, 280, 12, '#c8c4b4');
    gfx.rect(BUILDING.x, BUILDING.y, BUILDING.w, BUILDING.h, '#8a5a3a'); gfx.rect(BUILDING.x, 0, BUILDING.w, 50, '#8a8a92');
    gfx.rect(262, 52, 20, 30, '#1a2a22');
    for (const c of CANS) { gfx.rect(c.x, c.y, c.w, c.h, '#2a5a32'); gfx.rect(c.x + 2, c.y + 2, c.w - 4, 4, '#1a3a22'); }
    for (const t of TABLES) { gfx.rect(t.x - 4, t.y - 4, t.w + 8, t.h + 8, '#c8c4b4'); gfx.rect(t.x, t.y, t.w, 12, '#8a6a4a'); gfx.rect(t.x, t.y + 18, t.w, 5, '#8a6a4a'); }
    for (const tr of TRUNKS) { ellipse(tr.x + 5, tr.y - 20, 28, 24, '#2a6a2a'); gfx.rect(tr.x, tr.y, tr.w, tr.h, '#5a3a22'); }
    gfx.rect(RV.x, RV.y, RV.w, RV.h, '#ece4d0'); gfx.rect(RV.x + 80, RV.y + 10, 20, 20, '#2a3a4a');
    gfx.rect(SIGN.x, SIGN.y, SIGN.w, 12, '#eee'); gfx.text('PET', SIGN.x + 10, SIGN.y - 2, { size: 12, align: 'center', color: '#333', shadow: false });
  },

  drawCat() {
    const cat = this.cat;
    if (cat.state === 'hide' && cat.hide && cat.hide.kind === 'table') return; // drawn as eyes under the table
    shadow(cat.x, cat.y - 1, 6, 2);
    let col = 1, row = cat.dir, oy = 0;
    if (cat.moving) col = [0, 1, 2, 1][Math.floor(cat.anim * (cat.state === 'flee' ? 16 : 8)) % 4];
    if (cat.state === 'idle' && cat.groom) { row = 0; oy = Math.round(Math.sin(this.t * 10)) ; }
    if (cat.state === 'eat') { row = 0; oy = Math.abs(Math.round(Math.sin(this.t * 12))); }
    if (cat.state === 'startle') oy = -2;
    const key = `sprites/${this.catId}_walk`;
    if (!assets.get(key)) drawCatFallback(cat.x, cat.y + oy, row, col, this.cc, cat.state === 'idle');
    else gfx.frame(assets.get(key), 24, 24, col, row, Math.round(cat.x - 12), Math.round(cat.y - 22 + oy));
    if (cat.state === 'flee' && Math.random() < 0.3) this.parts.push({ x: cat.x + rnd(-3, 3), y: cat.y - 1, vx: 0, vy: -6, life: 0.3, max: 0.3, col: '#d8d0b8', size: 2 });
  },

  drawPlayer() {
    const p = this.p;
    shadow(p.x, p.y - 1, 7, 2);
    const col = p.moving ? [0, 1, 2, 1][Math.floor(p.anim * 8) % 4] : (p.swipe > 0 ? 0 : 1);
    const img = assets.get('sprites/caity_walk');
    if (img) gfx.frame(img, 24, 32, col, p.dir, Math.round(p.x - 12), Math.round(p.y - 32));
    else drawPerson(p.x, p.y, p.dir, col, CAITY);
    if (p.swipe > 0) {
      const [ox, oy] = [[0, 6], [-14, -10], [14, -10], [0, -26]][p.dir];
      gfx.alpha(Math.min(1, p.swipe * 4), () => { ellipse(p.x + ox, p.y + oy - 6, 7, 4, '#ffffff'); });
    }
    if (this.caught && this.phase !== 'play') {
      // holding the cat
      const key = `sprites/${this.catId}_walk`;
      if (assets.get(key)) gfx.frame(assets.get(key), 24, 24, 1, 0, Math.round(p.x - 12), Math.round(p.y - 30));
      else drawCatFallback(p.x, p.y - 8, 0, 1, this.cc, true);
    }
  },

  drawBela() {
    const b = this.bela;
    shadow(b.x, b.y - 1, 9, 2);
    const col = b.moving ? [0, 1, 2, 1][Math.floor(b.anim * 8) % 4] : 1;
    const hop = b.barking > 0 ? Math.round(Math.abs(Math.sin(b.barking * 20)) * 2) : 0;
    const img = assets.get('sprites/bela_walk');
    if (img) gfx.frame(img, 32, 32, col, b.dir, Math.round(b.x - 16), Math.round(b.y - 30 - hop));
    else drawDogFallback(b.x, b.y - hop, b.dir, col);
  },

  drawHud() {
    // time / sun
    gfx.panel(4, 4, 150, 30, { shadow: false });
    const sunK = this.time / DUR;
    const sx = 14 + (1 - sunK) * 26;
    ellipse(sx, 19, 4, 4, sunK > 0.3 ? '#ffd75e' : '#ff7a3a');
    gfx.text('Dark in ' + Math.ceil(this.time) + 's', 48, 10, { size: 16, color: this.time < 10 && blink(this.t, 3) ? PAL.bad : PAL.text });
    // cat label
    gfx.text(this.cc.name.toUpperCase(), W / 2, 8, { size: 8, head: true, align: 'center', color: PAL.hi });
    const st = { idle: this.cat.groom ? 'grooming' : 'sniffing around', wander: 'wandering', startle: 'spooked!', flee: 'RUNNING!', hide: 'hiding', lured: 'smells a treat', eat: 'eating - go!', hunt: 'chasing a bug' }[this.cat.state] || '';
    if (this.phase === 'play') gfx.text(st, W / 2, 18, { size: 14, align: 'center', color: this.cat.state === 'eat' || this.cat.state === 'idle' ? PAL.good : this.cat.state === 'flee' ? PAL.bad : PAL.dim });
    // treat button
    const bt = TREAT_BTN;
    const hov = input.hover(bt.x, bt.y, bt.w, bt.h);
    gfx.panel(bt.x, bt.y, bt.w, bt.h, { shadow: false, body: this.treats ? (hov ? PAL.panel2 : PAL.panel) : '#2a2228' });
    const ic = assets.get('icons/treats');
    if (ic) gfx.image(ic, bt.x + 8, bt.y + 9, { alpha: this.treats ? 1 : 0.4 });
    else { gfx.rect(bt.x + 10, bt.y + 13, 12, 6, '#c88a4a'); }
    gfx.text('x' + this.treats, bt.x + 28, bt.y + 6, { size: 16, color: this.treats ? PAL.hi : PAL.mute });
    const touch = input.lastPointerType === 'touch';
    gfx.text(touch ? 'TREAT' : 'T', bt.x + 28, bt.y + 20, { size: 8, head: !touch, color: PAL.dim, shadow: false });
    if (this.banner) {
      const a = Math.min(1, this.banner.t * 3);
      const by = this.phase === 'over' ? 268 : 40;
      gfx.alpha(a, () => { const w = gfx.measure(this.banner.text, 16) + 12; gfx.alpha(0.5, () => gfx.rect(W / 2 - w / 2, by, w, 17, '#000')); gfx.text(this.banner.text, W / 2, by, { size: 16, align: 'center', color: this.banner.col }); });
    }
  },

  drawIntro() {
    gfx.alpha(0.55, () => gfx.rect(0, 0, W, H, '#000'));
    gfx.panel(60, 30, 360, 240);
    gfx.text('CAT WRANGLE', W / 2, 44, { size: 12, head: true, align: 'center', color: PAL.hi });
    gfx.text(`${this.cc.name} bolted out of the RV!`, W / 2, 62, { size: 16, align: 'center', color: PAL.dim });
    const key = `sprites/${this.catId}_walk`;
    const fr = Math.floor(this.t * 6) % 3;
    if (assets.get(key)) gfx.frame(assets.get(key), 24, 24, fr, 2, 86, 74, { w: 48, h: 48 });
    else drawCatFallback(110, 116, 2, fr, this.cc, false);
    const touch = input.lastPointerType === 'touch';
    const lines = touch
      ? ['Hold & drag to walk as Caity.', 'Get close and TAP the cat to grab her.', 'TREAT button: drop a snack lure.']
      : ['ARROWS / WASD: walk as Caity.', 'Get close & press SPACE to grab her.', 'SPACE when far (or T): drop a treat.'];
    lines.forEach((l, i) => gfx.text(l, 146, 82 + i * 17, { size: 16 }));
    const tips = [
      [PAL.good, 'Sneak up while she grooms or eats.'],
      [PAL.warn, 'She hides under tables - corner her!'],
      [PAL.bad, 'Bela’s barking spooks her.'],
    ];
    tips.forEach(([c, l], i) => gfx.text('• ' + l, 84, 142 + i * 18, { size: 16, color: c }));
    gfx.text(`Treats: ${this.treats}    Sunset in ${DUR} seconds`, W / 2, 202, { size: 16, align: 'center', color: PAL.dim });
    if (blink(this.t)) gfx.text(touch ? 'Tap to start' : 'Press any key / tap to start', W / 2, 236, { size: 16, align: 'center', color: PAL.hi });
  },

  drawResults() {
    gfx.alpha(0.6, () => gfx.rect(0, 0, W, H, '#000'));
    gfx.panel(100, 46, 280, 208, { body: this.caught ? '#1f3a2e' : '#3d1f2e' });
    gfx.text(this.caught ? 'GOT HER!' : 'SHE GOT AWAY...', W / 2, 60, { size: 12, head: true, align: 'center', color: this.caught ? PAL.good : PAL.bad });
    const key = `sprites/${this.catId}_walk`;
    if (assets.get(key)) gfx.frame(assets.get(key), 24, 24, 1, 0, W / 2 - 24, 78, { w: 48, h: 48 });
    else drawCatFallback(W / 2, 124, 0, 1, this.cc, true);
    if (this.caught) {
      gfx.text(`Caught in ${this.catchTime.toFixed(1)} seconds`, W / 2, 134, { size: 16, align: 'center' });
      const v = this.catchTime < 12 ? 'Cat whisperer!' : this.catchTime < 25 ? 'Smooth moves.' : 'Just before dark. Phew!';
      gfx.text(v, W / 2, 154, { size: 16, align: 'center', color: PAL.hi });
    } else {
      gfx.text(`${this.cc.name} is hiding somewhere in the dark.`, W / 2, 134, { size: 16, align: 'center' });
      gfx.text('She’ll turn up... eventually.', W / 2, 154, { size: 16, align: 'center', color: PAL.dim });
    }
    gfx.text(`Treats used: ${this.treatsUsed}`, W / 2, 180, { size: 16, align: 'center', color: PAL.dim });
    if (this.pt > 0.8 && blink(this.pt)) {
      const touch = input.lastPointerType === 'touch';
      gfx.text(touch ? 'Tap to continue' : 'Press any key to continue', W / 2, 226, { size: 14, align: 'center', color: PAL.dim });
    }
  },
}));
