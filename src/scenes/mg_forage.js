// Minigame: "Blackberry Bramble" — top-down foraging in an Oregon meadow.
// Walk Joe or Caity between bramble bushes, pick the ripe ones, dodge wasps
// and poison oak, and keep Bela's nose out of the basket.
// outcome = { berries, stung, poisonOak }
import { gfx, PAL, W, H } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { game } from '../game/game.js';

const DUR = 35;
const SPEED = 82;
const BOUNDS = { x0: 40, x1: 440, y0: 88, y1: 292 };
const SOLIDS = [{ x: 78, y: 78, w: 70, h: 38 }]; // picnic table in forage_bg
const BUSH_SPOTS = [[112, 178], [236, 124], [346, 120], [412, 196], [112, 266], [306, 206], [386, 274], [262, 290]];
const OAK_SPOTS = [[268, 166], [352, 244], [160, 222]];
const LOOKS = {
  joe: { skin: '#e8b48c', hair: '#6b4426', shirt: '#6e6a58', pants: '#2f3f5e', glasses: true, name: 'Joe' },
  caity: { skin: '#f0c4a0', hair: '#2a1c1c', shirt: '#2a2230', pants: '#7a2a32', glasses: false, name: 'Caity' },
};

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const isKeyLeft = () => input.held('ArrowLeft') || input.held('a');
const isKeyRight = () => input.held('ArrowRight') || input.held('d');
const isKeyUp = () => input.held('ArrowUp') || input.held('w');
const isKeyDown = () => input.held('ArrowDown') || input.held('s');

// ---------- small drawing helpers ----------
function sheet(key, fw, fh, col, row, x, y, opts) {
  const img = assets.get(key);
  if (!img) return false;
  gfx.frame(img, fw, fh, col, row, x, y, opts);
  return true;
}
function ellipse(cx, cy, rx, ry, col) {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.01)));
    gfx.rect(cx - w, cy + dy, w * 2 + 1, 1, col);
  }
}
function shadow(cx, cy, rx, ry = 2) { gfx.alpha(0.3, () => ellipse(cx, cy, rx, ry, '#000')); }

// Procedural walker (used if *_walk.png is missing). x,y = feet center.
export function drawWalkerFallback(x, y, dir, col, look) {
  x = Math.round(x); y = Math.round(y);
  const step = col === 0 ? -1 : col === 2 ? 1 : 0;
  gfx.rect(x - 4, y - 9 + (step < 0 ? -1 : 0), 3, 9, look.pants);
  gfx.rect(x + 1, y - 9 + (step > 0 ? -1 : 0), 3, 9, look.pants);
  gfx.rect(x - 5, y - 1 + (step < 0 ? -1 : 0), 4, 2, '#222');
  gfx.rect(x + 1, y - 1 + (step > 0 ? -1 : 0), 4, 2, '#222');
  gfx.rect(x - 6, y - 20, 12, 12, look.shirt);
  gfx.rect(x - 8, y - 19 + step, 2, 9, look.skin);
  gfx.rect(x + 6, y - 19 - step, 2, 9, look.skin);
  gfx.rect(x - 5, y - 30, 10, 10, look.skin);
  gfx.rect(x - 5, y - 31, 10, 4, look.hair);
  if (dir === 3) gfx.rect(x - 5, y - 30, 10, 8, look.hair);
  else if (dir === 1) gfx.rect(x + 1, y - 30, 4, 6, look.hair);
  else if (dir === 2) gfx.rect(x - 5, y - 30, 4, 6, look.hair);
  if (dir === 0) {
    if (look.glasses) { gfx.rect(x - 4, y - 26, 3, 2, '#111'); gfx.rect(x + 1, y - 26, 3, 2, '#111'); gfx.rect(x - 1, y - 26, 2, 1, '#111'); }
    else { gfx.rect(x - 3, y - 26, 1, 2, '#111'); gfx.rect(x + 2, y - 26, 1, 2, '#111'); }
  }
}
function drawDogFallback(x, y, dir, col) {
  x = Math.round(x); y = Math.round(y);
  const b = col === 1 ? 0 : 1;
  if (dir === 1 || dir === 2) {
    const s = dir === 2 ? 1 : -1;
    gfx.rect(x - 9, y - 12 - b, 18, 8, '#f4f0e8');
    gfx.rect(x + s * 8 - 3, y - 17 - b, 8, 8, '#f4f0e8');
    gfx.rect(x + s * 12 - (s > 0 ? 0 : 2), y - 13 - b, 3, 3, '#e8a0a0');
    gfx.rect(x + s * 9, y - 15 - b, 1, 1, '#111');
    gfx.rect(x - 8, y - 4, 2, 4, '#f4f0e8'); gfx.rect(x + 6, y - 4, 2, 4, '#f4f0e8');
    gfx.rect(x - s * 10 - 1, y - 14 - b, 2, 4, '#f4f0e8');
  } else {
    gfx.rect(x - 6, y - 16, 12, 14, '#f4f0e8');
    gfx.rect(x - 4, y - 22 - b, 8, 8, '#f4f0e8');
    if (dir === 0) { gfx.rect(x - 2, y - 18 - b, 1, 1, '#111'); gfx.rect(x + 1, y - 18 - b, 1, 1, '#111'); gfx.rect(x - 1, y - 16 - b, 2, 2, '#e8a0a0'); }
  }
}

function fxUpdate(fx, dt) {
  for (const p of fx.parts) { p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  fx.parts = fx.parts.filter((p) => p.life > 0);
  for (const p of fx.pops) { p.life -= dt; p.y -= 18 * dt; }
  fx.pops = fx.pops.filter((p) => p.life > 0);
}
function fxDraw(fx) {
  for (const p of fx.parts) {
    gfx.alpha(Math.min(1, p.life / (p.max * 0.5)), () => gfx.rect(p.x, p.y, p.size || 2, p.size || 2, p.col));
  }
  for (const p of fx.pops) {
    const a = Math.min(1, p.life * 2.5);
    const pop = p.max - p.life < 0.12 ? 2 : 0;
    gfx.alpha(a, () => gfx.text(p.text, p.x, p.y - pop, { size: p.size || 16, head: p.head, align: 'center', color: p.col || PAL.text }));
  }
}
function burst(fx, x, y, n, cols, speed = 60, g = 120) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rnd(speed * 0.3, speed);
    fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.4, g, life: rnd(0.35, 0.8), max: 0.8, col: cols[i % cols.length], size: Math.random() < 0.3 ? 3 : 2 });
  }
}
function pop(fx, x, y, text, col, size = 16, life = 1, head = false) { const o = { x, y, text, col, size, life, max: life, head }; fx.pops.push(o); return o; }

function blink(t, rate = 2) { return Math.floor(t * rate) % 2 === 0; }
function cardHint(t, y) {
  const touch = input.lastPointerType === 'touch';
  if (blink(t)) gfx.text(touch ? 'Tap to start' : 'Press any key / tap to start', W / 2, y, { size: 16, align: 'center', color: PAL.hi });
}

// ---------- scene ----------
game.register('forage', () => ({
  enter(params) {
    this.params = params || {};
    this.who = this.params.who === 'caity' || this.params.who === 'joe' ? this.params.who : (Math.random() < 0.5 ? 'joe' : 'caity');
    this.look = LOOKS[this.who];
    this.phase = 'intro';
    this.t = 0; this.pt = 0; this.time = DUR;
    this.finished = false;
    this.fx = { parts: [], pops: [] };
    this.flies = []; // berries flying into the basket
    this.p = { x: 240, y: 210, dir: 0, anim: 0, moving: false, flinch: 0, inv: 0, itch: 0 };
    this.walkTo = null; this.pickTarget = null;
    this.berries = 0; this.shown = 0; this.best = 0;
    this.stung = false; this.poisonOak = false;
    this.combo = 0; this.lastPick = -10; this.picks = 0; this.lost = 0; this.belaAte = 0;
    this.bushes = BUSH_SPOTS.map(([x, y], i) => ({ x, y, ripe: i % 3 === 0, t: i % 3 === 0 ? rnd(7, 10) : rnd(1.5, 7), shake: 0 }));
    this.oaks = OAK_SPOTS.map(([x, y]) => ({ x, y }));
    this.wasps = [];
    this.addWasp();
    this.bela = null;
    this.belaTimes = [rnd(9, 13), rnd(22, 26)];
    this.banner = null;
    audio.playMusic('minigame');
  },

  addWasp() {
    const fromLeft = Math.random() < 0.5;
    this.wasps.push({ x: fromLeft ? 30 : 450, y: rnd(100, 200), vx: 0, vy: 0, mode: 'chase', mt: 0, ph: Math.random() * 6 });
  },

  say(text, col = PAL.hi) { this.banner = { text, col, t: 2.2 }; },

  update(dt) {
    this.t += dt;
    fxUpdate(this.fx, dt);
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    if (this.phase === 'intro') {
      if (this.t > 0.4 && input.anyKey()) { this.phase = 'play'; this.pt = 0; audio.sfx('confirm'); input.consumeClicks(); input.consumeKeys(); this.say('Pick the purple bushes!', PAL.hi); }
      return;
    }
    if (this.phase === 'play') { this.updatePlay(dt); return; }
    if (this.phase === 'over') {
      this.pt += dt; this.updateFlies(dt);
      if (this.pt > 1.4) { this.phase = 'results'; this.pt = 0; audio.sfx(this.berries >= 15 ? 'good' : 'ding'); }
      return;
    }
    if (this.phase === 'results') {
      this.pt += dt;
      this.shown = Math.min(this.berries, this.shown + dt * Math.max(30, this.berries * 1.5));
      if (this.pt > 0.8 && input.anyKey() && !this.finished) {
        this.finished = true;
        audio.sfx('confirm');
        const cb = this.params.onFinish;
        const outcome = { berries: this.berries, stung: this.stung, poisonOak: this.poisonOak };
        if (cb) cb(outcome);
      }
    }
  },

  updatePlay(dt) {
    this.pt += dt;
    this.time = Math.max(0, DUR - this.pt);
    const p = this.p;
    // difficulty: more wasps later
    if (this.wasps.length < 2 && this.pt > 11) { this.addWasp(); this.say('Another wasp!', PAL.warn); audio.sfx('buzz'); }
    if (this.wasps.length < 3 && this.pt > 23) { this.addWasp(); audio.sfx('buzz'); }

    // ---- input ----
    let mx = 0, my = 0;
    if (isKeyLeft()) mx -= 1; if (isKeyRight()) mx += 1;
    if (isKeyUp()) my -= 1; if (isKeyDown()) my += 1;
    if (mx || my) { this.walkTo = null; this.pickTarget = null; }
    for (const c of input.clicks) {
      const b = this.bushAt(c.x, c.y);
      this.pickTarget = b && b.ripe ? b : null;
      this.walkTo = b ? { x: b.x, y: b.y + 8 } : { x: c.x, y: c.y };
    }
    if (input.pointerHeld && !this.pickTarget && input.mouse.x >= 0) this.walkTo = { x: input.mouse.x, y: input.mouse.y + 6 };
    if (!mx && !my && this.walkTo) {
      const dx = this.walkTo.x - p.x, dy = this.walkTo.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) { mx = dx / d; my = dy / d; } else if (!input.pointerHeld) this.walkTo = null;
    }
    const near = this.nearestRipe();
    const wantPick = input.any(' ', 'Enter') || (this.pickTarget && near === this.pickTarget);
    if (wantPick && near && p.flinch <= 0) { this.pick(near); this.pickTarget = null; this.walkTo = null; }
    else if (input.any(' ', 'Enter') && !near) { /* swing at nothing */ }

    // ---- movement ----
    if (p.flinch > 0) { p.flinch -= dt; mx = 0; my = 0; }
    if (p.inv > 0) p.inv -= dt;
    let len = Math.hypot(mx, my);
    p.moving = len > 0.1;
    if (p.moving) {
      mx /= Math.max(1, len); my /= Math.max(1, len);
      const sp = SPEED * (p.itch > 0 ? 0.8 : 1);
      this.moveP(mx * sp * dt, my * sp * dt);
      if (Math.abs(mx) > Math.abs(my)) p.dir = mx < 0 ? 1 : 2; else p.dir = my < 0 ? 3 : 0;
      p.anim += dt;
      if (Math.floor(p.anim * 6) !== Math.floor((p.anim - dt) * 6) && Math.floor(p.anim * 6) % 2 === 0) audio.sfx('step');
    }
    if (p.itch > 0) { p.itch -= dt; if (Math.random() < dt * 6) this.fx.parts.push({ x: p.x + rnd(-6, 6), y: p.y - rnd(4, 26), vx: 0, vy: -10, life: 0.5, max: 0.5, col: '#ff5a5a', size: 1 }); }

    // ---- poison oak ----
    for (const o of this.oaks) {
      if (Math.abs(p.x - o.x) < 12 && Math.abs(p.y - o.y) < 9) {
        if (!o.hit) {
          o.hit = true;
          if (!this.poisonOak) { this.say('Poison oak! So itchy...', PAL.bad); gfx.shake(2, 0.2); audio.sfx('bad'); }
          else audio.sfx('thud');
          this.poisonOak = true; p.itch = 3;
          pop(this.fx, p.x, p.y - 40, 'ITCHY!', PAL.bad, 16, 1);
          burst(this.fx, o.x, o.y - 6, 8, ['#c83a2a', '#5aa83a', '#ffb347'], 40, 80);
        }
      } else if (o.hit && Math.hypot(p.x - o.x, p.y - o.y) > 26) o.hit = false;
    }

    // ---- bushes ----
    for (const b of this.bushes) {
      b.t -= dt; if (b.shake > 0) b.shake -= dt;
      if (b.t <= 0) {
        if (b.ripe) {
          b.ripe = false; b.t = rnd(2.5, 6);
          burst(this.fx, b.x, b.y - 20, 6, ['#3a1450', '#5a2470'], 30, 160);
        } else if (this.bushes.filter((q) => q.ripe).length < 4) {
          b.ripe = true; b.t = rnd(7, 10); b.shake = 0.3;
          burst(this.fx, b.x, b.y - 22, 6, ['#9a5ac8', '#fff'], 30, 40);
        } else b.t = rnd(1, 3);
      }
    }

    // ---- wasps ----
    const lvl = Math.min(1, this.pt / DUR);
    this.wasps.forEach((w, i) => {
      w.mt -= dt; w.ph += dt * 7;
      let tx = p.x, ty = p.y - 16;
      if (w.mode === 'retreat') {
        tx = w.rx; ty = w.ry;
        if (w.mt <= 0) w.mode = 'chase';
      }
      const dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy) || 1;
      const sp = w.mode === 'retreat' ? 70 : 30 + lvl * 16 + i * 3;
      w.vx += ((dx / d) * sp - w.vx) * Math.min(1, dt * 1.6);
      w.vy += ((dy / d) * sp - w.vy) * Math.min(1, dt * 1.6);
      w.x += (w.vx + Math.cos(w.ph * 0.9) * 22) * dt;
      w.y += (w.vy + Math.sin(w.ph * 1.3) * 18) * dt;
      w.x = clamp(w.x, 10, W - 10); w.y = clamp(w.y, 30, H - 8);
      if (w.mode === 'chase' && p.inv <= 0 && dist(w.x, w.y, p.x, p.y - 16) < 11) this.sting(w);
    });
    // occasional buzz when a wasp is close
    if (this.wasps.some((w) => dist(w.x, w.y, p.x, p.y - 16) < 50) && Math.random() < dt * 1.2) audio.sfx('buzz');

    // ---- Bela ----
    if (!this.bela && this.belaTimes.length && this.pt > this.belaTimes[0]) {
      this.belaTimes.shift();
      if (this.berries > 0) this.spawnBela();
    }
    if (this.bela) this.updateBela(dt);

    this.updateFlies(dt);

    if (this.time <= 0) {
      this.phase = 'over'; this.pt = 0;
      audio.sfx('ding'); gfx.flash('#fff', 0.15);
      this.walkTo = null;
    }
  },

  updateFlies(dt) {
    for (const f of this.flies) {
      f.t += dt;
      if (f.t >= f.dur && !f.done) { f.done = true; this.burstHud(); }
    }
    this.flies = this.flies.filter((f) => f.t < f.dur);
  },
  burstHud() { this.best = Math.max(this.best, this.berries); this.hudPulse = 0.15; },

  moveP(dx, dy) {
    const p = this.p;
    const blocked = (x, y) => {
      if (x < BOUNDS.x0 || x > BOUNDS.x1 || y < BOUNDS.y0 || y > BOUNDS.y1) return true;
      const r = { x: x - 6, y: y - 4, w: 12, h: 5 };
      for (const s of SOLIDS) if (r.x < s.x + s.w && r.x + r.w > s.x && r.y < s.y + s.h && r.y + r.h > s.y) return true;
      for (const b of this.bushes) if (Math.abs(x - b.x) < 22 && y > b.y - 14 && y < b.y + 3) return true;
      return false;
    };
    if (!blocked(p.x + dx, p.y)) p.x += dx;
    if (!blocked(p.x, p.y + dy)) p.y += dy;
  },

  bushAt(x, y) {
    return this.bushes.find((b) => x > b.x - 24 && x < b.x + 24 && y > b.y - 40 && y < b.y + 2) || null;
  },
  nearestRipe() {
    let best = null, bd = 34;
    for (const b of this.bushes) {
      if (!b.ripe) continue;
      const d = dist(this.p.x, this.p.y - 4, b.x, b.y - 6);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  },

  pick(b) {
    b.ripe = false; b.t = rnd(3, 6); b.shake = 0.25;
    this.combo = this.pt - this.lastPick < 4 ? this.combo + 1 : 1;
    this.lastPick = this.pt;
    const n = 2 + Math.floor(Math.random() * 3) + Math.min(3, this.combo - 1);
    this.berries += n; this.picks++;
    audio.sfx('pickup');
    pop(this.fx, b.x, b.y - 48, '+' + n, PAL.hi, 16, 1);
    if (this.combo >= 2) pop(this.fx, b.x, b.y - 62, `COMBO x${this.combo}!`, PAL.pink, 8, 1.1, true);
    burst(this.fx, b.x, b.y - 20, 10, ['#3a1450', '#7a3aa0', '#2f6a2a'], 50, 140);
    for (let i = 0; i < n; i++) {
      this.flies.push({ sx: b.x + rnd(-14, 14), sy: b.y - rnd(10, 32), t: -i * 0.05, dur: 0.55 + Math.random() * 0.15, done: false });
    }
    if (this.combo >= 3) gfx.shake(1, 0.1);
  },

  sting(w) {
    const p = this.p;
    this.stung = true;
    const lose = Math.min(this.berries, Math.max(2, Math.ceil(this.berries * 0.25)));
    this.berries -= lose; this.lost += lose;
    p.flinch = 0.6; p.inv = 1.8;
    w.mode = 'retreat'; w.mt = 2.5; w.rx = w.x < 240 ? 30 : 450; w.ry = rnd(60, 120);
    gfx.shake(4, 0.3); gfx.flash('#ff3a2a', 0.12);
    audio.sfx('bad'); audio.sfx('buzz');
    pop(this.fx, p.x, p.y - 44, 'OUCH!', PAL.bad, 16, 1);
    if (lose) pop(this.fx, p.x + 18, p.y - 30, '-' + lose, PAL.bad, 16, 1);
    for (let i = 0; i < lose; i++) this.fx.parts.push({ x: p.x, y: p.y - 14, vx: rnd(-70, 70), vy: rnd(-90, -40), g: 260, life: 0.8, max: 0.8, col: '#4a1a64', size: 3 });
    this.combo = 0;
  },

  spawnBela() {
    const left = this.p.x > 240;
    this.bela = { x: left ? -16 : W + 16, y: rnd(150, 260), mode: 'come', t: 0, dir: left ? 2 : 1, anim: 0, eaten: 0 };
    this.say('Bela smells berries!', PAL.teal);
    audio.sfx('woof');
  },
  updateBela(dt) {
    const b = this.bela, p = this.p;
    b.t += dt; b.anim += dt;
    let tx = p.x, ty = p.y, sp = 64;
    if (b.mode === 'eat') {
      tx = p.x + (b.x < p.x ? -12 : 12); ty = p.y + 2; sp = 90;
      b.eatT = (b.eatT || 0) + dt;
      if (b.eatT > 0.4) {
        b.eatT = 0;
        if (this.berries > 0 && b.eaten < 5) {
          this.berries--; b.eaten++; this.belaAte++;
          audio.sfx('pop');
          pop(this.fx, b.x, b.y - 30, ['nom!', 'chomp', 'slurp', 'nom nom'][b.eaten % 4], PAL.teal, 14, 0.7);
          burst(this.fx, b.x, b.y - 14, 3, ['#4a1a64', '#c060a0'], 30, 120);
        } else { b.mode = 'leave'; this.say(b.eaten ? `Bela ate ${b.eaten} berries!` : 'Bela gives up.', PAL.teal); audio.sfx('woof'); }
      }
    } else if (b.mode === 'come') {
      if (dist(b.x, b.y, p.x, p.y) < 16) { b.mode = 'eat'; b.eatT = 0.3; pop(this.fx, b.x, b.y - 40, 'BELA, NO!', PAL.pink, 16, 1.1); }
      if (b.t > 8) { b.mode = 'leave'; this.say('Bela got bored.', PAL.teal); }
    }
    if (b.mode === 'leave') { tx = b.x < 240 ? -40 : W + 40; ty = b.y; sp = 80; }
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
    if (d > 2) {
      b.x += (dx / d) * sp * dt; b.y += (dy / d) * sp * dt;
      b.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      b.moving = true;
    } else b.moving = false;
    if (b.mode === 'leave' && (b.x < -30 || b.x > W + 30)) this.bela = null;
  },

  // ---------- drawing ----------
  draw() {
    this.drawWorld();
    if (this.phase === 'intro') this.drawIntro();
    else if (this.phase === 'results') this.drawResults();
    else this.drawHud();
    if (this.phase === 'over') {
      const s = Math.min(1, this.pt * 4);
      gfx.text("TIME'S UP!", W / 2, 130 - (1 - s) * 20, { size: 20, head: true, align: 'center', color: PAL.hi });
    }
  },

  drawWorld() {
    const bg = assets.get('minigame/forage_bg');
    if (bg) gfx.image(bg, 0, 0);
    else this.drawBgFallback();
    // poison oak (flat on the ground)
    for (const o of this.oaks) {
      const img = assets.get('minigame/poison_oak');
      if (img) gfx.image(img, o.x - 12, o.y - 18);
      else {
        for (const [dx, dy] of [[-5, -6], [3, -9], [0, -2], [-8, 0], [6, -1]]) {
          gfx.rect(o.x + dx - 2, o.y + dy - 3, 5, 4, (dx + dy) % 2 ? '#b8402a' : '#4a8a2a');
        }
      }
    }
    // y-sorted actors
    const list = [];
    for (const b of this.bushes) list.push({ y: b.y, fn: () => this.drawBush(b) });
    list.push({ y: this.p.y, fn: () => this.drawPlayer() });
    if (this.bela) list.push({ y: this.bela.y, fn: () => this.drawBela() });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.fn();
    // pick prompt
    if (this.phase === 'play') {
      const nb = this.nearestRipe();
      if (nb) {
        const label = input.lastPointerType === 'touch' ? 'TAP' : 'SPACE';
        const bob = Math.round(Math.sin(this.t * 8) * 1.5);
        const w = gfx.measure(label, 8, true) + 8;
        gfx.rect(nb.x - w / 2, nb.y - 56 + bob, w, 12, PAL.ink);
        gfx.strokeRect(nb.x - w / 2, nb.y - 56 + bob, w, 12, PAL.hi);
        gfx.text(label, nb.x, nb.y - 54 + bob, { size: 8, head: true, align: 'center', color: PAL.hi, shadow: false });
      }
    }
    // wasps
    for (const w of this.wasps) {
      shadow(w.x, w.y + 14, 4, 1);
      const f = Math.floor(this.t * 16) % 2;
      if (!sheet('minigame/wasp', 16, 16, f, 0, w.x - 8, w.y - 8, { flip: w.vx > 0 })) {
        gfx.rect(w.x - 4, w.y - 2, 8, 5, '#f0c020');
        gfx.rect(w.x - 2, w.y - 2, 2, 5, '#222'); gfx.rect(w.x + 2, w.y - 2, 1, 5, '#222');
        gfx.alpha(0.7, () => gfx.rect(w.x - 3, w.y - 6 + f, 6, 3, '#dff'));
      }
    }
    fxDraw(this.fx);
    // berries flying to basket
    const berry = assets.get('minigame/berry');
    for (const f of this.flies) {
      if (f.t < 0) continue;
      const k = Math.min(1, f.t / f.dur), e = k * k;
      const x = f.sx + (22 - f.sx) * e, y = f.sy + (18 - f.sy) * e - Math.sin(k * Math.PI) * 40;
      if (berry) gfx.image(berry, x - 4, y - 4);
      else { gfx.rect(x - 2, y - 2, 4, 4, '#3a1450'); gfx.rect(x - 1, y - 2, 1, 1, '#b08ad0'); }
    }
  },

  drawBgFallback() {
    gfx.rect(0, 0, W, H, '#3f8a3a');
    for (let i = 0; i < 260; i++) {
      const x = (i * 97) % W, y = (i * 61) % H;
      gfx.rect(x, y, 1, 2, i % 3 ? '#4f9a44' : '#2f6e30');
    }
    // forest edges
    for (let x = 0; x < W; x += 22) { ellipse(x + 10, 34 + (x % 3) * 6, 16, 26, '#1f4a26'); ellipse(x + 10, 30 + (x % 3) * 6, 11, 18, '#2a5e2e'); }
    for (let y = 60; y < H; y += 26) { ellipse(12, y, 18, 16, '#1f4a26'); ellipse(W - 12, y + 10, 18, 16, '#1f4a26'); }
    // path & table
    for (let y = 150; y < H; y += 2) gfx.rect(170 + Math.sin(y / 30) * 20 + (y - 150) * 0.3, y, 26, 2, '#b07a44');
    gfx.rect(80, 80, 66, 34, '#7a5232'); gfx.rect(84, 84, 58, 14, '#a06a3c'); gfx.rect(84, 104, 58, 6, '#a06a3c');
  },

  drawBush(b) {
    const ox = b.shake > 0 ? Math.round(Math.sin(b.shake * 60) * 2) : 0;
    const flick = b.ripe && b.t < 2 && blink(this.t, 8);
    shadow(b.x, b.y - 2, 22, 4);
    const img = assets.get(b.ripe && !flick ? 'minigame/bramble_ripe' : 'minigame/bramble');
    if (img) gfx.image(img, b.x - 24 + ox, b.y - 40);
    else {
      ellipse(b.x + ox, b.y - 18, 22, 17, '#1f5a26');
      ellipse(b.x + ox - 6, b.y - 22, 12, 10, '#2e7a32');
      ellipse(b.x + ox + 8, b.y - 16, 10, 8, '#2a6e2e');
      if (b.ripe && !flick) for (let i = 0; i < 12; i++) gfx.rect(b.x + ox - 16 + ((i * 11) % 32), b.y - 32 + ((i * 5 + (i % 3) * 9) % 24), 3, 3, '#3a1450');
    }
    if (b.ripe && b.t < 2) {
      // about to drop: little warning sparkles
      if (blink(this.t, 6)) gfx.rect(b.x - 20 + ((this.t * 50) % 40), b.y - 42, 2, 2, PAL.warn);
    } else if (b.ripe && blink(this.t + b.x, 1.5)) {
      gfx.rect(b.x + 14, b.y - 36, 1, 3, '#fff'); gfx.rect(b.x + 13, b.y - 35, 3, 1, '#fff');
    }
  },

  drawPlayer() {
    const p = this.p;
    if (p.inv > 0 && p.flinch <= 0 && blink(this.t, 14)) return;
    shadow(p.x, p.y - 1, 7, 2);
    const col = p.moving ? [0, 1, 2, 1][Math.floor(p.anim * 8) % 4] : 1;
    const jx = p.flinch > 0 ? Math.round(Math.sin(this.t * 80) * 2) : 0;
    if (!sheet(`sprites/${this.who}_walk`, 24, 32, col, p.dir, p.x - 12 + jx, p.y - 32)) drawWalkerFallback(p.x + jx, p.y, p.dir, col, this.look);
    // basket on hip
    const bk = assets.get('minigame/basket');
    const bx = p.dir === 1 ? p.x - 16 : p.x + 4, by = p.y - 18;
    if (p.dir !== 3) {
      if (bk) gfx.image(bk, bx, by, { w: 12, h: 12 });
      else { gfx.rect(bx, by + 4, 12, 7, '#a0703c'); gfx.rect(bx + 1, by + 2, 10, 2, '#3a1450'); }
    }
  },

  drawBela() {
    const b = this.bela;
    shadow(b.x, b.y - 1, 9, 2);
    const col = b.moving ? [0, 1, 2, 1][Math.floor(b.anim * 10) % 4] : 1;
    const hop = b.mode === 'eat' ? Math.round(Math.abs(Math.sin(this.t * 14))) : 0;
    if (!sheet('sprites/bela_walk', 32, 32, col, b.dir, b.x - 16, b.y - 30 - hop)) drawDogFallback(b.x, b.y - hop, b.dir, col);
  },

  drawHud() {
    // basket counter
    gfx.panel(4, 4, 92, 28, { shadow: false });
    const bk = assets.get('minigame/basket');
    const pulse = this.hudPulse > 0 ? 1 : 0;
    if (this.hudPulse > 0) this.hudPulse -= 1 / 60;
    if (bk) gfx.image(bk, 12 - pulse, 10 - pulse, { w: 16 + pulse * 2, h: 16 + pulse * 2 });
    else { gfx.rect(12, 16, 16, 9, '#a0703c'); gfx.rect(13, 12, 14, 4, '#3a1450'); }
    gfx.text('x ' + this.berries, 34, 9, { size: 16, color: PAL.hi });
    // timer
    const tw = 200, tx = W / 2 - tw / 2;
    gfx.rect(tx - 1, 9, tw + 2, 10, '#000');
    const f = this.time / DUR;
    gfx.rect(tx, 10, Math.round(tw * f), 8, f > 0.3 ? PAL.good : blink(this.t, 4) ? PAL.bad : PAL.warn);
    gfx.alpha(0.35, () => gfx.rect(tx, 10, Math.round(tw * f), 2, '#fff'));
    gfx.text(Math.ceil(this.time) + 's', W / 2, 20, { size: 12, align: 'center' });
    // combo
    const since = this.pt - this.lastPick;
    if (this.combo >= 2 && since < 4) {
      gfx.text(`COMBO x${this.combo}`, W - 8, 8, { size: 8, head: true, align: 'right', color: PAL.pink });
      gfx.rect(W - 80, 20, Math.round(72 * (1 - since / 4)), 3, PAL.pink);
    }
    if (this.poisonOak) gfx.text('itchy', W - 8, 26, { size: 12, align: 'right', color: PAL.bad });
    if (this.banner) {
      const a = Math.min(1, this.banner.t * 3);
      gfx.alpha(a, () => gfx.text(this.banner.text, W / 2, 40, { size: 16, align: 'center', color: this.banner.col }));
    }
  },

  drawIntro() {
    gfx.alpha(0.55, () => gfx.rect(0, 0, W, H, '#000'));
    gfx.panel(60, 32, 360, 236);
    gfx.text('BLACKBERRY BRAMBLE', W / 2, 46, { size: 12, head: true, align: 'center', color: PAL.hi });
    gfx.text(`${this.look.name} has ${DUR} seconds to fill the basket.`, W / 2, 66, { size: 16, align: 'center', color: PAL.dim });
    const touch = input.lastPointerType === 'touch';
    const rows = [
      ['bramble_ripe', touch ? 'Tap a ripe bush to walk over & pick it' : 'Walk to a ripe bush, press SPACE to pick'],
      ['bramble', 'Green bushes ripen over time - be quick!'],
      ['wasp', 'Wasps sting: you drop berries'],
      ['poison_oak', 'Do NOT touch the poison oak'],
      ['bela', 'Watch out - Bela loves berries too'],
    ];
    rows.forEach(([k, txt], i) => {
      const y = 92 + i * 28;
      if (k === 'bela') { if (!sheet('sprites/bela_walk', 32, 32, 1, 2, 80, y - 8)) drawDogFallback(96, y + 20, 2, 1); }
      else if (k === 'wasp') { if (!sheet('minigame/wasp', 16, 16, Math.floor(this.t * 12) % 2, 0, 88, y)) gfx.rect(90, y + 5, 10, 6, '#f0c020'); }
      else {
        const img = assets.get('minigame/' + k);
        if (img) gfx.image(img, 96 - img.width / 4, y - 2, { w: Math.round(img.width / 2), h: Math.round(img.height / 2) });
        else gfx.rect(88, y + 2, 16, 14, k === 'poison_oak' ? '#b8402a' : k === 'bramble' ? '#2e7a32' : '#3a1450');
      }
      gfx.text(txt, 122, y + 1, { size: 16 });
    });
    gfx.text(touch ? 'Hold & drag to walk' : 'Move: ARROWS / WASD', W / 2, 228, { size: 16, align: 'center', color: PAL.dim });
    cardHint(this.t, 246);
  },

  drawResults() {
    gfx.alpha(0.6, () => gfx.rect(0, 0, W, H, '#000'));
    gfx.panel(90, 40, 300, 220, { body: '#2a2038' });
    gfx.text('BASKET REPORT', W / 2, 54, { size: 12, head: true, align: 'center', color: PAL.hi });
    const n = Math.floor(this.shown);
    const bk = assets.get('minigame/basket');
    if (bk) gfx.image(bk, W / 2 - 16, 76, { w: 32, h: 32 });
    gfx.text(n + (n === 1 ? ' berry' : ' berries'), W / 2, 112, { size: 32, align: 'center', color: PAL.hi });
    const b = this.berries;
    const rating = b >= 50 ? 'Pie-worthy!' : b >= 25 ? 'Cobbler for two!' : b >= 10 ? 'A tasty handful.' : b > 0 ? 'Mostly thorns...' : 'Empty basket. Oof.';
    gfx.text(rating, W / 2, 146, { size: 16, align: 'center', color: b >= 25 ? PAL.good : PAL.text });
    let y = 172;
    const line = (txt, col) => { gfx.text(txt, W / 2, y, { size: 16, align: 'center', color: col }); y += 18; };
    if (this.stung) line(`Stung by a wasp (dropped ${this.lost})`, PAL.bad);
    if (this.poisonOak) line('Brushed poison oak - itchy rash', PAL.bad);
    if (this.belaAte) line(`Bela snarfed ${this.belaAte} berr${this.belaAte === 1 ? 'y' : 'ies'}`, PAL.teal);
    if (!this.stung && !this.poisonOak && !this.belaAte) line('Not a scratch on you!', PAL.good);
    if (this.pt > 0.8) {
      const touch = input.lastPointerType === 'touch';
      if (blink(this.pt)) gfx.text(touch ? 'Tap to continue' : 'Press any key to continue', W / 2, 238, { size: 14, align: 'center', color: PAL.dim });
    }
  },
}));
