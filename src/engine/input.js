// Unified keyboard + pointer/touch input in logical (480x300) coordinates.
import { gfx, W, H } from './gfx.js';

class Input {
  constructor() {
    this.down = new Set();     // keys currently held (e.key lowercased)
    this.pressed = [];         // keys pressed since last frame
    this.mouse = { x: -1, y: -1, down: false, moved: false };
    this.clicks = [];          // [{x,y}] since last frame
    this.swipes = [];          // 'up'|'down'|'left'|'right' since last frame
    this.touch = null;
    this.pointerHeld = false;
    this.lastPointerType = 'mouse';
    this.onFirstGesture = null;
    this._gestured = false;
  }

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Tab'].includes(e.key)) e.preventDefault();
      if (!e.repeat || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) this.pressed.push(k);
      this.down.add(k);
      this.gesture();
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.down.delete(k);
    });
    window.addEventListener('blur', () => this.down.clear());

    const toLogical = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * W,
        y: ((e.clientY - r.top) / r.height) * H,
      };
    };
    // Mouse clicks fire on press (snappy). Touch taps fire on release, and only
    // if the finger didn't travel — a drag becomes a swipe instead.
    const SWIPE_STEP = 26; // css px of finger travel per cursor step
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = toLogical(e);
      this.lastPointerType = e.pointerType;
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.down = true;
      this.pointerHeld = true;
      if (e.pointerType === 'mouse') this.clicks.push(p);
      else this.touch = { x0: e.clientX, y0: e.clientY, ax: e.clientX, ay: e.clientY, moved: false, p };
      this.gesture();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = toLogical(e);
      this.lastPointerType = e.pointerType;
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.moved = true;
      const t = this.touch;
      if (t && this.pointerHeld) {
        if (Math.hypot(e.clientX - t.x0, e.clientY - t.y0) > 10) t.moved = true;
        while (Math.abs(e.clientY - t.ay) >= SWIPE_STEP) {
          const d = Math.sign(e.clientY - t.ay);
          this.swipes.push(d > 0 ? 'down' : 'up');
          t.ay += d * SWIPE_STEP;
        }
        while (Math.abs(e.clientX - t.ax) >= SWIPE_STEP * 1.6) {
          const d = Math.sign(e.clientX - t.ax);
          this.swipes.push(d > 0 ? 'right' : 'left');
          t.ax += d * SWIPE_STEP * 1.6;
        }
      }
    });
    const up = (e) => {
      if (this.touch && e && e.type === 'pointerup' && !this.touch.moved) this.clicks.push(this.touch.p);
      this.touch = null;
      this.mouse.down = false;
      this.pointerHeld = false;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // On-screen pad support
  padDown(key) { this.lastPointerType = 'touch'; this.down.add(key); this.pressed.push(key); this.gesture(); }
  padUp(key) { this.down.delete(key); }

  gesture() {
    if (!this._gestured) {
      this._gestured = true;
      if (this.onFirstGesture) this.onFirstGesture();
    }
  }

  endFrame() {
    this.pressed.length = 0;
    this.clicks.length = 0;
    this.swipes.length = 0;
    this.mouse.moved = false;
  }

  hit(key) { return this.pressed.includes(key); }
  any(...keys) { return keys.some((k) => this.pressed.includes(k)); }
  held(key) { return this.down.has(key); }

  confirm() { return this.any('Enter', ' '); }
  back() { return this.any('Escape', 'Backspace'); }
  // Any key or click — used for "press any key to continue".
  anyKey() { return this.pressed.length > 0 || this.clicks.length > 0; }

  clickIn(x, y, w, h) {
    return this.clicks.some((c) => c.x >= x && c.x < x + w && c.y >= y && c.y < y + h);
  }
  hover(x, y, w, h) {
    return this.mouse.x >= x && this.mouse.x < x + w && this.mouse.y >= y && this.mouse.y < y + h;
  }
  consumeClicks() { this.clicks.length = 0; this.swipes.length = 0; }
  consumeKeys() { this.pressed.length = 0; }
}

export const input = new Input();
