// Page chrome: fullscreen + sound toggles, and going fullscreen on the first
// tap on touch devices. (Canvas sizing itself lives in gfx.resize.)
import { audio } from './audio.js';

export function isTouch() {
  return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
}

export function canFullscreen() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }

export function toggleFullscreen(force) {
  const d = document, el = d.documentElement;
  const isFS = d.fullscreenElement || d.webkitFullscreenElement;
  try {
    if (isFS && force !== true) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (!isFS) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        const p = req.call(el, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => { /* not allowed here */ });
      }
    }
  } catch (_) { /* ignore */ }
}

export function initLayout() {
  const canFS = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  document.querySelectorAll('[data-act="fs"]').forEach((b) => {
    if (!canFS) b.style.display = 'none';
    b.addEventListener('click', () => toggleFullscreen());
  });
  const mutes = document.querySelectorAll('[data-act="mute"]');
  const sync = () => mutes.forEach((m) => m.classList.toggle('off', audio.isMuted()));
  mutes.forEach((m) => m.addEventListener('click', () => { audio.init(); audio.setMuted(!audio.isMuted()); sync(); }));
  sync();
  if (isTouch() && canFS) {
    const once = () => { toggleFullscreen(true); window.removeEventListener('pointerup', once); };
    window.addEventListener('pointerup', once);
  }
}
