import { gfx, PAL, W, H, ui } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { Menu, Typewriter, continueHint, drawPortrait, bar } from '../engine/ui.js';
import { drawScene, drawArt, drawFull } from '../engine/art.js';
import { assets } from '../engine/assets.js';

// Where the 480x200 location art sits: top on landscape, a bit lower on tall portrait screens.
export function artY() { return 0; } // art sits flush at the top on every screen shape
export function drawLocationArt(id, t) {
  const img = assets.get('scenes/' + id);
  const y = artY();
  gfx.rect(0, 0, W, H, PAL.ink); // plain dark below the art (no stretched/blurred art)
  if (img) drawFull(img, Math.round((W - 480) / 2), y, { extendY: false });
  else drawArt(id, y, t);
  return y;
}
import { game } from '../game/game.js';
import { NODES } from '../data/route.js';
import { MEMBER } from '../data/party.js';
import { showResult, runResultFn } from './message.js';
import { commonItems, checkGameOver } from './common.js';
import { saveGame, getReviews } from '../game/save.js';
import * as TALKMOD from '../data/talk.js';

const TALK = TALKMOD.TALK || {};
const REVIEWS = TALKMOD.REVIEWS || {};

// Arrival at a node: big scene + blurb, then the stop menu.
game.register('arrive', () => ({
  enter() {
    const s = game.state;
    this.t = 0;
    this.n = s.nodeData;
    this.tw = null;
    audio.playMusic(this.n.kind === 'end' ? 'victory' : this.n.kind === 'pass' || this.n.kind === 'ferry' ? 'tension' : this.n.kind === 'town' || this.n.kind === 'casino' ? 'town' : 'landmark');
    s.log(`Arrived at ${this.n.name}.`);
    audio.sfx('ding');
  },
  ensureTw() {
    const w = ui.portrait ? W - 48 : W - 40, fs = ui.fs;
    if (!this.tw || this.twW !== w || this.twF !== fs) {
      const shown = this.tw ? this.tw.shown : 0;
      this.tw = new Typewriter(this.n.blurb, w, fs, 85);
      this.tw.shown = Math.min(shown, this.tw.total);
      this.twW = w; this.twF = fs;
    }
  },
  update(dt) {
    this.t += dt;
    this.ensureTw();
    this.tw.update(dt);
    if (input.anyKey()) {
      if (!this.tw.done) { this.tw.finish(); return; }
      const k = this.n.kind;
      if (k === 'end') game.go('ending');
      else if (k === 'pass' || k === 'ferry') game.go('crossing');
      else game.go('stop');
    }
  },
  draw() {
    const s = game.state;
    this.ensureTw();
    const P = ui.portrait;
    const ay = drawLocationArt(s.node, this.t);
    // name banner slides in
    const k = Math.min(1, this.t * 2.5);
    const bw = Math.min(W - 20, 360);
    const bx = W / 2 - bw / 2;
    const by = ay + 8 - (1 - k) * 40;
    gfx.alpha(0.85, () => gfx.rect(bx, by, bw, 30, '#1b1424'));
    gfx.strokeRect(bx, by, bw, 30, PAL.edge);
    gfx.text(this.n.name.toUpperCase(), W / 2, by + 9, { size: 12, head: true, align: 'center', color: PAL.hi });
    const py = ay + 196;
    const x0 = P ? 24 : 20;
    if (P) {
      // sized text card, then the crew, then a big continue button
      gfx.rect(0, py, W, H - py, '#1b1424');
      const th = 50 + this.tw.lines.length * (ui.lh - 1) + 16;
      gfx.panel(10, py + 8, W - 20, th);
      gfx.text(s.dateStr() + (this.n.elev ? `  ·  Elev. ${this.n.elev.toLocaleString()} ft` : ''), x0, py + 20, { size: 18, color: PAL.dim });
      this.tw.draw(x0, py + 48, PAL.text, ui.lh - 1);
      let y = py + th + 24;
      const size = 60, gap = Math.floor((W - 48 - 5 * size) / 4);
      const by = H - 76;
      if (y + size + 30 < by - 10) {
        gfx.text('THE CREW', W / 2, y, { size: 10, head: true, align: 'center', color: PAL.hi });
        y += 20;
        s.members.forEach((m, i) => {
          const x = 24 + i * (size + gap);
          drawPortrait(m.id, x, y, m.gone ? 'neutral' : m.ailment || m.health < 40 ? 'sick' : 'happy', { size, gone: m.gone });
          if (!m.gone) bar(x, y + size + 5, size, 6, m.health / 100);
          gfx.text(MEMBER[m.id].name, x + size / 2, y + size + 14, { size: 16, align: 'center', color: PAL.dim });
        });
      }
      gfx.rect(24, by, W - 48, 52, this.tw.done ? '#2a6a3a' : '#3d2b52');
      gfx.strokeRect(24, by, W - 48, 52, this.tw.done ? PAL.good : PAL.edgeLo);
      gfx.text(this.tw.done ? 'TAP TO CONTINUE ▸' : '…', W / 2, by + 20, { size: 10, head: true, align: 'center', color: PAL.hi });
    } else {
      gfx.panel(0, py, W, H - py);
      gfx.text(s.dateStr() + (this.n.elev ? `  ·  Elev. ${this.n.elev.toLocaleString()} ft` : ''), x0, py + 10, { size: 14, color: PAL.dim });
      this.tw.draw(x0, py + 28, PAL.text, ui.lh - 1);
      if (this.tw.done) continueHint(this.t);
    }
  },
}));

game.register('stop', () => ({
  enter() {
    this.t = 0;
    this.build();
    saveGame(game.state);
  },
  resume() { this.build(); checkGameOver(); },
  build() {
    const s = game.state;
    const n = s.nodeData;
    this.n = n;
    const items = [{ label: 'Continue on the road', onPick: () => this.leave() }];
    if (n.kind === 'town' || n.kind === 'casino' || n.kind === 'start') {
      items.push({ label: 'Buy gas & supplies', onPick: () => game.push('store', {}) });
    }
    if (n.kind === 'landmark' && !s.flags['look_' + s.node]) {
      items.push({ label: 'Look around', onPick: () => this.lookAround() });
    }
    if (n.kind === 'casino') items.push({ label: 'Try the slot machines', onPick: () => game.push('casino') });
    if (n.kind === 'town' || n.kind === 'casino') items.push({ label: 'Pick up a side gig (1 day)', onPick: () => this.gig() });
    items.push({ label: 'Talk to people', onPick: () => this.talk() });
    if (n.kind === 'town' || n.kind === 'casino') items.push({ label: `Dump the black tank ($15) [${Math.round(s.tank)}%]`, disabled: s.tank < 5, onPick: () => this.dump() });
    items.push({ label: 'Read online reviews', onPick: () => this.reviews() });
    items.push(...commonItems(s));
    const sel = this.menu ? this.menu.sel : 0;
    this.menu = new Menu(items, { x: 30, y: 70, w: 250, sel: Math.min(sel, items.length - 1), size: 16, lh: 16, maxRows: 13 });
    this.lw = 0;
  },
  leave() {
    const s = game.state;
    const n = s.nodeData;
    if (n.next.length > 1) { game.push('fork'); return; }
    s.startLeg(0);
    saveGame(s);
    audio.sfx('engine');
    game.go('travel');
  },
  lookAround() {
    const s = game.state;
    s.flags['look_' + s.node] = 1;
    runResultFn((s) => {
      s.addVibes(6);
      s.healAll(2);
      const who = s.randomPresent();
      const lines = [
        'You stretch your legs and take about 200 photos. Bela poses for none of them.',
        'Everyone piles out to look. Even the cats peer out the windshield, deeply unimpressed but present.',
        'You buy a magnet for the RV fridge. The fridge is now 40% magnets.',
        'A stranger offers to take a family photo. Bela sneezes in it. It\'s perfect.',
      ];
      return { title: this.n.name, tone: 'good', who: who ? who.id : null, mood: 'happy', text: lines[Math.floor(Math.random() * lines.length)] };
    }, () => this.build());
  },
  talk() {
    const s = game.state;
    const lines = TALK[s.node] || [{ who: 'a friendly local', text: 'Safe travels out there. Watch the weather on the passes and keep that tank full.' }];
    const k = 'talk_' + s.node;
    const i = (s.flags[k] || 0) % lines.length;
    s.flags[k] = i + 1;
    if (i === 0) s.addVibes(2);
    const l = lines[i];
    showResult({ title: 'You talk to ' + l.who, text: '"' + l.text.replace(/^"|"$/g, '') + '"' });
  },
  gig() {
    const GIGS = [
      ['a cafe with fast WiFi', 'A long day of laptops, oat-milk lattes and one very confusing client call.'],
      ['a farmers market', 'You sell hand-drawn stickers of Bela from a folding table. Bela poses for photos. Business booms.'],
      ['a moving company', 'You spend the day carrying other people\'s couches. Ironic, given the circumstances.'],
      ['the RV park office', 'You help the park host fix their website in exchange for cash and a lifetime of gratitude.'],
      ['a pet-sitting app', 'You walk six dogs at once. Bela is jealous of every single one.'],
    ];
    const [where, text] = GIGS[Math.floor(Math.random() * GIGS.length)];
    runResultFn((s) => {
      const pay = 140 + Math.floor(Math.random() * 160) + (s.alive('caity') && s.alive('joe') ? 60 : 0);
      s.earn(pay);
      const notes = s.endDay({ stayed: true });
      s.addVibes(-2);
      return { title: 'Side Gig: ' + where, tone: 'good', text: text + (notes.length ? ' ' + notes.filter((x) => !x.departure).map((x) => x.text).join(' ') : '') };
    }, () => this.build());
  },
  dump() {
    const s = game.state;
    runResultFn((s) => {
      s.spend(15); s.tank = 0; s.addVibes(4);
      return { title: 'Dump Station', tone: 'good', who: 'joe', mood: 'sick', text: 'Joe dons the sacred rubber gloves and performs the ritual of the stinky slinky. The tank is empty. Joe will never be the same.' };
    }, () => this.build());
  },
  reviews() {
    const s = game.state;
    const canned = REVIEWS[s.node] || ['★★★★☆ "Nice place to stop. Clean-ish bathrooms." — Traveler'];
    const mine = (getReviews()[s.node] || []).map((r) => r);
    showResult({ title: 'Reviews: ' + this.n.name.split(',')[0], text: [...canned, ...mine].join('\n\n') });
  },
  layout() {
    const P = ui.portrait, m = this.menu;
    if (P) {
      const ay = artY();
      m.size = 20; m.lh = 33;
      m.x = 40; m.w = W - 64;
      m.y = ay + 200 + 44;
      const avail = H - m.y - 190;
      m.maxRows = Math.max(5, Math.floor(avail / m.lh));
    } else {
      m.size = 16; m.lh = 16; m.maxRows = 13;
      m.x = 30; m.w = Math.min(330, W - 210); m.y = 70;
    }
    this.lw = W; this.lhH = H;
  },
  update(dt) { this.t += dt; if (this.lw !== W || this.lhH !== H) this.layout(); this.menu.update(dt); },
  statusLines(s) {
    return [
      ['Date', s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })],
      ['Weather', s.weather[0].toUpperCase() + s.weather.slice(1)],
      ['Cash', '$' + s.money],
      ['Gas', Math.round(s.inv.gas) + ' gal'],
      ['Food', Math.round(s.inv.food) + ' meals'],
      ['RV', s.rv + '%'],
      ['Vibes', s.vibesWord()],
      ['To go', s.milesToGo() + ' mi'],
    ];
  },
  crew(s, x0, y, size, gap, nameSize) {
    s.members.forEach((m, i) => {
      const x = x0 + i * (size + gap);
      drawPortrait(m.id, x, y, m.gone ? 'neutral' : m.ailment || m.health < 40 ? 'sick' : m.health > 80 ? 'happy' : 'neutral', { size, gone: m.gone });
      if (!m.gone) bar(x, y + size + 4, size, 5, m.health / 100);
      gfx.text(MEMBER[m.id].name.slice(0, size < 40 ? 5 : 9), x + size / 2, y + size + 11, { size: nameSize, align: 'center', color: PAL.dim });
    });
  },
  draw() {
    const s = game.state;
    if (this.lw !== W || this.lhH !== H) this.layout();
    const P = ui.portrait, m = this.menu;
    const ay = drawLocationArt(s.node, this.t);
    if (P) {
      // name banner over the art, menu below, status + crew at the bottom
      gfx.alpha(0.85, () => gfx.rect(0, ay + 168, W, 32, '#1b1424'));
      gfx.text(this.n.name, W / 2, ay + 172, { size: 22, align: 'center', color: PAL.hi });
      const rows = Math.min(m.maxRows, m.items.length);
      const py = ay + 206;
      gfx.panel(10, py, W - 20, rows * m.lh + 34);
      m.draw();
      let y = py + rows * m.lh + 44;
      const lines = this.statusLines(s);
      const colW = (W - 20) / 2;
      gfx.panel(10, y, W - 20, H - y - 8);
      lines.forEach(([k, v], i) => {
        const cx = 28 + (i % 2) * colW, cy = y + 12 + Math.floor(i / 2) * 22;
        gfx.text(k, cx, cy, { size: 18, color: PAL.dim });
        gfx.text(v, cx + colW - 36, cy, { size: 18, align: 'right' });
      });
      const cy = y + 12 + 4 * 22 + 8;
      if (cy + 70 < H) this.crew(s, 28, cy, 52, Math.floor((W - 56 - 5 * 52) / 4), 16);
      return;
    }
    gfx.alpha(0.35, () => gfx.rect(0, 0, W, H, '#000'));
    const rows = Math.min(m.maxRows, m.items.length);
    gfx.panel(14, 40, m.w + 30, rows * 16 + 44);
    gfx.text(this.n.name, 14 + (m.w + 30) / 2, 52, { size: 16, align: 'center', color: PAL.hi });
    m.draw();
    const sx = W - 176;
    gfx.panel(sx, 40, 162, 150);
    this.statusLines(s).forEach(([k, v], i) => {
      gfx.text(k, sx + 12, 52 + i * 16, { size: 14, color: PAL.dim });
      gfx.text(v, sx + 152, 52 + i * 16, { size: 14, align: 'right' });
    });
    gfx.panel(sx, 196, 162, 92);
    gfx.text('THE CREW', sx + 81, 205, { size: 8, head: true, align: 'center', color: PAL.hi });
    this.crew(s, sx + 10, 222, 26, 3, 12);
  },
}));

// Fork in the road.
game.register('fork', () => ({
  enter() {
    const s = game.state;
    this.n = s.nodeData;
    this.t = 0;
    this.menu = new Menu(this.n.next.map((l, i) => ({
      label: l.label, onPick: () => {
        s.startLeg(i);
        s.log(`Chose ${l.label}.`);
        saveGame(s);
        audio.sfx('engine');
        game.go('travel');
      },
    })).concat([{ label: 'Not yet', onPick: () => game.pop() }]), { x: 60, y: 150, w: 360, onBack: () => game.pop() });
  },
  update(dt) { this.t += dt; this.menu.update(dt); },
  draw() {
    const P = ui.portrait, fs = ui.fs, lh = ui.lh;
    gfx.alpha(0.6, () => gfx.rect(0, 0, W, H, '#000'));
    const pw = P ? W - 20 : Math.min(440, W - 40), px = (W - pw) / 2;
    const fork = gfx.wrap(this.n.fork, pw - 40, fs);
    const l = this.n.next[this.menu.sel];
    const note = l ? gfx.wrap(`${l.label}: ${l.miles} mi to ${NODES[l.to].name}. ${l.note}`, pw - 50, fs) : [];
    const m = this.menu;
    m.size = fs; m.lh = ui.mlh; m.x = px + 24; m.w = pw - 48;
    const h = 40 + fork.length * lh + 10 + m.items.length * m.lh + 16 + note.length * lh + 16;
    const py = Math.max(6, (H - h) / 2);
    gfx.panel(px, py, pw, h);
    gfx.text('A FORK IN THE ROAD', W / 2, py + 14, { size: P ? 12 : 10, head: true, align: 'center', color: PAL.hi });
    fork.forEach((t, i) => gfx.text(t, px + 20, py + 36 + i * lh, { size: fs }));
    m.y = py + 36 + fork.length * lh + 10;
    m.draw();
    const ny = m.y + m.items.length * m.lh + 8;
    gfx.rect(px + 20, ny, pw - 40, 1, PAL.edgeLo);
    note.forEach((t, i) => gfx.text(t, px + 24, ny + 8 + i * lh, { size: fs, color: PAL.dim }));
  },
}));
