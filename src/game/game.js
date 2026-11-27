// Scene manager. A scene is an object with optional enter(params), update(dt),
// draw(), exit(). Overlays (push) draw on top of the scene below them.
import { gfx, W, H, STAGE_W, STAGE_H, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { GameState } from './state.js';

const registry = {};
// Scenes that keep a fixed 480x300 playfield, centered on any screen shape.
const FIXED = new Set(['forage', 'freeway', 'catchase', 'casino', 'map', 'supplies', 'ending', 'gameover', 'halloffame', 'learn', 'departure']);
const stageOrigin = () => ({ x: Math.round((W - STAGE_W) / 2), y: Math.round((H - STAGE_H) / 2) });

export const game = {
  state: new GameState(),
  stack: [],
  t: 0,
  fade: 0,          // >0 means fading in
  register(name, factory) { registry[name] = factory; },
  has(name) { return !!registry[name]; },
  make(name, params) {
    const f = registry[name];
    if (!f) throw new Error('Unknown scene ' + name);
    const s = f();
    s.name = name;
    if (FIXED.has(name)) s.fixed = true;
    if (s.enter) s.enter(params || {});
    return s;
  },
  // Replace the whole stack.
  go(name, params) {
    for (const s of this.stack) if (s.exit) s.exit();
    this.stack = [this.make(name, params)];
    this.fade = 1;
    input.consumeKeys();
    input.consumeClicks();
  },
  push(name, params) {
    const s = this.make(name, params);
    s.overlay = true;
    this.stack.push(s);
    input.consumeKeys();
    input.consumeClicks();
    return s;
  },
  pop(result) {
    const s = this.stack.pop();
    if (s && s.exit) s.exit();
    const top = this.top();
    if (top && top.resume) top.resume(result);
    input.consumeKeys();
    input.consumeClicks();
  },
  top() { return this.stack[this.stack.length - 1]; },
  update(dt) {
    this.t += dt;
    const top = this.top();
    if (top && top.fixed) {
      // translate pointer coordinates into the centered stage
      const o = stageOrigin();
      input.mouse.x -= o.x; input.mouse.y -= o.y;
      for (const c of input.clicks) { c.x -= o.x; c.y -= o.y; }
      if (top.update) top.update(dt);
      input.mouse.x += o.x; input.mouse.y += o.y;
    } else if (top && top.update) top.update(dt);
    for (const s of this.stack) if (s !== top && s.bgUpdate) s.bgUpdate(dt);
  },
  draw() {
    // find lowest scene that must be drawn
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].overlay) start--;
    for (let i = start; i < this.stack.length; i++) {
      const s = this.stack[i];
      if (!s.draw) continue;
      if (s.fixed) {
        const o = stageOrigin();
        if (o.x || o.y) {
          if (s.backdrop) s.backdrop(o);
          else gfx.alpha(i === start ? 1 : 0.92, () => gfx.rect(0, 0, W, H, '#120d1a'));
        }
        const c = gfx.ctx;
        c.save();
        c.translate(o.x, o.y);
        c.beginPath(); c.rect(0, 0, STAGE_W, STAGE_H); c.clip();
        s.draw();
        c.restore();
        if ((o.x || o.y) && !s.backdrop) gfx.strokeRect(o.x - 1, o.y - 1, STAGE_W + 2, STAGE_H + 2, PAL.edgeLo);
      } else s.draw();
    }
    if (this.fade > 0) {
      gfx.alpha(this.fade, () => gfx.rect(0, 0, W, H, '#000'));
    }
  },
  tickFade(dt) { if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 4); },
};
