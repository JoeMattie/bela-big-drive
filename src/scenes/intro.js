import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { Menu, Typewriter, drawPortrait, continueHint } from '../engine/ui.js';
import { drawScene } from '../engine/art.js';
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
    this.tw = new Typewriter(STORY, 420, 16, 80);
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
      this.tw.update(dt);
      if (input.anyKey()) { if (!this.tw.done) this.tw.finish(); else this.next(); }
    } else if (this.step === 1) {
      if (input.any('ArrowRight', 'd')) { this.focus = (this.focus + 1) % 5; audio.sfx('select'); }
      if (input.any('ArrowLeft', 'a')) { this.focus = (this.focus + 4) % 5; audio.sfx('select'); }
      for (let i = 0; i < 5; i++) {
        if (input.clickIn(20 + i * 90, 60, 80, 90)) { if (this.focus === i) this.next(); else { this.focus = i; audio.sfx('select'); } input.consumeClicks(); }
      }
      if (input.confirm() || input.clickIn(0, 250, 480, 50)) { audio.sfx('confirm'); this.next(); }
    } else if (this.step === 2) {
      this.diffMenu.update(dt);
    } else if (this.step === 3) {
      this.monthMenu.update(dt);
    }
  },
  draw() {
    gfx.rect(0, 0, 480, 300, PAL.night);
    if (this.step === 0) {
      drawScene('san_diego', 0, 0, 480, 200, this.t);
      gfx.panel(16, 64, 448, 230, { body: 'rgba(46,33,64,0.94)' });
      this.tw.draw(30, 76, PAL.text, 18);
      if (this.tw.done) continueHint(this.t, 240, 278);
    } else if (this.step === 1) {
      gfx.text('MEET THE CREW', 240, 14, { size: 14, head: true, align: 'center', color: PAL.hi });
      PARTY.forEach((p, i) => {
        const x = 28 + i * 90, y = 50;
        const on = i === this.focus;
        drawPortrait(p.id, x, y + (on ? -4 : 0), on ? 'happy' : 'neutral', { bg: on ? '#5a4370' : '#3a2e4f' });
        gfx.text(p.name, x + 32, y + 72, { size: 16, align: 'center', color: on ? PAL.hi : PAL.text });
      });
      const p = PARTY[this.focus];
      gfx.panel(16, 150, 448, 120);
      gfx.text(`${p.name} — ${p.title}`, 30, 162, { size: 16, color: PAL.hi });
      gfx.wrap(p.bio, 420, 16).forEach((l, i) => gfx.text(l, 30, 182 + i * 18));
      gfx.text('★ ' + p.perk, 30, 244, { size: 16, color: PAL.good });
      continueHint(this.t, 240, 280, input.lastPointerType === 'touch' ? 'Tap a face · tap here to continue' : '◂ ▸ to browse · ENTER to continue');
    } else if (this.step === 2) {
      gfx.text('HOW IS THE RV DOING?', 240, 20, { size: 12, head: true, align: 'center', color: PAL.hi });
      gfx.text('Choose your difficulty. Harder = less money, more points.', 240, 42, { size: 16, align: 'center', color: PAL.dim });
      gfx.panel(30, 58, 420, 70);
      this.diffMenu.draw();
      const d = DIFFICULTIES[this.diffMenu.sel];
      gfx.panel(30, 140, 420, 110);
      gfx.text(d.name, 46, 152, { size: 16, color: PAL.hi });
      gfx.wrap(d.desc, 390, 16).forEach((l, i) => gfx.text(l, 46, 172 + i * 18));
      gfx.text(`Starting cash: $${d.money}   RV condition: ${d.rv}%   Score ×${d.mult}`, 46, 226, { size: 16, color: PAL.good });
    } else if (this.step === 3) {
      gfx.text('WHEN DO YOU LEAVE?', 240, 20, { size: 12, head: true, align: 'center', color: PAL.hi });
      gfx.text('The season shapes the whole trip.', 240, 40, { size: 16, align: 'center', color: PAL.dim });
      gfx.panel(30, 56, 180, 220);
      this.monthMenu.draw();
      gfx.panel(222, 56, 230, 220);
      const m = this.monthMenu.sel;
      gfx.text(MONTHS[m] + ' 2026', 236, 70, { size: 16, color: PAL.hi });
      gfx.wrap(SEASON_HINT[m], 200, 16).forEach((l, i) => gfx.text(l, 236, 94 + i * 18));
    }
  },
}));
