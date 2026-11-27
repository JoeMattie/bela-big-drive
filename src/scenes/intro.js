import { gfx, PAL, W, H, ui } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { Menu, Typewriter, drawPortrait, continueHint } from '../engine/ui.js';
import { drawScene, drawArt } from '../engine/art.js';
import { game } from '../game/game.js';
import { PARTY } from '../data/party.js';
import { DIFFICULTIES, MONTHS } from '../data/items.js';

const STORY = 'It\'s 2026. After years of perfect weather, fish tacos and zero seasons, the family has made a decision: they are moving to PORTLAND, OREGON.\n\nThey could rent a truck. They could fly. Instead, they will drive 1,100+ miles in a 1999 Forest River Georgetown — a 31-foot Class A motorhome with a Ford V10, a mysterious smell, and a lot of heart.\n\nWith them: one bull terrier and two extremely unconsulted cats.';

const SEASON_HINT = {
  0: 'Winter: snow closes the Grapevine & Siskiyou. Bring chains. Oregon is a sponge.',
  1: 'Winter: snow closes the Grapevine & Siskiyou. Bring chains. Oregon is a sponge.',
  2: 'Spring: rain up north, late snow on the passes, wildflowers everywhere.',
  3: 'Spring: rain up north, wildflowers, mild temps. A classic choice.',
  4: 'Late spring: pleasant almost everywhere. Recommended for first-timers.',
  5: 'Summer: fog on the coast, 110°F in the valley. Long days.',
  6: 'Summer: scorching valley heat, wildfire smoke possible up north.',
  7: 'Summer: peak heat & wildfire smoke season. Blackberries are ripe in Oregon!',
  8: 'Early fall: smoke lingers, berries still ripe, crowds thin out.',
  9: 'Fall: crisp, colorful, and the rain is starting to come back.',
  10: 'Late fall: first snows on the passes. The rain returns to Oregon.',
  11: 'Winter: snow closes the passes, holiday traffic in LA. Bold.',
};

game.register('intro', () => ({
  enter() {
    this.t = 0;
    this.step = 0;
    this.focus = 0;
    this.tw = null;
    this.faces = [];
    this.diffMenu = new Menu(DIFFICULTIES.map((d) => ({ label: d.name, right: `$${d.money}`, onPick: () => { this.diff = d.id; this.next(); } })), { x: 50, y: 70, w: 380 });
    this.monthMenu = new Menu(MONTHS.map((m, i) => ({ label: m, onPick: () => { this.month = i; this.next(); } })), { x: 50, y: 62, w: 150, sel: 4, lh: 17 });
    audio.playMusic('town');
  },
  next() {
    this.step++;
    this.t = 0;
    if (this.step === 4) {
      game.state.reset(this.diff, this.month);
      game.go('store', { start: true });
    }
  },
  update(dt) {
    this.t += dt;
    if (this.step === 0) {
      this.ensureTw();
      this.tw.update(dt);
      if (input.anyKey()) { if (!this.tw.done) this.tw.finish(); else this.next(); }
    } else if (this.step === 1) {
      if (input.any('ArrowRight', 'd')) { this.focus = (this.focus + 1) % 5; audio.sfx('select'); }
      if (input.any('ArrowLeft', 'a')) { this.focus = (this.focus + 4) % 5; audio.sfx('select'); }
      this.faces.forEach(([x, y, w, h], i) => {
        if (input.clickIn(x, y, w, h)) { if (this.focus === i) this.next(); else { this.focus = i; audio.sfx('select'); } input.consumeClicks(); }
      });
      if (input.confirm() || (this.goBtn && input.clickIn(...this.goBtn))) { audio.sfx('confirm'); this.next(); }
    } else if (this.step === 2) {
      this.diffMenu.update(dt);
    } else if (this.step === 3) {
      this.monthMenu.update(dt);
    }
  },
  ensureTw() {
    const w = ui.portrait ? W - 60 : Math.min(420, W - 60);
    if (!this.tw || this.twW !== w || this.twF !== ui.fs) {
      const shown = this.tw ? this.tw.shown : 0;
      this.tw = new Typewriter(STORY, w, ui.fs, 80);
      this.tw.shown = Math.min(shown, this.tw.total);
      this.twW = w; this.twF = ui.fs;
    }
  },
  draw() {
    const P = ui.portrait, fs = ui.fs, lh = ui.lh;
    const cx = W / 2;
    gfx.rect(0, 0, W, H, PAL.night);
    if (this.step === 0) {
      this.ensureTw();
      drawArt('san_diego', P ? 0 : 0, this.t);
      const th = this.tw.height(lh) + 50;
      const pw = Math.min(W - 24, P ? W - 24 : 448);
      const py = P ? 210 : 64;
      gfx.panel((W - pw) / 2, py, pw, Math.max(th, P ? H - py - 20 : 230), { body: 'rgba(46,33,64,0.94)' });
      this.tw.draw((W - pw) / 2 + 16, py + 14, PAL.text, lh);
      if (this.tw.done) continueHint(this.t);
    } else if (this.step === 1) {
      gfx.text('MEET THE CREW', cx, P ? 30 : 14, { size: 14, head: true, align: 'center', color: PAL.hi });
      const size = P ? 76 : 64, gap = P ? 14 : 26;
      const rowW = 5 * size + 4 * gap, x0 = Math.round((W - rowW) / 2), y = P ? 70 : 50;
      this.faces = [];
      PARTY.forEach((p, i) => {
        const x = x0 + i * (size + gap);
        const on = i === this.focus;
        drawPortrait(p.id, x, y + (on ? -4 : 0), on ? 'happy' : 'neutral', { size, bg: on ? '#5a4370' : '#3a2e4f' });
        gfx.text(p.name, x + size / 2, y + size + 8, { size: P ? 18 : 16, align: 'center', color: on ? PAL.hi : PAL.text });
        this.faces.push([x - gap / 2, y - 6, size + gap, size + 30]);
      });
      const p = PARTY[this.focus];
      const pw = P ? W - 24 : Math.min(448, W - 32), px = (W - pw) / 2, py = y + size + 40;
      const bio = gfx.wrap(p.bio, pw - 30, fs);
      const ph = 26 + lh + bio.length * lh + lh + 16;
      gfx.panel(px, py, pw, ph);
      gfx.text(`${p.name} — ${p.title}`, px + 14, py + 12, { size: fs, color: PAL.hi });
      bio.forEach((l, i) => gfx.text(l, px + 14, py + 12 + lh + i * lh, { size: fs }));
      gfx.text('★ ' + p.perk, px + 14, py + 12 + lh + bio.length * lh + 6, { size: fs, color: PAL.good });
      if (P) {
        const by = py + ph + 30;
        this.goBtn = [40, by, W - 80, 50];
        gfx.rect(40, by, W - 80, 50, '#5a3a20'); gfx.strokeRect(40, by, W - 80, 50, PAL.edge);
        gfx.text("LET'S GO ▸", cx, by + 19, { size: 12, head: true, align: 'center', color: PAL.hi });
        gfx.text('Tap a face to meet them', cx, by + 70, { size: 18, align: 'center', color: PAL.dim });
      } else {
        this.goBtn = [0, H - 40, W, 40];
        continueHint(this.t, cx, H - 20, input.lastPointerType === 'touch' ? 'Tap a face · tap here to continue' : '◂ ▸ to browse · ENTER to continue');
      }
    } else if (this.step === 2) {
      const m = this.diffMenu;
      m.size = fs; m.lh = ui.mlh;
      const pw = P ? W - 24 : Math.min(420, W - 40), px = (W - pw) / 2;
      let y = P ? 40 : 20;
      gfx.text('HOW IS THE RV DOING?', cx, y, { size: 12, head: true, align: 'center', color: PAL.hi });
      y += 22;
      gfx.wrap('Choose your difficulty. Harder = less money, more points.', pw, fs).forEach((l) => { gfx.text(l, cx, y, { size: fs, align: 'center', color: PAL.dim }); y += lh; });
      const mh = 3 * m.lh + 16;
      gfx.panel(px, y, pw, mh);
      m.x = px + 20; m.w = pw - 40; m.y = y + 8;
      m.draw();
      y += mh + 12;
      const d = DIFFICULTIES[m.sel];
      const desc = gfx.wrap(d.desc, pw - 32, fs);
      const stats = [`Starting cash: $${d.money}`, `RV condition: ${d.rv}%`, `Score ×${d.mult}`];
      const dh = 20 + lh + desc.length * lh + (P ? stats.length : 1) * lh + 14;
      gfx.panel(px, y, pw, dh);
      gfx.text(d.name, px + 16, y + 12, { size: fs, color: PAL.hi });
      desc.forEach((l, i) => gfx.text(l, px + 16, y + 12 + lh + i * lh, { size: fs }));
      const sy = y + 16 + lh + desc.length * lh;
      if (P) stats.forEach((t, i) => gfx.text(t, px + 16, sy + i * lh, { size: fs, color: PAL.good }));
      else gfx.text(stats.join('   '), px + 16, sy, { size: fs, color: PAL.good });
    } else if (this.step === 3) {
      const m = this.monthMenu;
      let y = P ? 40 : 20;
      gfx.text('WHEN DO YOU LEAVE?', cx, y, { size: 12, head: true, align: 'center', color: PAL.hi });
      gfx.text('The season shapes the whole trip.', cx, y + 20, { size: fs, align: 'center', color: PAL.dim });
      const mi = this.monthMenu.sel;
      if (P) {
        m.size = 20; m.lh = 32;
        const hint = gfx.wrap(SEASON_HINT[mi], W - 60, fs);
        const hy = y + 52;
        const hh = 20 + lh + hint.length * lh;
        gfx.panel(12, hy, W - 24, hh);
        gfx.text(MONTHS[mi] + ' 2026', 30, hy + 12, { size: fs, color: PAL.hi });
        hint.forEach((l, i) => gfx.text(l, 30, hy + 12 + lh + i * lh, { size: fs }));
        const my = hy + hh + 12;
        gfx.panel(12, my, W - 24, 12 * m.lh + 16);
        m.x = 40; m.w = W - 80; m.y = my + 8;
        m.draw();
      } else {
        m.size = 16; m.lh = 17;
        const ox = Math.round((W - 422) / 2);
        gfx.panel(ox, 56, 180, 220);
        m.x = ox + 20; m.w = 150; m.y = 62;
        m.draw();
        gfx.panel(ox + 192, 56, 230, 220);
        gfx.text(MONTHS[mi] + ' 2026', ox + 206, 70, { size: 16, color: PAL.hi });
        gfx.wrap(SEASON_HINT[mi], 200, 16).forEach((l, i) => gfx.text(l, ox + 206, 94 + i * 18));
      }
    }
  },
}));
