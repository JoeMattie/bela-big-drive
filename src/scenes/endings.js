import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { assets } from '../engine/assets.js';
import { Menu, Typewriter, continueHint, drawPortrait } from '../engine/ui.js';
import { drawScene } from '../engine/art.js';
import { game } from '../game/game.js';
import { MEMBER } from '../data/party.js';
import { NODES } from '../data/route.js';
import { addHOF, getHOF, clearSave, addReview } from '../game/save.js';

function rankFor(score) {
  if (score >= 9000) return 'RV Legend';
  if (score >= 6000) return 'Road Warrior';
  if (score >= 3500) return 'Weekend Warrior';
  return 'Greenhorn';
}

// ---------------- Victory ----------------
game.register('ending', () => ({
  enter() {
    const s = game.state;
    clearSave();
    this.t = 0;
    this.phase = 0;
    this.sc = s.score();
    this.shown = 0;
    this.parts = [];
    for (let i = 0; i < 60; i++) this.parts.push(this.spark());
    const here = s.present().map((m) => MEMBER[m.id].name);
    const gone = s.members.filter((m) => m.gone).map((m) => MEMBER[m.id].name);
    const text = `After ${s.day} days and ${Math.round(s.milesTotal)} miles, the 1999 Georgetown wheezes up to the curb of your new home in PORTLAND, OREGON. It is, of course, raining.\n\n${here.join(', ')} ${here.length > 1 ? 'pile' : 'piles'} out onto the wet sidewalk.${gone.length ? ` ${gone.join(' & ')} ${gone.length > 1 ? 'are' : 'is'} already waiting on the porch, having taken the easy way.` : ' Everyone made it the whole way. Every single one.'} Bela immediately finds a puddle. The cats inspect the new house and declare it acceptable.\n\nWelcome home.`;
    this.tw = new Typewriter(text, 430, 16, 70);
    audio.playMusic('victory');
    this.rank = rankFor(this.sc.total);
  },
  spark() {
    return { x: 40 + Math.random() * 400, y: 200, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 90, c: ['#ff5ea8', '#ffd75e', '#5ef0ff', '#7ee07a', '#fff'][Math.floor(Math.random() * 5)], life: Math.random() * 2 };
  },
  update(dt) {
    this.t += dt;
    for (const p of this.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; p.life -= dt;
      if (p.life <= 0) Object.assign(p, this.spark(), { life: 2 + Math.random() });
    }
    if (this.phase === 0) {
      this.tw.update(dt);
      if (input.anyKey()) { if (!this.tw.done) this.tw.finish(); else { this.phase = 1; this.t = 0; } }
    } else if (this.phase === 1) {
      this.shown = Math.min(this.sc.parts.length + 2, this.shown + dt * 4);
      if (Math.floor(this.shown) !== this.lastShown) { this.lastShown = Math.floor(this.shown); audio.sfx('cash'); }
      if (this.t > 0.4 && input.anyKey()) {
        if (this.shown < this.sc.parts.length + 2) this.shown = this.sc.parts.length + 2;
        else { this.phase = 2; this.t = 0; }
      }
    } else if (this.phase === 2) {
      if (this.t > 0.4 && input.anyKey()) {
        const s = game.state;
        const names = s.present().map((m) => MEMBER[m.id].name);
        const entry = { name: names.length >= 4 ? 'The Whole Georgetown Crew' : names.slice(0, 3).join(', '), score: this.sc.total, rank: this.rank, date: new Date().toLocaleDateString() };
        const pos = addHOF(entry);
        game.go('title');
        game.push('halloffame', { highlight: pos });
      }
    }
  },
  draw() {
    const s = game.state;
    drawScene('ending', 0, 0, 480, 200, this.t);
    for (const p of this.parts) if (p.y < 200) gfx.rect(p.x, p.y, 2, 2, p.c);
    gfx.text('YOU MADE IT!', 240, 10 + Math.sin(this.t * 3) * 2, { size: 18, head: true, align: 'center', color: PAL.hi, shadowColor: '#8a2442' });
    if (this.phase === 0) {
      gfx.panel(10, 100, 460, 196);
      this.tw.draw(26, 112, PAL.text, 17);
      if (this.tw.done) continueHint(this.t, 240, 280);
    } else if (this.phase === 1) {
      gfx.panel(40, 40, 400, 256);
      gfx.text('FINAL SCORE', 240, 52, { size: 10, head: true, align: 'center', color: PAL.hi });
      this.sc.parts.forEach((p, i) => {
        if (i >= this.shown) return;
        gfx.text(p.label, 60, 70 + i * 15, { size: 16 });
        gfx.text(String(p.pts), 420, 70 + i * 15, { size: 16, align: 'right', color: PAL.good });
      });
      const n = this.sc.parts.length;
      if (this.shown >= n + 1) {
        gfx.rect(60, 72 + n * 15, 360, 1, PAL.edge);
        gfx.text(`Subtotal ${this.sc.subtotal}  ×${this.sc.mult} (${s.diffDef.name})`, 60, 75 + n * 15, { size: 16, color: PAL.dim });
      }
      if (this.shown >= n + 2) {
        gfx.text(`TOTAL: ${this.sc.total}`, 240, 96 + n * 15, { size: 14, head: true, align: 'center', color: PAL.hi });
        gfx.text(`Rank: ${this.rank}`, 240, 114 + n * 15, { size: 16, align: 'center', color: PAL.teal });
      }
    } else {
      gfx.panel(20, 40, 440, 256);
      gfx.text('TRIP SCRAPBOOK', 240, 52, { size: 10, head: true, align: 'center', color: PAL.hi });
      const st = s.stats;
      const facts = [
        `${s.day} days · ${Math.round(s.milesTotal)} miles · ${s.visited.length} stops`,
        `${st.flats} blowouts · ${st.breakdowns} breakdowns · ${st.tickets} tickets`,
        `${st.berries} blackberries picked · ${st.catsCaught} cats recaptured`,
        st.casino ? `Casino: ${st.casino >= 0 ? 'won' : 'lost'} $${Math.abs(st.casino)}` : 'Never gambled. Wise.',
      ];
      facts.forEach((f, i) => gfx.text(f, 240, 70 + i * 17, { size: 16, align: 'center', color: PAL.text }));
      const hl = s.journal.filter((j) => !j.text.startsWith('Arrived')).slice(-6);
      gfx.text('Highlights:', 40, 146, { size: 16, color: PAL.dim });
      hl.forEach((j, i) => gfx.text(`${j.date}: ${j.text}`.slice(0, 64), 40, 164 + i * 17, { size: 14 }));
      s.members.forEach((m, i) => drawPortrait(m.id, 92 + i * 60, 238 - 0, m.gone ? 'neutral' : 'happy', { size: 32, gone: m.gone }));
      continueHint(this.t, 240, 280, 'Press any key to enter the Hall of Fame');
    }
  },
}));

// ---------------- Game over ----------------
const REVIEW_CHOICES = [
  '★☆☆☆☆ "Would not break down here again."',
  '★★☆☆☆ "The RV was fine until it wasn\'t."',
  '★★★☆☆ "Beautiful views from the tow truck."',
  '★☆☆☆☆ "Bring more toilet paper than you think."',
  '★★★★★ "Best worst trip of our lives."',
];
game.register('gameover', () => ({
  enter({ reason }) {
    const s = game.state;
    this.t = 0;
    this.phase = 0;
    const text = reason === 'nohumans'
      ? 'With both humans gone ahead by plane and train, there\'s nobody left to drive the Georgetown. It sits at a truck stop with a "FOR SALE — RUNS (MOSTLY)" sign in the window. Bela, Muskrat and Pookah get a very nice pet-transport van to Portland.'
      : `The Georgetown has made its final journey, ${s.whereName()}. A tow truck hauls the old girl away. The family finishes the trip in a rented minivan with two yowling cats and a bull terrier who keeps looking back.`;
    this.tw = new Typewriter(text + '\n\nYou did not make it to Portland in the RV.', 430, 16, 70);
    this.menu = new Menu(REVIEW_CHOICES.map((r) => ({ label: r, onPick: () => this.review(r) })).concat([{ label: 'Skip', onPick: () => game.go('title') }]), { x: 30, y: 120, w: 420, size: 14, lh: 18, numbered: true });
    audio.playMusic('gameover');
  },
  review(r) {
    const s = game.state;
    const node = s.leg ? (s.leg.done < s.leg.miles / 2 ? s.leg.from : s.leg.to) : s.node;
    addReview(node, `${r} — the Georgetown crew, ${s.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
    game.go('title');
  },
  update(dt) {
    this.t += dt;
    if (this.phase === 0) {
      this.tw.update(dt);
      if (input.anyKey()) { if (!this.tw.done) this.tw.finish(); else { this.phase = 1; input.consumeKeys(); input.consumeClicks(); } }
    } else this.menu.update(dt);
  },
  draw() {
    drawScene('gameover', 0, 0, 480, 200, this.t);
    gfx.text('END OF THE ROAD', 240, 12, { size: 16, head: true, align: 'center', color: PAL.bad, shadowColor: '#000' });
    if (this.phase === 0) {
      gfx.panel(10, 110, 460, 186);
      this.tw.draw(26, 122, PAL.text, 17);
      if (this.tw.done) continueHint(this.t, 240, 280);
    } else {
      gfx.panel(14, 74, 452, 222);
      gfx.text('Leave a review for future travelers?', 240, 88, { size: 16, align: 'center', color: PAL.hi });
      gfx.text('(it will appear at this spot in your future trips)', 240, 102, { size: 14, align: 'center', color: PAL.dim });
      this.menu.draw();
    }
  },
}));

// ---------------- Hall of fame ----------------
game.register('halloffame', () => ({
  enter({ highlight = -1 } = {}) { this.t = 0; this.hl = highlight; this.list = getHOF(); },
  update(dt) { this.t += dt; if (this.t > 0.3 && input.anyKey()) { audio.sfx('back'); game.pop(); } },
  draw() {
    gfx.rect(0, 0, 480, 300, PAL.night);
    gfx.panel(30, 14, 420, 272);
    gfx.text('TOP ROAD TRIPPERS', 240, 28, { size: 12, head: true, align: 'center', color: PAL.hi });
    gfx.text('Name', 60, 54, { size: 14, color: PAL.mute });
    gfx.text('Points', 330, 54, { size: 14, color: PAL.mute, align: 'right' });
    gfx.text('Rating', 350, 54, { size: 14, color: PAL.mute });
    this.list.forEach((e, i) => {
      const on = i === this.hl && Math.floor(this.t * 3) % 2 === 0;
      const c = on ? PAL.hi : PAL.text;
      gfx.text(`${i + 1}. ${e.name}`, 60, 72 + i * 19, { size: 16, color: c });
      gfx.text(String(e.score), 330, 72 + i * 19, { size: 16, color: c, align: 'right' });
      gfx.text(e.rank, 350, 72 + i * 19, { size: 16, color: on ? PAL.hi : PAL.dim });
    });
    continueHint(this.t, 240, 266, 'Any key to return');
  },
}));

// ---------------- Learn about the road ----------------
const PAGES = [
  ['THE GOAL', 'Drive the family\'s 1999 Forest River Georgetown from San Diego to Portland, Oregon — about 1,100 miles — with everyone healthy and happy, the RV in one piece, and cash in your pocket. The faster and healthier you arrive, the bigger your score.'],
  ['SUPPLIES', 'The V10 drinks gas at 6–8 mpg; refill in towns (Oregon gas is cheaper!). Humans need groceries, Bela needs kibble, the cats need cat food AND litter. Spare tires and parts kits save you from expensive breakdowns. Tire chains are required on snowy passes in winter. Never, ever run out of toilet paper.'],
  ['PACE, FOOD & OVERNIGHTS', 'Floor It covers ground fast but wears out the RV and the crew. Gas Station Snacks save groceries but hurt health. RV parks cost money but empty the black tank and refill water; parking lots and boondocking are free but come with risks. Bela guards the RV at night.'],
  ['THE ROAD', 'You\'ll hit two forks: the I-5 or the coast. Mountain passes — the Grapevine and the Siskiyou Summit — can close for snow and wind. In Oregon the Wheatland Ferry crosses the Willamette. Talk to people at every stop: they know what\'s ahead.'],
  ['VIBES & HEALTH', 'Everyone has health; the whole crew shares Vibes. Low vibes make everyone sicker. Rest, sightseeing, good food, stars and Pookah purrs help. If someone\'s health hits zero they leave the trip (nobody dies — they just take a plane). If both humans leave, the trip is over.'],
  ['CONTROLS', 'Keyboard: arrows/numbers to choose, ENTER to confirm, ESC to go back. Mouse/touch: tap anything. While driving, press any key or tap to stop and size up the situation. Minigames: arrows/WASD + SPACE, or tap/drag.'],
];
game.register('learn', () => ({
  enter() { this.t = 0; this.page = 0; },
  update(dt) {
    this.t += dt;
    if (input.any('ArrowLeft', 'a') && this.page > 0) { this.page--; audio.sfx('select'); return; }
    if (input.back()) { game.pop(); return; }
    if (this.t > 0.2 && input.anyKey()) {
      audio.sfx('select');
      this.page++;
      if (this.page >= PAGES.length) game.pop();
    }
  },
  draw() {
    gfx.rect(0, 0, 480, 300, PAL.night);
    gfx.panel(24, 20, 432, 260);
    const [title, body] = PAGES[Math.min(this.page, PAGES.length - 1)];
    gfx.text(title, 240, 36, { size: 12, head: true, align: 'center', color: PAL.hi });
    gfx.wrap(body, 390, 16).forEach((l, i) => gfx.text(l, 44, 64 + i * 19));
    gfx.text(`${this.page + 1} / ${PAGES.length}`, 240, 246, { size: 14, align: 'center', color: PAL.dim });
    continueHint(this.t, 240, 262, 'Any key for next page');
  },
}));

// ---------------- Departure cinematic ----------------
game.register('departure', () => ({
  enter() {
    const s = game.state;
    this.t = 0;
    this.tw = new Typewriter(`${s.dateStr()}. The Georgetown is packed to the ceiling. Bela has claimed the passenger seat. Muskrat is hiding in the shower. Pookah is already asleep on the dashboard.\n\nCaity turns the key. The V10 coughs, rumbles, and roars to life. Next stop: Portland.`, 430, 16, 70);
    audio.sfx('engine');
    audio.playMusic('title');
  },
  update(dt) {
    this.t += dt;
    this.tw.update(dt);
    if (input.anyKey()) {
      if (!this.tw.done) this.tw.finish();
      else {
        const s = game.state;
        s.startLeg(0);
        s.log('Left San Diego.');
        game.go('travel');
      }
    }
  },
  draw() {
    drawScene('san_diego', 0, 0, 480, 200, this.t);
    gfx.panel(10, 170, 460, 126);
    this.tw.draw(26, 182, PAL.text, 17);
    if (this.tw.done) continueHint(this.t, 240, 280);
  },
}));
