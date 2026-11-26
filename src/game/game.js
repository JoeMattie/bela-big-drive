// Scene manager. A scene is an object with optional enter(params), update(dt),
// draw(), exit(). Overlays (push) draw on top of the scene below them.
import { gfx } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { GameState } from './state.js';

const registry = {};

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
    if (top && top.update) top.update(dt);
    for (const s of this.stack) if (s !== top && s.bgUpdate) s.bgUpdate(dt);
  },
  draw() {
    // find lowest scene that must be drawn
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].overlay) start--;
    for (let i = start; i < this.stack.length; i++) {
      const s = this.stack[i];
      if (s.draw) s.draw();
    }
    if (this.fade > 0) {
      gfx.alpha(this.fade, () => gfx.rect(0, 0, 480, 300, '#000'));
    }
  },
  tickFade(dt) { if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 4); },
};
