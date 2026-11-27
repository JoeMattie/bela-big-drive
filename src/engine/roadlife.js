// Ambient life on the travel screen: passing cars, green freeway signs,
// state welcome signs and crew chatter bubbles.
import { gfx, PAL, W } from './gfx.js';
import { drawPortrait } from './ui.js';
import { NODES, milesToEnd } from '../data/route.js';
import { CHATTER } from '../data/chatter.js';
import { MEMBER } from '../data/party.js';

const CAR_COLORS = ['#c83a3a', '#3a6ac8', '#e8e8e8', '#2a2a2a', '#d8b040', '#4a9a5a', '#8a4ac8', '#b0b8c0'];
const rnd = (a, b) => a + Math.random() * (b - a);

export class RoadLife {
  constructor() {
    this.cars = [];
    this.props = [];
    this.bubble = null;
    this.carT = rnd(1, 3);
    this.signT = rnd(2, 4);
    this.chatT = rnd(2.5, 4.5);
    this.lastLat = null;
  }

  update(dt, moving, s, done = null) {
    const v = moving ? 90 : 0;
    // cars: oncoming (far lane, fast, leftward) and overtaking (near lane)
    this.carT -= dt;
    const busy = s.biome() === 'city' ? 0.35 : 1;
    if (this.carT <= 0) {
      this.carT = rnd(1.2, 3.5) * busy;
      const truck = Math.random() < 0.25;
      if (Math.random() < 0.65) this.cars.push({ lane: 0, x: W + 20, v: -(v + rnd(140, 200)), c: CAR_COLORS[Math.floor(Math.random() * 8)], truck });
      else if (moving) this.cars.push({ lane: 1, x: -60, v: rnd(30, 60), c: CAR_COLORS[Math.floor(Math.random() * 8)], truck: false });
    }
    for (const c of this.cars) c.x += (c.lane === 0 ? c.v : c.v) * dt;
    this.cars = this.cars.filter((c) => c.x > -120 && c.x < W + 80);

    // signs
    if (moving) {
      this.signT -= dt;
      if (this.signT <= 0 && s.leg) {
        this.signT = rnd(7, 11);
        const to = NODES[s.leg.to];
        const left = Math.max(1, Math.round(s.leg.miles - (done ?? s.leg.done)));
        const port = Math.round(left + milesToEnd(s.leg.to));
        const lines = [[to.name.split(',')[0].replace(/^The /, '').toUpperCase(), left]];
        if (s.leg.to !== 'portland') lines.push(['PORTLAND', port]);
        this.props.push({ kind: 'sign', x: W + 20, lines });
      }
      // state line
      const lat = s.lat();
      if (this.lastLat !== null && this.lastLat < 42 && lat >= 41.9 && !s.flags.welcomeOR) {
        s.flags.welcomeOR = 1;
        this.props.push({ kind: 'welcome', x: W + 20 });
      }
      this.lastLat = lat;
    }
    for (const p of this.props) p.x -= v * dt;
    this.props = this.props.filter((p) => p.x > -140);

    // chatter
    if (this.bubble) {
      this.bubble.t -= dt;
      if (this.bubble.t <= 0) this.bubble = null;
    } else if (moving) {
      this.chatT -= dt;
      if (this.chatT <= 0) {
        this.chatT = rnd(4, 7);
        const pool = CHATTER.filter(([id, , cond]) => s.alive(id) && (!cond || cond(s)));
        // prefer conditional (situational) lines
        const sit = pool.filter((p) => p[2]);
        const src = sit.length && Math.random() < 0.6 ? sit : pool;
        const recent = this.recent || [];
        const choices = src.filter((p) => !recent.includes(p[1]));
        const pick = (choices.length ? choices : src)[Math.floor(Math.random() * (choices.length || src.length))];
        if (pick) {
          this.bubble = { id: pick[0], text: pick[1], t: 4.2 };
          this.recent = [...recent, pick[1]].slice(-12);
        }
      }
    }
  }

  drawBehind(roadY) {
    // signs stand on the far shoulder
    for (const p of this.props) {
      if (p.kind === 'sign') this.sign(p.x, roadY, p.lines);
      if (p.kind === 'welcome') this.welcome(p.x, roadY);
    }
    for (const c of this.cars) if (c.lane === 0) this.car(c.x, roadY + 2, c.c, true, c.truck);
  }

  drawFront(roadY) {
    for (const c of this.cars) if (c.lane === 1) this.car(c.x, roadY + 14, c.c, false, false);
  }

  car(x, y, col, left, truck) {
    x = Math.round(x);
    if (truck) {
      // semi
      gfx.rect(x, y - 16, 46, 16, '#d8d8d8');
      gfx.rect(x, y - 16, 46, 2, '#f0f0f0');
      gfx.rect(x + (left ? -14 : 46), y - 12, 14, 12, col);
      gfx.rect(x + (left ? -12 : 50), y - 10, 6, 4, '#9fd3ea');
      for (const wx of [6, 14, 36]) gfx.rect(x + wx, y - 2, 6, 5, '#1a1a1a');
      gfx.rect(x + (left ? -10 : 52), y - 2, 6, 5, '#1a1a1a');
      return;
    }
    gfx.rect(x, y - 8, 30, 7, col);
    gfx.rect(x + 6, y - 13, 16, 6, col);
    gfx.rect(x + 8, y - 12, 5, 4, '#9fd3ea');
    gfx.rect(x + 15, y - 12, 5, 4, '#9fd3ea');
    gfx.rect(x + (left ? 0 : 28), y - 7, 2, 2, left ? '#fff6b0' : '#ff4040');
    gfx.rect(x + 4, y - 2, 6, 5, '#1a1a1a');
    gfx.rect(x + 20, y - 2, 6, 5, '#1a1a1a');
  }

  sign(x, roadY, lines) {
    x = Math.round(x);
    const w = 104, h = 10 + lines.length * 13;
    const top = roadY - 30 - h;
    gfx.rect(x + 12, top + h, 3, 30, '#6a6a6a');
    gfx.rect(x + w - 15, top + h, 3, 30, '#6a6a6a');
    gfx.rect(x, top, w, h, '#f0f0f0');
    gfx.rect(x + 1, top + 1, w - 2, h - 2, '#1f7a3a');
    gfx.rect(x + 2, top + 2, w - 4, 1, '#f0f0f0');
    lines.forEach(([name, mi], i) => {
      gfx.text(name.length > 11 ? name.slice(0, 10) + '.' : name, x + 5, top + 3 + i * 13, { size: 14, color: '#ffffff', shadow: false });
      gfx.text(String(mi), x + w - 5, top + 3 + i * 13, { size: 14, color: '#ffffff', shadow: false, align: 'right' });
    });
  }

  welcome(x, roadY) {
    x = Math.round(x);
    const top = roadY - 62;
    gfx.rect(x + 10, top + 34, 3, 28, '#5a4030');
    gfx.rect(x + 87, top + 34, 3, 28, '#5a4030');
    gfx.rect(x, top, 100, 36, '#3a2a1a');
    gfx.rect(x + 2, top + 2, 96, 32, '#e8d9a8');
    gfx.text('WELCOME TO', x + 50, top + 4, { size: 12, color: '#3a5a2a', shadow: false, align: 'center' });
    gfx.text('OREGON', x + 50, top + 14, { size: 10, head: true, color: '#1d4f2c', shadow: false, align: 'center' });
    // little fir
    gfx.rect(x + 86, top + 6, 6, 4, '#2a6a3a'); gfx.rect(x + 84, top + 10, 10, 5, '#2a6a3a'); gfx.rect(x + 88, top + 15, 2, 4, '#5a4030');
  }

  drawBubble(rvX, rvY) {
    const b = this.bubble;
    if (!b) return;
    const a = Math.min(1, b.t * 3, (4.2 - b.t) * 6);
    const txt = b.text;
    const w = Math.min(230, gfx.measure(txt, 14) + 30);
    const lines = gfx.wrap(txt, w - 28, 14);
    const h = 8 + lines.length * 13;
    const x = Math.round(Math.max(4, Math.min(W - 4 - w, rvX + 40 - w / 2)));
    const y = Math.round(rvY - h - 10);
    gfx.alpha(a, () => {
      gfx.rect(x - 1, y - 1, w + 2, h + 2, '#1b1424');
      gfx.rect(x, y, w, h, '#fffaf0');
      gfx.rect(rvX + 60, y + h, 6, 3, '#fffaf0');
      gfx.rect(rvX + 62, y + h + 3, 3, 3, '#fffaf0');
      drawPortrait(b.id, x + 3, y + Math.round((h - 18) / 2), 'neutral', { size: 18, frame: false });
      lines.forEach((l, i) => gfx.text(l, x + 24, y + 4 + i * 13, { size: 14, color: '#2a1f30', shadow: false }));
    });
  }
}
