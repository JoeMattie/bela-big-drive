// Unified keyboard + pointer/touch input in logical (480x300) coordinates.
import { gfx, W, H } from './gfx.js';

class Input {
  constructor() {
    this.down = new Set();     // keys currently held (e.key lowercased)
    this.pressed = [];         // keys pressed since last frame
    this.mouse = { x: -1, y: -1, down: false, moved: false };
    this.clicks = [];          // [{x,y}] since last frame
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
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = toLogical(e);
      this.lastPointerType = e.pointerType;
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.down = true;
      this.pointerHeld = true;
      this.clicks.push(p);
      this.gesture();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = toLogical(e);
      this.lastPointerType = e.pointerType;
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.moved = true;
    });
    const up = () => { this.mouse.down = false; this.pointerHeld = false; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  gesture() {
    if (!this._gestured) {
      this._gestured = true;
      if (this.onFirstGesture) this.onFirstGesture();
    }
  }

  endFrame() {
    this.pressed.length = 0;
    this.clicks.length = 0;
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
  consumeClicks() { this.clicks.length = 0; }
  consumeKeys() { this.pressed.length = 0; }
}

export const input = new Input();
