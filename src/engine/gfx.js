// Rendering core. The logical canvas adapts to the screen's shape so the game
// always fills the whole screen: 300 px tall on landscape screens (wider on
// wide phones), 480 px wide on portrait screens (taller). Images are drawn
// nearest-neighbour; text renders at backing resolution so it stays crisp.

export let W = 480;
export let H = 300;
export const STAGE_W = 480; // fixed-size scenes (minigames) use a 480x300 stage
export const STAGE_H = 300;

export function isPortrait() { return H > W * 1.1; }
// Shared responsive metrics
export const ui = {
  get portrait() { return isPortrait(); },
  get fs() { return isPortrait() ? 20 : 16; },      // body font size
  get lh() { return isPortrait() ? 25 : 19; },      // body line height
  get mlh() { return isPortrait() ? 34 : 19; },     // menu row height (tap targets)
  get artX() { return Math.round((W - 480) / 2); }, // where 480-wide art sits
};

export const PAL = {
  ink: '#1b1424',
  night: '#241b35',
  panel: '#2e2140',
  panel2: '#3d2b52',
  edge: '#c8873a',
  edgeHi: '#f3c26b',
  edgeLo: '#7a4520',
  text: '#f7ecd2',
  dim: '#b8a68c',
  mute: '#8a7a6a',
  hi: '#ffd75e',
  good: '#7ee07a',
  bad: '#ff6b5e',
  warn: '#ffb347',
  sky: '#76c6ff',
  teal: '#3ecfc0',
  pink: '#ff7eb6',
  road: '#3b3a44',
};

export const FONT_BODY = 'BodyPixel';
export const FONT_HEAD = 'HeadPixel';

class Gfx {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.scale = 1; // css px per logical px
    this.dpr = 1;
    this.t = 0;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.flashT = 0;
    this.flashColor = '#fff';
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
  }

  resize() {
    const v = window.visualViewport;
    const vw = Math.max(1, Math.round(v ? v.width : window.innerWidth));
    const vh = Math.max(1, Math.round(v ? v.height : window.innerHeight));
    const aspect = vw / vh;
    if (aspect >= 1.6) { H = 300; W = Math.min(720, Math.round(300 * aspect)); }
    else if (aspect >= 0.9) { W = 480; H = Math.round(480 / aspect); }
    else { W = 480; H = Math.min(1200, Math.round(480 / aspect)); }
    this.scale = Math.min(vw / W, vh / H);
    this.dpr = window.devicePixelRatio || 1;
    const cssW = Math.round(W * this.scale), cssH = Math.round(H * this.scale);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.ctx.imageSmoothingEnabled = false;
    if (this.onResize) this.onResize();
  }

  begin() {
    const c = this.ctx;
    const k = this.scale * this.dpr;
    let ox = 0, oy = 0;
    if (this.shakeT > 0) {
      ox = (Math.random() * 2 - 1) * this.shakeMag;
      oy = (Math.random() * 2 - 1) * this.shakeMag;
    }
    c.setTransform(k, 0, 0, k, Math.round(ox * k), Math.round(oy * k));
    c.imageSmoothingEnabled = false;
    c.fillStyle = PAL.ink;
    c.fillRect(-10, -10, W + 20, H + 20);
  }

  end(dt) {
    const c = this.ctx;
    if (this.flashT > 0) {
      c.save();
      c.globalAlpha = Math.min(1, this.flashT * 3);
      c.fillStyle = this.flashColor;
      c.fillRect(0, 0, W, H);
      c.restore();
      this.flashT -= dt;
    }
    if (this.shakeT > 0) this.shakeT -= dt;
  }

  shake(mag = 3, t = 0.35) { this.shakeMag = mag; this.shakeT = t; }
  flash(color = '#fff', t = 0.25) { this.flashColor = color; this.flashT = t; }

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  strokeRect(x, y, w, h, color) {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
  }

  // Ornamental panel: dark body with a brass bevel.
  panel(x, y, w, h, opts = {}) {
    const body = opts.body || PAL.panel;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (opts.shadow !== false) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.45;
      this.rect(x + 3, y + 3, w, h, '#000');
      this.ctx.restore();
    }
    this.rect(x, y, w, h, PAL.edgeLo);
    this.rect(x + 1, y + 1, w - 2, h - 2, PAL.edge);
    this.rect(x + 1, y + 1, w - 2, 1, PAL.edgeHi);
    this.rect(x + 1, y + 1, 1, h - 2, PAL.edgeHi);
    this.rect(x + 3, y + 3, w - 6, h - 6, PAL.edgeLo);
    this.rect(x + 4, y + 4, w - 8, h - 8, body);
    // corner rivets
    for (const [cx, cy] of [[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + h - 3], [x + w - 3, y + h - 3]]) {
      this.rect(cx, cy, 2, 2, PAL.edgeHi);
    }
  }

  font(size = 8, head = false) {
    return `${size}px ${head ? FONT_HEAD : FONT_BODY}`;
  }

  // Draw text. opts: size, color, align ('left'|'center'|'right'), head, shadow
  text(str, x, y, opts = {}) {
    const c = this.ctx;
    const size = opts.size || 16;
    c.font = this.font(size, opts.head);
    c.textAlign = opts.align || 'left';
    c.textBaseline = 'top';
    str = String(str);
    if (opts.shadow !== false) {
      c.fillStyle = opts.shadowColor || 'rgba(0,0,0,0.75)';
      c.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
    }
    c.fillStyle = opts.color || PAL.text;
    c.fillText(str, Math.round(x), Math.round(y));
  }

  measure(str, size = 16, head = false) {
    this.ctx.font = this.font(size, head);
    return this.ctx.measureText(String(str)).width;
  }

  // Word-wrap text into lines that fit maxW. Respects \n.
  wrap(str, maxW, size = 16, head = false) {
    const out = [];
    for (const para of String(str).split('\n')) {
      const words = para.split(' ');
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (this.measure(test, size, head) > maxW && line) {
          out.push(line);
          line = w;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  }

  image(img, x, y, opts = {}) {
    if (!img) return;
    const c = this.ctx;
    if (opts.alpha !== undefined) { c.save(); c.globalAlpha = opts.alpha; }
    if (opts.flip) {
      c.save();
      c.translate(Math.round(x) + (opts.w || img.width), Math.round(y));
      c.scale(-1, 1);
      c.drawImage(img, 0, 0, opts.w || img.width, opts.h || img.height);
      c.restore();
    } else if (opts.w) {
      c.drawImage(img, Math.round(x), Math.round(y), opts.w, opts.h);
    } else {
      c.drawImage(img, Math.round(x), Math.round(y));
    }
    if (opts.alpha !== undefined) c.restore();
  }

  // Draw a frame from a sprite sheet laid out in a grid.
  frame(img, fw, fh, col, row, x, y, opts = {}) {
    if (!img) return;
    const c = this.ctx;
    const dw = opts.w || fw, dh = opts.h || fh;
    if (opts.flip) {
      c.save();
      c.translate(Math.round(x) + dw, Math.round(y));
      c.scale(-1, 1);
      c.drawImage(img, col * fw, row * fh, fw, fh, 0, 0, dw, dh);
      c.restore();
    } else {
      c.drawImage(img, col * fw, row * fh, fw, fh, Math.round(x), Math.round(y), dw, dh);
    }
  }

  alpha(a, fn) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = a;
    fn();
    c.restore();
  }

  // Horizontal-band vertical gradient (banded, retro look).
  bands(x, y, w, h, colors) {
    const n = colors.length;
    for (let i = 0; i < n; i++) {
      const y0 = Math.round(y + (h * i) / n);
      const y1 = Math.round(y + (h * (i + 1)) / n);
      this.rect(x, y0, w, y1 - y0, colors[i]);
    }
  }

  // Lerp between two hex colors.
  mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = ((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
    const g = ((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
    const bl = (pa & 255) + (((pb & 255) - (pa & 255)) * t);
    return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl)).toString(16).slice(1);
  }
}

export const gfx = new Gfx();
