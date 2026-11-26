// Overlay dialog: shows a Result (title/text/portrait/effects/choices),
// handles choice chains and minigame hand-offs.
import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { Menu, Typewriter, drawPortrait, continueHint, drawIcon } from '../engine/ui.js';
import { game } from '../game/game.js';

// Show a result; onDone() called when the whole chain is finished.
export function showResult(result, onDone, snap = null) {
  if (!result) { if (onDone) onDone(); return; }
  game.push('message', { result, onDone, snap });
}

// Run an event (or any result-producing fn) with automatic effect diffing.
export function runResultFn(fn, onDone) {
  const s = game.state;
  const snap = s.snapshot();
  const r = fn(s);
  if (!r) { if (onDone) onDone(); return; }
  showResult(r, onDone, snap);
}

game.register('message', () => ({
  enter({ result, onDone, snap }) {
    this.r = result;
    this.onDone = onDone;
    this.t = 0;
    const s = game.state;
    this.effects = snap ? s.diff(snap) : [];
    const hasPortrait = !!result.who;
    this.tx = hasPortrait ? 112 : 40;
    this.tw = hasPortrait ? 330 : 400;
    this.tw2 = new Typewriter(result.text || '', this.tw, 16, 90);
    const choices = (result.choices || []).filter((c) => !c.when || c.when(s));
    this.menu = null;
    if (choices.length) {
      this.menu = new Menu(choices.map((c) => ({ label: c.label, onPick: () => this.choose(c) })), { x: this.tx + 4, w: this.tw, size: 16 });
    }
    const tone = result.tone;
    if (result.sfx) audio.sfx(result.sfx);
    else if (tone === 'bad') audio.sfx('bad');
    else if (tone === 'good') audio.sfx('good');
    if (tone === 'bad' && result.shake !== false) gfx.shake(2, 0.25);
    this.layout();
  },
  layout() {
    const lh = 19;
    const textH = this.tw2.height(lh);
    const effH = this.effects.length ? Math.ceil(this.effects.length / 3) * 16 + 6 : 0;
    const menuH = this.menu ? this.menu.items.length * 19 + 6 : 0;
    const h = Math.max(this.r.who ? 100 : 60, 40 + textH + effH + menuH + 22);
    this.h = Math.min(290, h);
    this.y = Math.max(5, Math.round((300 - this.h) / 2));
    this.textY = this.y + 34;
    this.effY = this.textY + textH + 4;
    if (this.menu) this.menu.y = this.effY + effH + 2;
  },
  choose(c) {
    const s = game.state;
    const snap = s.snapshot();
    const r = c.run(s);
    game.pop();
    if (r) showResult(r, this.onDone, snap);
    else if (this.onDone) this.onDone();
  },
  finish() {
    const r = this.r;
    game.pop();
    if (r.minigame && game.has(r.minigame.name)) {
      const mg = r.minigame;
      game.push(r.minigame.name, {
        ...(mg.params || {}),
        onFinish: (outcome) => {
          game.pop();
          if (mg.after) runResultFn((s) => mg.after(s, outcome), this.onDone);
          else if (this.onDone) this.onDone();
        },
      });
      return;
    }
    if (r.minigame && mg_fallback(r.minigame, this.onDone)) return;
    if (this.onDone) this.onDone();
  },
  update(dt) {
    this.t += dt;
    this.tw2.update(dt);
    if (!this.tw2.done) {
      if (input.anyKey()) { this.tw2.finish(); input.consumeKeys(); input.consumeClicks(); }
      return;
    }
    if (this.menu) { this.menu.update(dt); return; }
    if (this.t > 0.25 && input.anyKey()) { audio.sfx('confirm'); this.finish(); }
  },
  draw() {
    gfx.alpha(0.55, () => gfx.rect(0, 0, 480, 300, '#000'));
    const tone = this.r.tone;
    const body = tone === 'bad' ? '#3d1f2e' : tone === 'good' ? '#1f3a2e' : PAL.panel;
    gfx.panel(20, this.y, 440, this.h, { body });
    if (this.r.title) {
      const col = tone === 'bad' ? PAL.bad : tone === 'good' ? PAL.good : PAL.hi;
      gfx.text(this.r.title, 240, this.y + 12, { size: 10, head: true, align: 'center', color: col });
    }
    if (this.r.who) drawPortrait(this.r.who, 36, this.y + 34, this.r.mood || (tone === 'bad' ? 'sick' : tone === 'good' ? 'happy' : 'neutral'));
    this.tw2.draw(this.tx, this.textY, PAL.text, 19);
    if (this.tw2.done) {
      // effects chips
      let x = this.tx, y = this.effY;
      for (const e of this.effects) {
        const w = gfx.measure(e.text, 14) + 8 + (e.icon ? 16 : 0);
        if (x + w > this.tx + this.tw) { x = this.tx; y += 16; }
        gfx.rect(x, y, w, 14, e.good ? '#1d4d2a' : '#5a1f24');
        let tx = x + 4;
        if (e.icon) { drawIcon(e.icon, x + 1, y - 1); tx += 16; }
        gfx.text(e.text, tx, y, { size: 14, color: e.good ? PAL.good : '#ff9d94', shadow: false });
        x += w + 4;
      }
      if (this.menu) this.menu.draw();
      else continueHint(this.t, 240, this.y + this.h - 18);
    }
  },
}));

// If a minigame scene isn't available, resolve with a random outcome.
function mg_fallback(mg, onDone) {
  if (!mg.after) return false;
  const outcome = { caught: Math.random() < 0.6, hits: Math.floor(Math.random() * 3), score: 10, fallback: true };
  runResultFn((s) => mg.after(s, outcome), onDone);
  return true;
}
