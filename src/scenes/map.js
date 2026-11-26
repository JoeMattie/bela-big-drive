import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { continueHint } from '../engine/ui.js';
import { game } from '../game/game.js';
import { NODES, COAST, END } from '../data/route.js';

const LAT0 = 32.3, LAT1 = 46.4, LON0 = -125.0, LON1 = -116.6;
const MX = 14, MY = 10, MH = 280;
const MW = Math.round(MH * ((LON1 - LON0) * Math.cos((39 * Math.PI) / 180)) / (LAT1 - LAT0));
export const proj = (lat, lon) => [MX + ((lon - LON0) / (LON1 - LON0)) * MW, MY + ((LAT1 - lat) / (LAT1 - LAT0)) * MH];

function coastLonAt(lat) {
  for (let i = 0; i < COAST.length - 1; i++) {
    const [a, b] = [COAST[i], COAST[i + 1]];
    if ((lat <= a[0] && lat >= b[0])) {
      const t = (lat - a[0]) / (b[0] - a[0] || 1);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return lat > COAST[0][0] ? COAST[0][1] : COAST[COAST.length - 1][1];
}

export function drawMap(s, t) {
  // ocean + land per scanline
  for (let y = 0; y < MH; y++) {
    const lat = LAT1 - (y / MH) * (LAT1 - LAT0);
    const cx = Math.round(proj(lat, coastLonAt(lat))[0]);
    gfx.rect(MX, MY + y, cx - MX, 1, (y >> 2) % 2 ? '#2a5a8a' : '#2d5f90');
    const landCol = lat > 42 ? '#4f7f4a' : lat > 38 ? '#7f8f4f' : '#b09a5f';
    gfx.rect(cx, MY + y, MX + MW - cx, 1, landCol);
    gfx.rect(cx, MY + y, 1, 1, '#e8d9a8');
  }
  // CA/OR border
  const [, by] = proj(42, -120);
  for (let x = proj(42, coastLonAt(42))[0]; x < MX + MW; x += 4) gfx.rect(x, by, 2, 1, '#e8e0c8');
  gfx.text('OREGON', MX + MW - 6, by - 16, { size: 14, align: 'right', color: '#e8f0d8' });
  gfx.text('CALIFORNIA', MX + MW - 6, by + 4, { size: 14, align: 'right', color: '#fff0d0' });
  gfx.text('PACIFIC', MX + 4, MY + 200, { size: 12, color: '#9fc7ef' });
  gfx.text('OCEAN', MX + 4, MY + 212, { size: 12, color: '#9fc7ef' });
  // route edges
  const visited = new Set(s.visited);
  for (const [id, n] of Object.entries(NODES)) {
    for (const l of n.next) {
      const m = NODES[l.to];
      const [x1, y1] = proj(n.lat, n.lon), [x2, y2] = proj(m.lat, m.lon);
      const traveled = visited.has(id) && (visited.has(l.to) || (s.leg && s.leg.from === id && s.leg.to === l.to));
      line(x1, y1, x2, y2, traveled ? '#ffd75e' : '#3a2a1a', traveled ? 2 : 1);
    }
  }
  // nodes
  for (const [id, n] of Object.entries(NODES)) {
    const [x, y] = proj(n.lat, n.lon);
    const v = visited.has(id);
    gfx.rect(x - 2, y - 2, 4, 4, '#1b1424');
    gfx.rect(x - 1, y - 1, 2, 2, v ? '#ffd75e' : n.kind === 'pass' ? '#ff9d94' : '#f7ecd2');
  }
  // current position
  let lat, lon;
  if (s.leg) {
    const a = NODES[s.leg.from], b = NODES[s.leg.to], f = s.leg.done / s.leg.miles;
    lat = a.lat + (b.lat - a.lat) * f; lon = a.lon + (b.lon - a.lon) * f;
  } else { lat = s.nodeData.lat; lon = s.nodeData.lon; }
  const [px, py] = proj(lat, lon);
  if (Math.floor(t * 3) % 2 === 0) {
    gfx.rect(px - 4, py - 3, 8, 6, '#ffffff');
    gfx.rect(px - 3, py - 2, 6, 2, '#2a9d8f');
  }
  const [ex, ey] = proj(NODES[END].lat, NODES[END].lon);
  gfx.text('★', ex + 3, ey - 9, { size: 14, color: PAL.hi });
}

function line(x1, y1, x2, y2, col, w = 1) {
  const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n, y = y1 + ((y2 - y1) * i) / n;
    gfx.rect(Math.round(x), Math.round(y), w, w, col);
  }
}

game.register('map', () => ({
  enter() { this.t = 0; this.hover = null; },
  update(dt) {
    this.t += dt;
    this.hover = null;
    for (const [id, n] of Object.entries(NODES)) {
      const [x, y] = proj(n.lat, n.lon);
      if (Math.abs(input.mouse.x - x) < 6 && Math.abs(input.mouse.y - y) < 6) this.hover = id;
    }
    if (this.t > 0.2 && (input.pressed.length || (input.clicks.length && !this.hover))) { audio.sfx('back'); game.pop(); }
  },
  draw() {
    const s = game.state;
    gfx.rect(0, 0, 480, 300, PAL.night);
    gfx.panel(MX - 6, MY - 6, MW + 12, MH + 12, { body: '#1b1424' });
    drawMap(s, this.t);
    const X = MX + MW + 20;
    gfx.panel(X, 10, 480 - X - 8, 280);
    gfx.text('THE ROUTE', X + (480 - X - 8) / 2, 22, { size: 10, head: true, align: 'center', color: PAL.hi });
    const info = this.hover ? NODES[this.hover] : (s.leg ? NODES[s.leg.to] : s.nodeData);
    gfx.text(this.hover ? info.name : (s.leg ? 'Heading to: ' + info.name : 'At: ' + info.name), X + 12, 40, { size: 16, color: PAL.hi });
    gfx.wrap(info.blurb, 480 - X - 34, 14).slice(0, 7).forEach((l, i) => gfx.text(l, X + 12, 60 + i * 15, { size: 14, color: PAL.dim }));
    const y = 172;
    gfx.text(`Traveled: ${Math.round(s.milesTotal)} mi`, X + 12, y, { size: 16 });
    gfx.text(`To Portland: ${s.milesToGo()} mi`, X + 12, y + 18, { size: 16 });
    gfx.text(`Days on the road: ${s.day}`, X + 12, y + 36, { size: 16 });
    gfx.text('▪ visited   ▪ pass   ★ home', X + 12, y + 60, { size: 14, color: PAL.dim });
    gfx.rect(X + 12, y + 65, 4, 4, '#ffd75e'); gfx.rect(X + 72, y + 65, 4, 4, '#ff9d94');
    continueHint(this.t, X + (480 - X - 8) / 2, 270, 'Any key to close');
  },
}));
