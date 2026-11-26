// Procedural art: skies, parallax travel view, weather, fallbacks for any
// missing pixel-art assets.
import { gfx, PAL } from './gfx.js';
import { assets } from './assets.js';

// ---------- Sky ----------
// tod: 0..1 across a day (0=dawn 0.5=noon 0.85=dusk 1=night)
const SKIES = {
  dawn: ['#2b2350', '#5a3a6e', '#b0577a', '#f08a6a', '#ffc27a'],
  day: ['#3a86d8', '#4f9be4', '#66b0ee', '#86c6f4', '#a9dbf8'],
  dusk: ['#2a1f4f', '#5b2d6b', '#a8456e', '#ec7b52', '#ffb35c'],
  night: ['#0b0a1f', '#121233', '#1a1a45', '#232457', '#2e2f66'],
  grey: ['#5d6878', '#6d7887', '#7d8895', '#8e98a3', '#9fa8b1'],
  smoke: ['#8a6a4a', '#a37a50', '#bd8c58', '#d39e60', '#e3b070'],
  fog: ['#9aa6b0', '#a9b4bd', '#b8c2c9', '#c6cfd5', '#d4dce0'],
};
export function skyColors(tod, weather) {
  let base;
  if (weather === 'smoke') base = SKIES.smoke;
  else if (weather === 'fog') base = SKIES.fog;
  else if (['rain', 'storm', 'snow', 'cloudy'].includes(weather)) base = SKIES.grey;
  else base = SKIES.day;
  let a, b, t;
  if (tod < 0.15) { a = SKIES.dawn; b = base; t = tod / 0.15; }
  else if (tod < 0.7) { a = base; b = base; t = 0; }
  else if (tod < 0.85) { a = base; b = SKIES.dusk; t = (tod - 0.7) / 0.15; }
  else { a = SKIES.dusk; b = SKIES.night; t = Math.min(1, (tod - 0.85) / 0.1); }
  return a.map((c, i) => gfx.mix(c, b[i], t));
}

export function drawSky(x, y, w, h, tod, weather, t) {
  const cols = skyColors(tod, weather);
  // 10 bands (interpolated) for a smooth-but-banded retro gradient
  const bands = [];
  for (let i = 0; i < 10; i++) {
    const f = (i / 9) * (cols.length - 1);
    const k = Math.floor(f);
    bands.push(gfx.mix(cols[k], cols[Math.min(cols.length - 1, k + 1)], f - k));
  }
  gfx.bands(x, y, w, h, bands);
  // sun / moon
  if (!['rain', 'storm', 'snow', 'fog', 'cloudy'].includes(weather)) {
    if (tod < 0.85) {
      const sx = x + w * (0.1 + 0.8 * Math.min(1, tod / 0.85));
      const sy = y + h * 0.75 - Math.sin(Math.min(1, tod / 0.85) * Math.PI) * h * 0.6;
      const col = weather === 'smoke' ? '#ff5a2a' : tod > 0.7 ? '#ffb347' : '#fff3b0';
      disc(sx, sy, 9, col);
      gfx.alpha(0.25, () => disc(sx, sy, 13, col));
    } else {
      disc(x + w * 0.75, y + 20, 6, '#f4f1d6');
      disc(x + w * 0.75 + 3, y + 18, 5, gfx.mix('#121233', '#232457', 0.5));
    }
  }
  // stars
  if (tod > 0.88) {
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97.3) % w, sy = (i * 53.7) % (h * 0.7);
      if ((Math.floor(t * 2 + i) % 7) !== 0) gfx.rect(x + sx, y + sy, 1, 1, '#fff');
    }
  }
  // clouds
  const cloudy = ['cloudy', 'rain', 'storm', 'snow'].includes(weather);
  const n = cloudy ? 7 : 3;
  for (let i = 0; i < n; i++) {
    const cx = ((i * 137 - t * (4 + i)) % (w + 120) + w + 120) % (w + 120) - 60;
    const cy = y + 10 + (i * 23) % (h * 0.45);
    cloud(x + cx, cy, 30 + (i * 17) % 30, cloudy ? (weather === 'storm' ? '#4a5260' : '#9099a4') : '#ffffff', tod);
  }
}

function disc(cx, cy, r, col) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    gfx.rect(cx - dx, cy + dy, dx * 2 + 1, 1, col);
  }
}
function cloud(x, y, w, col, tod) {
  const c = tod > 0.75 ? gfx.mix(col, '#ff9a7a', 0.4) : col;
  gfx.alpha(0.85, () => {
    gfx.rect(x, y + 4, w, 6, c);
    gfx.rect(x + w * 0.15, y, w * 0.5, 6, c);
    gfx.rect(x + w * 0.45, y + 2, w * 0.4, 4, c);
  });
}

// ---------- Procedural parallax fallback per biome ----------
const BIOME_COLORS = {
  coast: { far: '#7aa7c7', mid: '#d9c48a', near: '#5e8c3a', ground: '#c9b37a', accent: '#2d7f5e' },
  city: { far: '#8c8ca6', mid: '#6b6b80', near: '#4f5566', ground: '#8a8a7a', accent: '#d94f4f' },
  pass: { far: '#a88a5a', mid: '#c9a45e', near: '#7d7a3a', ground: '#bfa064', accent: '#56622a' },
  valley: { far: '#a9b07a', mid: '#8fa155', near: '#5c7a2e', ground: '#a89860', accent: '#3f6a2a' },
  forest: { far: '#6a7f8f', mid: '#2f5a3e', near: '#1f4430', ground: '#5c5a3a', accent: '#183a28' },
  oregon: { far: '#6f8f7a', mid: '#3f7a4a', near: '#2a6a3a', ground: '#5d7a3a', accent: '#1d4f2c' },
  oregon_coast: { far: '#5f7f9a', mid: '#3a5f4a', near: '#2a4f3a', ground: '#7a7a5a', accent: '#1a3f2f' },
  portland: { far: '#7f8faa', mid: '#55607a', near: '#3f5a4a', ground: '#6a6a5a', accent: '#2a4a3a' },
};

function ridge(x0, yBase, w, amp, freq, seed, col, offset) {
  for (let x = 0; x < w; x += 2) {
    const wx = x + offset;
    const h = amp * (0.5 + 0.3 * Math.sin((wx + seed) * freq) + 0.2 * Math.sin((wx + seed * 3) * freq * 2.7));
    gfx.rect(x0 + x, yBase - h, 2, h + 2, col);
  }
}

// Draw a horizontally-tiling layer at scroll offset.
function tile(img, scroll, y) {
  const w = img.width;
  let x = -(((scroll % w) + w) % w);
  for (; x < 480; x += w) gfx.image(img, x, y);
}

// The travel view (y from 0..viewH). scroll in px.
export function drawTravelView(biome, scroll, tod, weather, t, viewH = 190) {
  drawSky(0, 0, 480, viewH, tod, weather, t);
  const C = BIOME_COLORS[biome] || BIOME_COLORS.coast;
  const night = tod > 0.88 ? 0.55 : tod > 0.75 ? (tod - 0.75) / 0.13 * 0.4 : 0;
  const roadY = viewH - 34;
  const far = assets.get(`biomes/${biome}_far`);
  const near = assets.get(`biomes/${biome}_near`);
  if (far) tile(far, scroll * 0.15, roadY - 22 - far.height + 18);
  else ridge(0, roadY - 30, 480, 60, 0.012, biome.length * 50, C.far, scroll * 0.15);
  if (!near) {
    ridge(0, roadY - 8, 480, 30, 0.03, biome.length * 20, C.mid, scroll * 0.4);
  }
  // ground band
  gfx.rect(0, roadY - 10, 480, 10, C.ground);
  if (near) tile(near, scroll * 0.7, roadY - near.height + 2);
  else {
    // procedural roadside: poles + bushes
    for (let i = -1; i < 12; i++) {
      const px = i * 48 - ((scroll * 0.7) % 48);
      gfx.rect(px, roadY - 24, 2, 24, '#5a4030');
      gfx.rect(px + 8, roadY - 8, 14, 8, C.accent);
    }
  }
  drawRoad(roadY, scroll, viewH);
  if (night > 0) gfx.alpha(night, () => gfx.rect(0, 0, 480, viewH, '#0a0820'));
  return roadY;
}

export function drawRoad(roadY, scroll, viewH) {
  gfx.rect(0, roadY, 480, viewH - roadY, PAL.road);
  gfx.rect(0, roadY, 480, 2, '#77736a');
  gfx.rect(0, viewH - 3, 480, 3, '#55524a');
  const mid = roadY + Math.floor((viewH - roadY) / 2);
  for (let x = -((scroll * 1.0) % 40); x < 480; x += 40) gfx.rect(x, mid, 20, 2, '#e8d070');
}

// ---------- RV ----------
export function drawRV(x, y, t, opts = {}) {
  const img = assets.get(opts.broken ? 'sprites/rv_side_broken' : 'sprites/rv_side') || assets.get('sprites/rv_side');
  const bob = opts.moving ? (Math.floor(t * 8) % 2) : 0;
  if (img) {
    gfx.image(img, x, y - bob);
    const wheel = assets.get('sprites/rv_wheel');
    if (wheel && opts.moving) {
      // overlay rotating wheels for motion
      for (const wx of opts.wheelX || [44, 106]) {
        const c = gfx.ctx;
        c.save();
        c.translate(Math.round(x + wx), Math.round(y + 56 - bob * 0));
        c.rotate(t * 12);
        c.drawImage(wheel, -8, -8);
        c.restore();
      }
    }
    return;
  }
  // procedural 1999 Class A
  const Y = y - bob;
  gfx.rect(x + 4, Y + 6, 116, 46, '#3a2f2a');
  gfx.rect(x + 5, Y + 7, 114, 44, '#f1ead8');
  gfx.rect(x + 5, Y + 7, 114, 3, '#fffaf0');
  // cab slope
  gfx.rect(x + 104, Y + 12, 16, 22, '#6aa8c8');
  gfx.rect(x + 106, Y + 14, 12, 18, '#9fd3ea');
  // swooshes
  gfx.rect(x + 5, Y + 36, 114, 4, '#2a9d8f');
  gfx.rect(x + 5, Y + 40, 100, 3, '#8a2442');
  gfx.rect(x + 30, Y + 33, 70, 2, '#d4a537');
  // windows
  for (const wx of [14, 40, 66]) { gfx.rect(x + wx, Y + 16, 18, 12, '#3a5a72'); gfx.rect(x + wx, Y + 16, 18, 2, '#5a7a92'); }
  // door
  gfx.rect(x + 88, Y + 16, 12, 30, '#d8cfb8');
  gfx.rect(x + 89, Y + 18, 10, 8, '#3a5a72');
  // roof AC + ladder
  gfx.rect(x + 40, Y + 1, 22, 6, '#e0e0e0');
  gfx.rect(x + 6, Y + 8, 2, 30, '#888');
  // bumper + lights
  gfx.rect(x + 116, Y + 44, 6, 6, '#bbb');
  gfx.rect(x + 118, Y + 38, 3, 3, Math.floor(t * 4) % 2 && opts.hazard ? '#ffb000' : '#fff2a0');
  // wheels
  for (const wx of [22, 98]) wheelProc(x + wx, Y + 54, t, opts.moving);
  // bela head out window
  if (opts.bela !== false) {
    gfx.rect(x + 96, Y + 18, 8, 7, '#ffffff');
    gfx.rect(x + 101, Y + 21, 4, 3, '#f4b8c0');
    gfx.rect(x + 97, Y + 17, 2, 3, '#222');
  }
}
function wheelProc(cx, cy, t, moving) {
  gfx.rect(cx - 8, cy - 8, 16, 16, '#1a1a1a');
  gfx.rect(cx - 7, cy - 9, 14, 18, '#1a1a1a');
  gfx.rect(cx - 4, cy - 4, 8, 8, '#9a9a9a');
  const a = moving ? Math.floor(t * 16) % 2 : 0;
  gfx.rect(cx - 1, cy - 4 + a, 2, 2, '#444');
  gfx.rect(cx - 1, cy + 2 - a, 2, 2, '#444');
}

// ---------- Weather particles ----------
export class Weather {
  constructor() { this.p = []; this.flash = 0; }
  update(dt, kind, wind = 1) {
    const rate = { rain: 220, storm: 400, snow: 80, smoke: 25, fog: 0 }[kind] || 0;
    const n = rate * dt;
    for (let i = 0; i < n; i++) this.p.push({ x: Math.random() * 520 - 20, y: -5, v: kind === 'snow' ? 30 + Math.random() * 30 : 280 + Math.random() * 80, k: kind, life: 0 });
    for (const q of this.p) {
      q.y += q.v * dt;
      q.x -= (q.k === 'snow' ? 20 + Math.sin(q.y / 10) * 15 : 60 * wind) * dt;
      q.life += dt;
    }
    this.p = this.p.filter((q) => q.y < 200 && q.life < 6);
    if (kind === 'storm' && Math.random() < dt * 0.15) this.flash = 0.25;
    this.flash = Math.max(0, this.flash - dt);
  }
  draw(kind, h = 190) {
    for (const q of this.p) {
      if (q.y > h) continue;
      if (q.k === 'snow') gfx.rect(q.x, q.y, 2, 2, '#ffffff');
      else if (q.k === 'smoke') gfx.alpha(0.3, () => gfx.rect(q.x, q.y, 3, 3, '#5a4030'));
      else gfx.alpha(0.6, () => gfx.rect(q.x, q.y, 1, 5, '#b8d4ff'));
    }
    if (kind === 'fog') gfx.alpha(0.45, () => gfx.rect(0, 40, 480, h - 40, '#dde4ea'));
    if (kind === 'smoke') gfx.alpha(0.25, () => gfx.rect(0, 0, 480, h, '#c07030'));
    if (this.flash > 0) gfx.alpha(this.flash * 2, () => gfx.rect(0, 0, 480, h, '#ffffff'));
  }
}

// ---------- Scene art with fallback ----------
export function drawScene(id, x = 0, y = 0, w = 480, h = 200, t = 0) {
  const img = assets.get('scenes/' + id);
  if (img) { gfx.image(img, x, y, { w, h }); return true; }
  // fallback vista
  drawSky(x, y, w, h * 0.7, 0.75, 'sunny', t);
  ridge(x, y + h * 0.75, w, h * 0.35, 0.02, id.length * 31, '#4a5a7a', 0);
  ridge(x, y + h * 0.85, w, h * 0.2, 0.04, id.length * 17, '#2f4a3a', 0);
  gfx.rect(x, y + h * 0.85, w, h * 0.15, '#3a3a2a');
  return false;
}
