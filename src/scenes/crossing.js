// Mountain passes (Grapevine, Siskiyou) and the Wheatland Ferry.
import { gfx, PAL, W, H, ui } from '../engine/gfx.js';
import { audio } from '../engine/audio.js';
import { Menu } from '../engine/ui.js';
import { drawScene, Weather } from '../engine/art.js';
import { drawLocationArt, artY } from './stop.js';
import { game } from '../game/game.js';
import { chance } from '../game/state.js';
import { runResultFn } from './message.js';
import { checkGameOver } from './common.js';

function passConditions(s) {
  const w = s.weather;
  if (w === 'snow') return chance(0.35) ? 'closed' : 'chains';
  if (w === 'storm' && s.season() === 'winter') return 'chains';
  if (w === 'windy') return 'wind';
  if (w === 'fog') return 'fog';
  return 'clear';
}
const COND_TEXT = {
  closed: 'ROAD CLOSED. CHP has shut the pass for snow and ice. Trucks are lined up for miles.',
  chains: 'CHAIN CONTROLS IN EFFECT. Snow is falling. Chains required on all vehicles over 10,000 lbs (that\'s you).',
  wind: 'HIGH WIND WARNING. Gusts to 65 mph. High-profile vehicles advised against travel.',
  fog: 'Dense fog on the grade. Visibility under 100 feet.',
  clear: 'The road is clear. It\'s just a long, steep climb and a longer, steeper descent.',
};

game.register('crossing', () => ({
  enter() {
    const s = game.state;
    this.t = 0;
    this.n = s.nodeData;
    this.ferry = this.n.kind === 'ferry';
    this.wx = new Weather();
    if (this.ferry) {
      this.cond = (s.season() === 'winter' && chance(0.4)) || s.weather === 'storm' ? 'highwater' : s.weather === 'fog' ? 'fog' : 'open';
    } else {
      this.cond = passConditions(s);
    }
    audio.playMusic('tension');
    this.build();
  },
  build() {
    const s = game.state;
    const items = this.ferry ? this.ferryItems(s) : this.passItems(s);
    this.menu = new Menu(items, { x: 36, y: 0, w: 408, size: 16, lh: 18 });
    this.menu.y = 300 - 14 - items.length * 18;
  },
  done(text, tone = 'good') {
    // a crossing result ends at the stop menu on the other side
    const fn = typeof text === 'function' ? text : () => ({ title: 'Made It!', tone, text });
    runResultFn(fn, () => { if (!checkGameOver()) game.go('stop'); });
  },
  passItems(s) {
    const name = this.n.name;
    const c = this.cond;
    const items = [];
    if (c === 'clear' || c === 'fog' || c === 'wind') {
      items.push({ label: c === 'clear' ? 'Climb the pass' : 'Cross carefully', onPick: () => this.cross() });
      items.push({ label: 'Take the wheel yourself (minigame)', onPick: () => this.drive(c === 'clear' ? 'traffic' : 'debris') });
      if (c !== 'clear') items.push({ label: 'Wait a day for better conditions', onPick: () => this.wait() });
    } else if (c === 'chains') {
      items.push({ label: 'Chain up and drive it (minigame)', disabled: !s.has('chains'), onPick: () => this.drive('snow', true) });
      items.push({ label: 'Chain up and creep over slowly', disabled: !s.has('chains'), onPick: () => this.creep() });
      items.push({ label: 'Try it without chains', onPick: () => this.noChains() });
      items.push({ label: 'Wait for the snow to stop', onPick: () => this.wait() });
    } else {
      items.push({ label: 'Wait for the pass to reopen', onPick: () => this.wait() });
      items.push({ label: 'Sneak around the closure', onPick: () => this.sneak() });
    }
    return items;
  },
  ferryItems(s) {
    const items = [];
    if (this.cond === 'open' || this.cond === 'fog') {
      items.push({ label: 'Take the ferry ($12, oversize vehicle)', disabled: s.money < 12, onPick: () => this.ferryRide() });
    } else {
      items.push({ label: 'Wait for the river to go down', onPick: () => this.wait() });
    }
    items.push({ label: 'Drive around via the Salem bridges (+45 mi)', onPick: () => this.around() });
    items.push({ label: 'Ford the Willamette in the RV', onPick: () => this.ford() });
    return items;
  },
  cross() {
    const c = this.cond;
    this.done((s) => {
      if (c === 'wind' && chance(0.3)) { s.damageRV(8); s.addVibes(-6); return { title: 'Blown Around', tone: 'bad', text: 'A gust shoves the Georgetown halfway into the next lane. A trucker lays on his horn. You make it, but the awning is now flapping like a flag.' }; }
      if (s.pace === 'floorit' && chance(0.35)) { s.damageRV(10); return { title: 'Hot Brakes', tone: 'bad', text: 'Going down the grade too fast, the brakes start to SMOKE. You pull into the runaway-truck-ramp turnout to let them cool, deeply ashamed.' }; }
      s.addVibes(6); s.healAll(2);
      return { title: 'Over the Top!', tone: 'good', who: 'caity', mood: 'happy', text: `The V10 roars up the grade at a heroic 38 mph. At the summit, everyone cheers. Bela howls. ${this.n.name} conquered!` };
    });
  },
  drive(theme, chained = false) {
    const go = () => game.push('freeway', {
      theme,
      onFinish: (o) => {
        game.pop();
        this.done((s) => {
          if (chained) { s.loseDays(0); }
          const hits = o ? o.hits || 0 : 1;
          if (o && o.gas) s.add('gas', o.gas * 2);
          if (hits === 0) { s.addVibes(10); return { title: 'Flawless!', tone: 'good', who: 'caity', mood: 'happy', text: 'Not a scratch. The family gives a standing ovation (while seat-belted).' }; }
          s.damageRV(hits * 5); s.addVibes(-hits);
          return { title: 'Made It… Mostly', tone: hits > 2 ? 'bad' : 'neutral', text: `You make it over with ${hits} bump${hits > 1 ? 's' : ''} and scrape${hits > 1 ? 's' : ''}. The Georgetown has new "character."` };
        });
      },
    });
    if (game.has('freeway')) go();
    else this.cross();
  },
  creep() {
    this.done((s) => {
      s.addVibes(-4);
      s.loseDays(0);
      return { title: 'Slow & Steady', tone: 'good', text: 'Twenty minutes of kneeling in slush to put on the chains. Two hours over the pass at 25 mph. Your hands are frozen claws but you made it.' };
    });
  },
  noChains() {
    this.done((s) => {
      if (chance(0.5)) {
        s.stats.tickets++; s.spend(150); s.loseDays(1);
        return { title: 'Turned Around', tone: 'bad', text: 'A CHP officer at the chain checkpoint takes one look at your bare tires and waves you back down the hill. Plus a $150 citation. You wait a day for the snow to stop.' };
      }
      if (chance(0.5)) { s.damageRV(25); s.hurtAll(8); s.addVibes(-12); return { title: 'Slide!', tone: 'bad', text: 'On the descent the RV slides sideways in slow motion, kisses the guardrail, and stops. Nobody\'s hurt badly, but the whole side is crunched and Pookah has not forgiven you.' }; }
      s.addVibes(-5);
      return { title: 'Lucky', tone: 'neutral', text: 'You slip, you slide, you pray, you make it. Never again.' };
    });
  },
  wait() {
    const s = game.state;
    const notes = s.endDay({ stayed: true });
    const c = this.cond;
    this.cond = this.ferry ? (chance(0.6) ? 'open' : this.cond) : passConditions(s);
    if (c === 'closed' && this.cond === 'closed' && chance(0.5)) this.cond = 'chains';
    runResultFn(() => ({ title: 'You Wait', tone: 'neutral', text: `A day passes. ${notes.map((n) => n.text).join(' ')} Conditions now: ${this.ferry ? (this.cond === 'open' ? 'the ferry is running.' : 'still closed for high water.') : COND_TEXT[this.cond]}` }), () => { if (!checkGameOver()) this.build(); });
  },
  sneak() {
    this.done((s) => {
      s.add('gas', -18); s.loseDays(1); s.addVibes(-6);
      if (chance(0.4)) { s.damageRV(12); return { title: 'Bad Idea', tone: 'bad', text: 'Google Maps sends you up a forest service road. It is not plowed. You get stuck, get unstuck, and lose a whole day and a lot of dignity.' }; }
      return { title: 'Long Way Around', tone: 'neutral', text: 'You take a long detour on back roads. It costs a day and a lot of gas, but you\'re past the closure.' };
    });
  },
  ferryRide() {
    this.done((s) => {
      s.spend(12);
      audio.sfx('splash');
      s.addVibes(8);
      if (this.cond === 'fog' && chance(0.3)) return { title: 'Ferry in the Fog', tone: 'neutral', text: 'The ferry glides into a wall of fog. For four minutes the world is just water and the creak of the cable. Then: Oregon. Spooky. Beautiful.' };
      if (s.alive('bela') && chance(0.5)) return { title: 'All Aboard!', tone: 'good', who: 'bela', mood: 'happy', text: 'The deckhand waves the Georgetown on with about 4 inches to spare. Bela stands at the windshield the whole crossing like the captain of a great ship.' };
      return { title: 'All Aboard!', tone: 'good', text: 'The little cable ferry groans under the RV\'s weight but carries you smoothly across the Willamette, just like it has since 1844.' };
    });
  },
  around() {
    this.done((s) => {
      s.add('gas', -7); s.loseDays(1);
      return { title: 'The Long Way', tone: 'neutral', text: 'You backtrack to Salem, cross the Willamette on a big boring bridge, and wind your way back north through hazelnut orchards.' };
    });
  },
  ford() {
    this.done((s) => {
      s.addVibes(3);
      return { title: 'Absolutely Not', tone: 'neutral', who: 'caity', text: 'Caity looks at the river. Then at the 14,000-lb motorhome. Then at you. "This is a 1999 Georgetown, not a covered wagon." The idea is vetoed. You take the ferry.', choices: [{ label: 'Fine. Take the ferry ($12)', run: (s) => { s.spend(12); audio.sfx('splash'); return { title: 'Across!', tone: 'good', text: 'The ferry carries you across. Nobody mentions fording again.' }; } }] };
    });
  },
  update(dt) {
    this.t += dt;
    const w = game.state.weather;
    this.wx.update(dt, w);
    this.menu.update(dt);
  },
  draw() {
    const s = game.state;
    const P = ui.portrait, fs = ui.fs, lh = ui.lh;
    const ay = drawLocationArt(s.node, this.t);
    this.wx.draw(s.weather, ay + 200);
    const cond = this.ferry
      ? (this.cond === 'highwater' ? 'FERRY CLOSED: high water on the Willamette. The river is brown and fast.' : this.cond === 'fog' ? 'The ferry is running, slowly, in thick fog.' : 'The ferry is running. Oversize vehicles: $12. Capacity: 9 cars, or one Georgetown.')
      : COND_TEXT[this.cond];
    const bad = ['closed', 'chains', 'wind', 'highwater'].includes(this.cond);
    const pw = P ? W - 20 : Math.min(448, W - 32), px = (W - pw) / 2;
    const lines = gfx.wrap(cond, pw - 40, fs);
    const m = this.menu;
    m.size = fs; m.lh = ui.mlh; m.x = px + 20; m.w = pw - 40;
    const h = 30 + lines.length * lh + (this.ferry ? 4 : lh + 4) + m.items.length * m.lh + 14;
    const py = P ? ay + 206 : H - h - 4;
    gfx.panel(px, py, pw, h);
    let y = py + 12;
    gfx.text(this.n.name.toUpperCase(), W / 2, y, { size: P ? 12 : 10, head: true, align: 'center', color: PAL.hi });
    y += 18;
    lines.forEach((l, i) => gfx.text(l, px + 20, y + i * lh, { size: fs, color: bad ? PAL.warn : PAL.text }));
    y += lines.length * lh;
    if (!this.ferry) { gfx.text(`Chains: ${s.has('chains') ? 'yes ✓' : 'none!'}   Pace: ${s.pace === 'floorit' ? 'Floor It' : s.pace === 'mosey' ? 'Moseying' : 'Cruising'}   RV: ${s.rv}%`, px + 20, y, { size: P ? 18 : 14, color: PAL.dim }); y += lh; }
    m.y = y + 4;
    m.draw();
  },
}));
