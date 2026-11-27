// Overlay dialog: shows a Result (title/text/portrait/effects/choices),
// handles choice chains and minigame hand-offs.
import { gfx, PAL, W, H, ui } from '../engine/gfx.js';
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
    const choices = (result.choices || []).filter((c) => !c.when || c.when(s));
    this.choices = choices;
    this.menu = null;
    if (choices.length) {
      this.menu = new Menu(choices.map((c) => ({ label: c.label, onPick: () => this.choose(c) })), { x: 0, w: 100, size: 16 });
    }
    const tone = result.tone;
    if (result.sfx) audio.sfx(result.sfx);
    else if (tone === 'bad') audio.sfx('bad');
    else if (tone === 'good') audio.sfx('good');
    if (tone === 'bad' && result.shake !== false) gfx.shake(2, 0.25);
    this.layout();
  },
  // Recomputed whenever the screen shape changes.
  layout() {
    const P = ui.portrait;
    const fs = ui.fs, lh = ui.lh;
    this.fs = fs; this.lh = lh;
    this.pw = P ? W - 20 : Math.min(440, W - 40);
    this.px = Math.round((W - this.pw) / 2);
    const who = !!this.r.who;
    this.psize = P ? 80 : 64;
    if (P || !who) { this.tx = this.px + 20; this.tw = this.pw - 40; } else { this.tx = this.px + 92; this.tw = this.pw - 112; }
    const shown = this.tw2 ? this.tw2.shown : 0;
    this.tw2 = new Typewriter(this.r.text || '', this.tw, fs, 90);
    this.tw2.shown = Math.min(shown, this.tw2.total);
    const textH = this.tw2.height(lh);
    const chipH = P ? 20 : 16;
    this.chipH = chipH;
    const effH = this.effects.length ? Math.ceil(this.effects.length / (P ? 2 : 3)) * chipH + 6 : 0;
    const mlh = ui.mlh;
    if (this.menu) { this.menu.size = fs; this.menu.lh = mlh; this.menu.x = this.tx + 4; this.menu.w = this.tw; }
    const menuH = this.menu ? this.menu.items.length * mlh + 6 : 0;
    const top = P && who ? this.psize + 12 : 0;
    const h = Math.max(!P && who ? 104 : 60, 40 + top + textH + effH + menuH + 26);
    this.h = Math.min(H - 10, h);
    this.y = Math.max(5, Math.round((H - this.h) / 2));
    this.textY = this.y + 34 + top;
    this.effY = this.textY + textH + 4;
    if (this.menu) this.menu.y = this.effY + effH + 2;
    this.lw = W; this.lhH = H;
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
    if (this.lw !== W || this.lhH !== H) this.layout();
    gfx.alpha(0.55, () => gfx.rect(0, 0, W, H, '#000'));
    const tone = this.r.tone;
    const P = ui.portrait;
    const body = tone === 'bad' ? '#3d1f2e' : tone === 'good' ? '#1f3a2e' : PAL.panel;
    gfx.panel(this.px, this.y, this.pw, this.h, { body });
    if (this.r.title) {
      const col = tone === 'bad' ? PAL.bad : tone === 'good' ? PAL.good : PAL.hi;
      gfx.text(this.r.title, W / 2, this.y + 12, { size: P ? 12 : 10, head: true, align: 'center', color: col });
    }
    const mood = this.r.mood || (tone === 'bad' ? 'sick' : tone === 'good' ? 'happy' : 'neutral');
    if (this.r.who) {
      if (P) drawPortrait(this.r.who, W / 2 - this.psize / 2, this.y + 34, mood, { size: this.psize });
      else drawPortrait(this.r.who, this.px + 16, this.y + 34, mood);
    }
    this.tw2.draw(this.tx, this.textY, PAL.text, this.lh);
    if (this.tw2.done) {
      let x = this.tx, y = this.effY;
      const cs = P ? 18 : 14;
      for (const e of this.effects) {
        const w = gfx.measure(e.text, cs) + 8 + (e.icon ? 16 : 0);
        if (x + w > this.tx + this.tw) { x = this.tx; y += this.chipH; }
        gfx.rect(x, y, w, this.chipH - 2, e.good ? '#1d4d2a' : '#5a1f24');
        let tx = x + 4;
        if (e.icon) { drawIcon(e.icon, x + 1, y + (this.chipH - 18) / 2); tx += 16; }
        gfx.text(e.text, tx, y, { size: cs, color: e.good ? PAL.good : '#ff9d94', shadow: false });
        x += w + 4;
      }
      if (this.menu) this.menu.draw();
      else continueHint(this.t, W / 2, this.y + this.h - (P ? 24 : 18));
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
