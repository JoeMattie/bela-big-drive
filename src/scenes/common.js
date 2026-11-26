// Shared overlays: situation menu, setting pickers, supplies/status, rest.
import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { Menu, drawPortrait, drawIcon, bar, continueHint } from '../engine/ui.js';
import { drawScene } from '../engine/art.js';
import { game } from '../game/game.js';
import { PACES, SNACKS, SLEEPS, chance } from '../game/state.js';
import { ITEMS } from '../data/items.js';
import { MEMBER } from '../data/party.js';
import { showResult, runResultFn } from './message.js';
import { saveGame, clearSave } from '../game/save.js';

export function checkGameOver() {
  const s = game.state;
  if (s.flags.over) return true;
  let reason = null;
  if (!s.humans().length) reason = 'nohumans';
  else if (s.flags.dead) reason = 'rv';
  if (reason) {
    s.flags.over = true;
    clearSave();
    game.go('gameover', { reason });
    return true;
  }
  return false;
}

// The options every stop / pause shares.
export function commonItems(s, { traveling = false } = {}) {
  const forageOK = ['oregon', 'forest', 'oregon_coast'].includes(s.biome()) && ['summer', 'fall'].includes(s.season());
  return [
    { label: 'Check supplies & crew', onPick: () => game.push('supplies') },
    { label: 'Look at the map', onPick: () => game.push('map') },
    { label: `Change pace (${PACES[s.pace].name})`, onPick: () => game.push('choose', { kind: 'pace' }) },
    { label: `Change food (${SNACKS[s.snacks].name})`, onPick: () => game.push('choose', { kind: 'snacks' }) },
    { label: `Change overnights (${SLEEPS[s.sleep].name})`, onPick: () => game.push('choose', { kind: 'sleep' }) },
    { label: 'Stop to rest', onPick: () => game.push('rest') },
    {
      label: forageOK ? 'Pick blackberries' : 'Forage (nothing ripe here)', disabled: !forageOK,
      onPick: () => forage(),
    },
  ];
}

export function forage() {
  const s = game.state;
  const who = s.alive('caity') && (!s.alive('joe') || Math.random() < 0.5) ? 'caity' : 'joe';
  const done = (o) => {
    const berries = o ? o.berries || 0 : 0;
    runResultFn((s) => {
      s.loseDays(0);
      s.add('food', Math.round(berries / 2));
      s.stats.berries += berries;
      s.addVibes(berries > 10 ? 5 : 1);
      if (o && o.poisonOak) s.sicken(who, 'poison oak');
      if (o && o.stung) s.hurt(who, 6);
      return {
        title: 'Blackberry Haul', tone: berries > 0 ? 'good' : 'neutral', who, mood: berries > 10 ? 'happy' : 'neutral',
        text: berries > 0 ? `You picked ${berries} blackberries! Invasive Himalayan blackberries: Oregon's most delicious weed. That's about ${Math.round(berries / 2)} meals of cobbler.` : 'You come back with scratches and zero berries.',
      };
    });
  };
  if (game.has('forage')) game.push('forage', { who, onFinish: (o) => { game.pop(); done(o); } });
  else done({ berries: 8 + Math.floor(Math.random() * 20) });
}

// Pause menu while traveling.
game.register('situation', () => ({
  enter() {
    const s = game.state;
    this.t = 0;
    this.menu = new Menu([
      { label: 'Continue on the road', onPick: () => game.pop() },
      ...commonItems(s, { traveling: true }),
      { label: 'Save & quit to title', onPick: () => { saveGame(s); game.go('title'); } },
    ], { x: 120, y: 64, w: 250, onBack: () => game.pop() });
  },
  resume() { this.enter(); },
  update(dt) { this.t += dt; this.menu.update(dt); },
  draw() {
    gfx.alpha(0.5, () => gfx.rect(0, 0, 480, 300, '#000'));
    gfx.panel(96, 30, 288, 236);
    gfx.text('WHAT NOW?', 240, 42, { size: 10, head: true, align: 'center', color: PAL.hi });
    this.menu.draw();
  },
}));

// Setting picker for pace/snacks/sleep.
const KINDS = {
  pace: { title: 'CHANGE PACE', table: PACES, field: 'pace' },
  snacks: { title: 'CHANGE FOOD', table: SNACKS, field: 'snacks' },
  sleep: { title: 'OVERNIGHTS', table: SLEEPS, field: 'sleep' },
};
game.register('choose', () => ({
  enter({ kind }) {
    const k = KINDS[kind];
    this.k = k;
    const s = game.state;
    const ids = Object.keys(k.table);
    this.ids = ids;
    this.menu = new Menu(ids.map((id) => ({
      label: k.table[id].name + (s[k.field] === id ? '  ✓' : ''),
      onPick: () => { s[k.field] = id; game.pop(); },
    })), { x: 70, y: 80, w: 340, sel: ids.indexOf(s[k.field]), onBack: () => game.pop() });
  },
  update(dt) { this.menu.update(dt); },
  draw() {
    gfx.alpha(0.5, () => gfx.rect(0, 0, 480, 300, '#000'));
    gfx.panel(50, 40, 380, 200);
    gfx.text(this.k.title, 240, 54, { size: 10, head: true, align: 'center', color: PAL.hi });
    this.menu.draw();
    const d = this.k.table[this.ids[this.menu.sel]];
    gfx.rect(66, 146, 348, 1, PAL.edgeLo);
    gfx.wrap(d.desc, 340, 16).forEach((l, i) => gfx.text(l, 70, 156 + i * 18, { color: PAL.dim }));
  },
}));

// Supplies & crew status.
game.register('supplies', () => ({
  enter() { this.t = 0; },
  update(dt) {
    this.t += dt;
    if (this.t > 0.2 && input.anyKey()) { audio.sfx('back'); game.pop(); }
  },
  draw() {
    const s = game.state;
    gfx.rect(0, 0, 480, 300, PAL.night);
    gfx.panel(4, 4, 472, 292);
    gfx.text('SUPPLIES & CREW', 240, 14, { size: 10, head: true, align: 'center', color: PAL.hi });
    // crew
    s.members.forEach((m, i) => {
      const x = 16, y = 32 + i * 46;
      drawPortrait(m.id, x, y, m.gone ? 'neutral' : m.ailment || m.health < 40 ? 'sick' : m.health > 80 ? 'happy' : 'neutral', { size: 40, gone: m.gone });
      gfx.text(MEMBER[m.id].name, x + 48, y, { size: 16, color: PAL.hi });
      if (m.gone) { gfx.text('Left the trip', x + 48, y + 16, { size: 14, color: PAL.mute }); return; }
      bar(x + 48, y + 18, 80, 7, m.health / 100);
      gfx.text(s.healthWord(m.health), x + 134, y + 14, { size: 14, color: PAL.dim });
      if (m.ailment) gfx.text('has ' + m.ailment, x + 48, y + 26, { size: 14, color: PAL.warn });
    });
    // supplies
    const X = 228;
    gfx.text(`Cash: $${s.money}`, X, 32, { size: 16, color: PAL.good });
    gfx.text(`RV: ${s.rv}%   Black tank: ${Math.round(s.tank)}%   Vibes: ${s.vibesWord()}`, X, 48, { size: 14, color: PAL.dim });
    ITEMS.forEach((it, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = X + col * 122, y = 68 + row * 25;
      drawIcon(it.icon, x, y);
      const v = Math.round(s.inv[it.id] * 10) / 10;
      gfx.text(`${Math.round(v)} ${it.unit}`, x + 20, y - 2, { size: 14, color: v <= 0 ? PAL.bad : PAL.text });
      gfx.text(it.name, x + 20, y + 9, { size: 12, color: PAL.mute });
    });
    continueHint(this.t, 240, 282);
  },
}));

// Rest for N days.
game.register('rest', () => ({
  enter() {
    this.t = 0;
    this.phase = 'ask';
    this.menu = new Menu([1, 2, 3].map((n) => ({ label: `Rest ${n} day${n > 1 ? 's' : ''}`, onPick: () => this.rest(n) })).concat([{ label: 'Never mind', onPick: () => game.pop() }]), { x: 160, y: 100, w: 160, onBack: () => game.pop() });
  },
  rest(n) {
    const s = game.state;
    const snap = s.snapshot();
    const notes = [];
    for (let i = 0; i < n; i++) notes.push(...s.endDay({ stayed: true }));
    s.addVibes(3 * n);
    this.phase = 'show';
    audio.playMusic('campfire');
    this.after = () => {
      game.pop();
      showResult({
        title: 'Rest & Recharge', tone: 'good', text: `You spend ${n} day${n > 1 ? 's' : ''} resting. ${s.alive('bela') ? 'Bela sleeps 22 hours a day. ' : ''}${s.cats().length ? 'The cats finally come out from under the bed. ' : ''}` + notes.filter((x) => !x.departure).map((x) => x.text).join(' '),
      }, () => checkGameOver(), snap);
    };
  },
  update(dt) {
    this.t += dt;
    if (this.phase === 'ask') this.menu.update(dt);
    else if (this.t > 0.3 && input.anyKey()) this.after();
  },
  draw() {
    const s = game.state;
    if (this.phase === 'ask') {
      gfx.alpha(0.5, () => gfx.rect(0, 0, 480, 300, '#000'));
      gfx.panel(130, 60, 220, 130);
      gfx.text('REST HOW LONG?', 240, 74, { size: 10, head: true, align: 'center', color: PAL.hi });
      this.menu.draw();
    } else {
      gfx.rect(0, 0, 480, 300, PAL.night);
      drawScene(s.sleep === 'walmart' ? 'walmart_night' : 'campsite_night', 0, 0, 480, 200, this.t);
      gfx.panel(0, 200, 480, 100);
      gfx.text('Resting…', 240, 220, { size: 14, head: true, align: 'center', color: PAL.hi });
      gfx.text(s.dateStr(), 240, 246, { size: 16, align: 'center' });
      continueHint(this.t, 240, 274);
    }
  },
}));
