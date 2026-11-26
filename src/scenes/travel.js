import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { drawPortrait, bar, drawIcon } from '../engine/ui.js';
import { drawTravelView, drawRV, Weather } from '../engine/art.js';
import { game } from '../game/game.js';
import { NODES } from '../data/route.js';
import { EVENTS } from '../data/events.js';
import { EVENTS_EXTRA } from '../data/events_extra.js';
import { MEMBER } from '../data/party.js';
import { WEATHER, chance } from '../game/state.js';
import { showResult, runResultFn } from './message.js';
import { saveGame } from '../game/save.js';
import { checkGameOver } from './common.js';

const DAY_LEN = new URLSearchParams(location.search).has("fast") ? 0.4 : 3.4; // seconds per in-game day of driving

export function pickEvent(s, cat) {
  const pool = [...EVENTS, ...(EVENTS_EXTRA || [])].filter((e) => (e.cat || 'general') === cat && (!e.once || !s.seen[e.id]) && (!e.when || e.when(s)));
  const weights = pool.map((e) => Math.max(0, typeof e.weight === 'function' ? e.weight(s) : (e.weight ?? 1)));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  let r = Math.random() * sum;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

game.register('travel', () => ({
  enter() {
    this.t = 0;
    this.scroll = 0;
    this.dayT = 0;
    this.queue = [];
    this.busy = false;
    this.wx = new Weather();
    this.startDay();
    this.playMusic();
  },
  resume() { this.playMusic(); },
  playMusic() {
    const s = game.state;
    audio.playMusic(['rain', 'storm', 'snow', 'fog'].includes(s.weather) ? 'travel_rain' : 'travel');
  },
  startDay() {
    const s = game.state;
    this.todStart = 1 - (s.dayLeft > 0 ? s.dayLeft : 1);
    this.fromDone = s.leg.done;
    this.res = s.driveDay();
    this.dayT = 0;
    this.speed = this.res.miles > 0 ? 1 : 0;
  },
  // Process the end of a driving day: build a queue of results to show.
  endOfDay() {
    const s = game.state;
    const q = [];
    const r = this.res;
    const outOfGas = r.notes.some((n) => n.outOfGas);
    if (outOfGas) q.push(() => this.outOfGas());
    // something happens on the road (scaled by how much of the day we drove)
    if (r.miles > 0) {
      const k = Math.min(1, r.frac * 1.15);
      if (chance(s.breakdownRisk() * k)) {
        const e = pickEvent(s, 'rv');
        if (e) q.push((done) => { s.seen[e.id] = 1; s.stats.breakdowns++; runResultFn((st) => e.run(st), done); });
      } else if (chance(s.eventChance() * k)) {
        const e = pickEvent(s, 'general');
        if (e) q.push((done) => { s.seen[e.id] = 1; s.stats.events++; runResultFn((st) => e.run(st), done); });
      }
    }
    if (r.dayOver && !outOfGas) {
      q.push((done) => { const notes = s.endDay(); const sub = []; this.pushNotes(sub, notes); this.queue.unshift(...sub); done(); });
    }
    q.push((done) => { if (s.rv <= 0) this.totalled(done); else done(); });
    if (r.arrived) q.push(() => this.arrive());
    this.queue = q;
    this.runQueue();
  },
  pushNotes(q, notes) {
    const s = game.state;
    if (!notes.length) return;
    const dep = notes.filter((n) => n.departure);
    const rest = notes.filter((n) => !n.departure);
    if (rest.length) {
      q.push((done) => showResult({ title: s.dateStr(), tone: rest.some((n) => n.bad) ? 'bad' : 'good', text: rest.map((n) => '• ' + n.text).join('\n'), shake: false }, done));
    }
    for (const d of dep) {
      q.push((done) => showResult({ title: 'A Departure', tone: 'bad', who: d.departure, mood: 'sick', text: d.text }, done));
    }
  },
  runQueue() {
    if (checkGameOver()) return;
    const next = this.queue.shift();
    if (!next) {
      this.busy = false;
      saveGame(game.state);
      if (this.arriving) return;
      this.startDay();
      this.playMusic();
      return;
    }
    this.busy = true;
    next(() => this.runQueue());
  },
  arrive() {
    const s = game.state;
    s.node = s.leg.to;
    s.leg = null;
    s.visited.push(s.node);
    s.addVibes(4);
    this.arriving = true;
    saveGame(s);
    game.go('arrive');
  },
  outOfGas() {
    const s = game.state;
    const price = Math.round(s.gasPrice() * 10 * 1.6);
    showResult({
      title: 'OUT OF GAS', tone: 'bad', who: 'caity', mood: 'sick',
      text: 'The Georgetown rolls to a silent stop on the shoulder. The fuel gauge has been lying to you all along.',
      choices: [
        { label: `Walk to a gas station for 10 gal ($${price}, lose a day)`, when: (s) => s.money >= price, run: (s) => { s.spend(price); s.add('gas', 10); s.loseDays(1); s.hurt('joe', 6); return { text: 'Joe hikes 4 miles each way with a borrowed gas can. He has thoughts about the fuel gauge.', tone: 'neutral' }; } },
        { label: 'Call roadside assistance ($180)', when: (s) => s.money >= 180, run: (s) => { s.spend(180); s.add('gas', 8); return { text: 'A truck arrives with 8 gallons and a smirk.' }; } },
        { label: 'Beg passing motorists', run: (s) => { if (chance(0.5)) { s.add('gas', 5); s.loseDays(1); return { text: 'A kind trucker siphons you 5 gallons and won\'t take a cent.', tone: 'good' }; } s.loseDays(1); s.addVibes(-10); s.add('gas', 3); return { text: 'After a long day, a farmer gives you 3 gallons of tractor gas. It smells weird.', tone: 'bad' }; } },
      ],
    }, () => this.runQueue());
    return true;
  },
  totalled(done) {
    const s = game.state;
    const cost = 900;
    showResult({
      title: 'THE GEORGETOWN IS DYING', tone: 'bad', who: 'joe', mood: 'sick',
      text: 'With a horrible grinding shriek, the RV gives up entirely. A tow truck hauls you to the nearest garage. The mechanic whistles. "This is gonna be a big one."',
      choices: [
        { label: `Pay for major repairs ($${cost})`, when: (s) => s.money >= cost, run: (s) => { s.spend(cost); s.rv = 55; s.loseDays(2); return { text: 'Two days and a new transmission later, the Georgetown lives again.', tone: 'good' }; } },
        { label: 'Do what you can with what you have', when: (s) => s.money < cost, run: (s) => { s.flags.dead = true; return null; } },
      ],
    }, done);
  },
  update(dt) {
    this.t += dt;
    const s = game.state;
    this.wx.update(dt, s.weather);
    if (this.busy || this.arriving) return;
    // open the situation menu
    if (input.anyKey()) {
      input.consumeKeys(); input.consumeClicks();
      game.push('situation', { traveling: true });
      return;
    }
    this.dayT += dt;
    this.scroll += dt * 90 * this.speed;
    const len = DAY_LEN * Math.max(0.25, this.res.frac || 1);
    const f = Math.min(1, this.dayT / len);
    this.shownDone = this.fromDone + (s.leg.done - this.fromDone) * f;
    if (this.dayT >= len) {
      this.busy = true;
      this.endOfDay();
    }
  },
  draw() {
    const s = game.state;
    const tod = Math.min(0.97, 0.05 + (this.todStart + (1 - (game.state.dayLeft ?? 0) - this.todStart) * Math.min(1, this.dayT / (DAY_LEN * Math.max(0.25, this.res.frac || 1)))) * 0.92);
    const biome = s.biome();
    const roadY = drawTravelView(biome, this.scroll, tod, s.weather, this.t, 190);
    drawRV(176, roadY - 46, this.t, { moving: !this.busy && this.speed > 0, hazard: s.rv < 30 });
    // night headlights
    if (tod > 0.8) gfx.alpha(0.25, () => gfx.rect(300, roadY - 14, 90, 12, '#fff6b0'));
    this.wx.draw(s.weather, 190);
    this.drawPanel(s);
  },
  drawPanel(s) {
    gfx.panel(0, 186, 480, 114);
    const leg = s.leg;
    const to = leg ? NODES[leg.to] : s.nodeData;
    const done = this.shownDone ?? (leg ? leg.done : 0);
    const left = leg ? Math.max(0, Math.round(leg.miles - done)) : 0;
    const L = 12, R = 250, y0 = 194, lh = 17;
    const row = (x, y, k, v, c) => { gfx.text(k, x, y, { size: 16, color: PAL.dim }); gfx.text(v, x + 74, y, { size: 16, color: c || PAL.text }); };
    row(L, y0, 'Date:', s.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    row(L, y0 + lh, 'Weather:', WEATHER[s.weather].name, ['snow', 'storm', 'smoke', 'scorching'].includes(s.weather) ? PAL.warn : PAL.text);
    row(L, y0 + lh * 2, 'Vibes:', s.vibesWord(), s.vibes < 35 ? PAL.bad : s.vibes > 70 ? PAL.good : PAL.text);
    row(L, y0 + lh * 3, 'Health:', s.healthWord(s.avgHealth()), s.avgHealth() < 40 ? PAL.bad : PAL.text);
    row(L, y0 + lh * 4, 'Pace:', { mosey: 'Moseying', cruise: 'Cruising', floorit: 'Floor It!' }[s.pace]);
    row(R, y0, 'Next:', `${to.name.split(',')[0]} (${left} mi)`, PAL.hi);
    row(R, y0 + lh, 'Traveled:', `${Math.round(s.milesTotal - (leg ? leg.done - done : 0))} mi`);
    row(R, y0 + lh * 2, 'To go:', `${Math.max(0, Math.round(s.milesToGo() + (leg ? leg.done - done : 0)))} mi to Portland`);
    // gas & food bars
    gfx.text('Gas', R, y0 + lh * 3 + 1, { size: 14, color: PAL.dim });
    bar(R + 30, y0 + lh * 3 + 4, 60, 8, s.inv.gas / 75);
    gfx.text('RV', R + 100, y0 + lh * 3 + 1, { size: 14, color: PAL.dim });
    bar(R + 120, y0 + lh * 3 + 4, 60, 8, s.rv / 100);
    // party heads
    s.members.forEach((m, i) => {
      const x = R + i * 44, y = y0 + lh * 4 + 2;
      drawPortrait(m.id, x, y, m.gone ? 'neutral' : m.ailment || m.health < 40 ? 'sick' : 'neutral', { size: 16, gone: m.gone });
      if (!m.gone) bar(x + 18, y + 6, 20, 5, m.health / 100);
    });
    const hint = input.lastPointerType === 'touch' ? 'Tap to stop & size up the situation' : 'Press ENTER to size up the situation';
    if (!this.busy && Math.floor(this.t * 1.5) % 2 === 0) gfx.text(hint, 240, 174, { size: 14, align: 'center', color: '#fff', shadowColor: '#000' });
  },
}));
