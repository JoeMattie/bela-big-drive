// Reusable UI widgets: menus, portraits, icons, typewriter text.
import { gfx, PAL, W, H, ui } from './gfx.js';
import { input } from './input.js';
import { assets } from './assets.js';
import { audio } from './audio.js';
import { MEMBER } from '../data/party.js';

export const BODY = 16; // body font size in logical px

// ----- Menu -----
// items: [{label, sub?, right?, disabled?, color?, onPick}]
export class Menu {
  constructor(items, opts = {}) {
    this.items = items;
    this.x = opts.x ?? 20;
    this.y = opts.y ?? 100;
    this.w = opts.w ?? 300;
    this.size = opts.size ?? BODY;
    this.lh = opts.lh ?? this.size + 3;
    this.numbered = opts.numbered !== false;
    this.sel = opts.sel ?? this.firstEnabled();
    this.onBack = opts.onBack || null;
    this.cursorBlink = 0;
    this.maxRows = opts.maxRows || 99;
    this.scroll = 0;
  }
  firstEnabled() { const i = this.items.findIndex((it) => !it.disabled); return i < 0 ? 0 : i; }
  move(d) {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.sel + d * k + n * 10) % n;
      if (!this.items[i].disabled) { this.sel = i; audio.sfx('select'); break; }
    }
  }
  rowY(i) { return this.y + (i - this.scroll) * this.lh; }
  // returns true if an item was picked
  update(dt) {
    this.cursorBlink += dt;
    if (this.tapHint) this.tapHint = Math.max(0, this.tapHint - dt);
    if (input.any('ArrowUp', 'w')) this.move(-1);
    if (input.any('ArrowDown', 's')) this.move(1);
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + this.maxRows) this.scroll = this.sel - this.maxRows + 1;
    for (let i = 0; i < Math.min(9, this.items.length); i++) {
      if (input.hit(String(i + 1)) && this.numbered && !this.items[i].disabled) { this.sel = i; return this.pick(); }
    }
    const visible = this.items.slice(this.scroll, this.scroll + this.maxRows);
    for (let j = 0; j < visible.length; j++) {
      const i = j + this.scroll;
      const y = this.rowY(i);
      if (input.mouse.moved && input.hover(this.x - 4, y - 1, this.w, this.lh) && !this.items[i].disabled && this.sel !== i) {
        this.sel = i;
      }
      if (input.clickIn(this.x - 4, y - 1, this.w, this.lh) && !this.items[i].disabled) {
        input.consumeClicks();
        // on touch: first tap highlights, second tap on the same item chooses
        if (input.lastPointerType !== 'mouse' && this.sel !== i) { this.sel = i; this.tapHint = 1.5; audio.sfx('select'); return false; }
        this.sel = i;
        return this.pick();
      }
    }
    if (input.confirm()) return this.pick();
    if (input.back() && this.onBack) { audio.sfx('back'); this.onBack(); return true; }
    return false;
  }
  touchMode() { return input.lastPointerType === 'touch' || input.lastPointerType === 'pen'; }
  pick() {
    const it = this.items[this.sel];
    if (!it || it.disabled) return false;
    audio.sfx('confirm');
    input.consumeKeys();
    if (it.onPick) it.onPick(it, this.sel);
    return true;
  }
  draw() {
    const visible = this.items.slice(this.scroll, this.scroll + this.maxRows);
    visible.forEach((it, j) => {
      const i = j + this.scroll;
      const y = this.rowY(i);
      const on = i === this.sel;
      if (on) {
        gfx.alpha(0.35, () => gfx.rect(this.x - 4, y - 1, this.w, this.lh, PAL.edge));
      }
      const col = it.disabled ? PAL.mute : on ? PAL.hi : (it.color || PAL.text);
      const label = (this.numbered && i < 9 ? `${i + 1}. ` : '') + it.label;
      if (on && Math.floor(this.cursorBlink * 3) % 2 === 0) gfx.text('▸', this.x - 12, y, { size: this.size, color: PAL.hi });
      gfx.text(label, this.x, y, { size: this.size, color: col });
      if (it.right && !(on && this.tapHint)) gfx.text(it.right, this.x + this.w - 10, y, { size: this.size, color: on ? PAL.hi : PAL.dim, align: 'right' });
      if (on && input.lastPointerType !== 'mouse' && input.lastPointerType !== '' && this.touchMode()) {
        gfx.text(this.tapHint ? 'tap again ✓' : '✓', this.x + this.w - 10, y + (this.size - 12) / 2, { size: 12, color: PAL.good, align: 'right' });
      }
    });
    if (this.scroll > 0) gfx.text('▲', this.x + this.w - 14, this.y - 12, { size: 12, color: PAL.dim });
    if (this.scroll + this.maxRows < this.items.length) gfx.text('▼', this.x + this.w - 14, this.y + this.maxRows * this.lh, { size: 12, color: PAL.dim });
  }
  get current() { return this.items[this.sel]; }
}

// ----- Portraits -----
export function drawPortrait(id, x, y, mood = 'neutral', opts = {}) {
  const size = opts.size || 64;
  let img = assets.get(`portraits/${id}_${mood}`) || assets.get(`portraits/${id}_neutral`);
  if (opts.frame !== false) {
    gfx.rect(x - 2, y - 2, size + 4, size + 4, PAL.edgeLo);
    gfx.rect(x - 1, y - 1, size + 2, size + 2, PAL.edge);
    gfx.rect(x, y, size, size, opts.bg || '#3a2e4f');
  }
  if (img) {
    gfx.image(img, x, y, { w: size, h: size, alpha: opts.alpha });
  } else {
    const m = MEMBER[id];
    gfx.rect(x + size * 0.2, y + size * 0.15, size * 0.6, size * 0.6, m ? m.color : '#888');
    gfx.text(m ? m.name[0] : '?', x + size / 2, y + size * 0.3, { size: Math.round(size / 2.5), align: 'center', color: PAL.ink, shadow: false, head: true });
  }
  if (opts.gone) {
    gfx.alpha(0.6, () => gfx.rect(x, y, size, size, '#000'));
  }
}

// ----- Icons -----
const ICON_FALLBACK = { gas: '#e04040', food: '#c49a5a', kibble: '#a86', catfood: '#6af', litter: '#bbb', tire: '#333', parts: '#999', chains: '#aaa', propane: '#eee', ducttape: '#888', coffee: '#7a4a2a', treats: '#d9a', toiletpaper: '#fff', firstaid: '#e33', money: '#5c5', water: '#4af' };
export function drawIcon(id, x, y) {
  const img = assets.get(`icons/${id}`);
  if (img) gfx.image(img, x, y, { w: 16, h: 16 });
  else {
    gfx.rect(x + 2, y + 2, 12, 12, '#000');
    gfx.rect(x + 3, y + 3, 10, 10, ICON_FALLBACK[id] || '#888');
  }
}

// ----- Bars -----
export function bar(x, y, w, h, v, color) {
  gfx.rect(x, y, w, h, '#000');
  gfx.rect(x + 1, y + 1, w - 2, h - 2, '#3a3046');
  const fw = Math.max(0, Math.round((w - 2) * Math.max(0, Math.min(1, v))));
  const c = color || (v > 0.6 ? PAL.good : v > 0.3 ? PAL.warn : PAL.bad);
  gfx.rect(x + 1, y + 1, fw, h - 2, c);
  gfx.alpha(0.35, () => gfx.rect(x + 1, y + 1, fw, 1, '#fff'));
}

// ----- Typewriter -----
export class Typewriter {
  constructor(text, maxW, size = BODY, cps = 70) {
    this.lines = gfx.wrap(text, maxW, size);
    this.total = this.lines.reduce((a, l) => a + l.length, 0);
    this.shown = 0;
    this.cps = cps;
    this.size = size;
    this.tick = 0;
  }
  get done() { return this.shown >= this.total; }
  finish() { this.shown = this.total; }
  update(dt) {
    if (this.done) return;
    const before = Math.floor(this.shown);
    this.shown = Math.min(this.total, this.shown + this.cps * dt);
    if (Math.floor(this.shown) !== before) {
      this.tick++;
      if (this.tick % 3 === 0) audio.sfx('type');
    }
  }
  draw(x, y, color = PAL.text, lh = null) {
    lh = lh || this.size + 3;
    let left = Math.floor(this.shown);
    this.lines.forEach((l, i) => {
      if (left <= 0) return;
      const s = l.slice(0, left);
      left -= l.length;
      gfx.text(s, x, y + i * lh, { size: this.size, color });
    });
  }
  height(lh = null) { return this.lines.length * (lh || this.size + 3); }
}

// Blinking "press to continue" hint
export function continueHint(t, x = null, y = null, label = null) {
  if (x === null) x = W / 2;
  if (y === null) y = H - (ui.portrait ? 30 : 16);
  const touch = input.lastPointerType === 'touch';
  const txt = label || (touch ? 'Tap to continue' : 'Press ENTER to continue');
  if (Math.floor(t * 2) % 2 === 0) gfx.text(txt, x, y, { size: ui.portrait ? 16 : 12, align: 'center', color: PAL.dim });
}

// Draw a menu in a centered panel sized for the current screen shape.
// desc: optional text shown under the menu (wrapped).
export function menuPanel(menu, title, opts = {}) {
  const P = ui.portrait;
  const fs = ui.fs, lh = ui.lh;
  menu.size = fs; menu.lh = ui.mlh;
  const pw = P ? W - 24 : Math.min(opts.w || 300, W - 40);
  const px = Math.round((W - pw) / 2);
  menu.x = px + 30; menu.w = pw - 50;
  const desc = opts.desc ? gfx.wrap(opts.desc, pw - 50, fs) : [];
  const rows = Math.min(menu.maxRows, menu.items.length);
  const h = 44 + rows * menu.lh + (desc.length ? 16 + desc.length * lh : 0) + 14;
  const py = Math.max(6, Math.round((H - h) / 2));
  if (opts.dim !== false) gfx.alpha(0.5, () => gfx.rect(0, 0, W, H, '#000'));
  gfx.panel(px, py, pw, h);
  gfx.text(title, W / 2, py + 13, { size: P ? 12 : 10, head: true, align: 'center', color: PAL.hi });
  menu.y = py + 38;
  menu.draw();
  if (desc.length) {
    const dy = menu.y + rows * menu.lh + 8;
    gfx.rect(px + 20, dy, pw - 40, 1, PAL.edgeLo);
    desc.forEach((l, i) => gfx.text(l, px + 26, dy + 8 + i * lh, { size: fs, color: PAL.dim }));
  }
}
