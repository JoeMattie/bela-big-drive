import { gfx, PAL, W, H, ui } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { Menu } from '../engine/ui.js';
import { drawTravelView, drawRV, drawFull } from '../engine/art.js';
import { game } from '../game/game.js';
import { GameState } from '../game/state.js';
import { loadGame, hasSave } from '../game/save.js';
import { toggleFullscreen, canFullscreen } from '../engine/layout.js';

game.register('title', () => ({
  enter() {
    this.t = 0;
    this.started = false;
    const items = [];
    if (hasSave()) items.push({ label: 'Continue the trip', onPick: () => { const s = loadGame(); if (s) { game.state = s; game.go(s.leg ? 'travel' : 'stop', { resume: true }); } } });
    items.push(
      { label: 'Hit the road', onPick: () => { game.state = new GameState(); game.go('intro'); } },
      { label: 'Learn about the road', onPick: () => game.push('learn') },
      { label: 'See the Top Road Trippers', onPick: () => game.push('halloffame') },
      ...(canFullscreen() ? [{ label: 'Full screen', onPick: () => toggleFullscreen() }] : []),
      { label: 'Sound: ' + (audio.isMuted() ? 'OFF' : 'ON'), onPick: (it) => { audio.setMuted(!audio.isMuted()); it.label = 'Sound: ' + (audio.isMuted() ? 'OFF' : 'ON'); if (!audio.isMuted()) audio.playMusic('title'); } },
    );
    this.menu = new Menu(items, { x: 30, y: 206, w: 200, size: 16, lh: 17 });
    audio.playMusic('title');
  },
  resume() { audio.playMusic('title'); },
  update(dt) {
    this.t += dt;
    if (this.lw !== W || this.lhH !== H) this.layout();
    if (input.anyKey()) audio.playMusic('title'); // after first gesture unlocks audio
    this.menu.update(dt);
  },
  layout() {
    const P = ui.portrait;
    const n = this.menu.items.length;
    this.menu.size = P ? 22 : 16;
    this.menu.lh = P ? 38 : 17;
    if (P && assets.get('scenes/title_portrait')) {
      // dedicated tall art: logo in its sky, menu over its calm foreground
      const menuH = n * this.menu.lh + 30;
      this.tallY = Math.round((H - 960) / 2);
      this.artY = this.tallY;
      this.menu.x = 50; this.menu.w = 380;
      const py = H - menuH - 56;
      this.menu.y = py + 16;
      this.panel = [24, py, 432, menuH];
    } else if (P) {
      this.tallY = null;
      const menuH = n * this.menu.lh + 30;
      this.artY = Math.max(0, Math.round((H - 300 - menuH - 40) / 2));
      this.menu.x = 50; this.menu.w = 380;
      this.menu.y = this.artY + 300 + 30;
      this.panel = [24, this.artY + 300 + 14, 432, menuH];
    } else {
      this.artY = 0;
      const ax = Math.round((W - 480) / 2);
      this.menu.x = ax + 480 - 218; this.menu.w = 200;
      this.menu.y = 206;
      this.panel = [ax + 480 - 238, 196, 228, n * 17 + 18];
    }
    this.lw = W; this.lhH = H;
  },
  draw() {
    if (this.lw !== W || this.lhH !== H) this.layout();
    const t = this.t;
    const P = ui.portrait;
    const ax = Math.round((W - 480) / 2), ay = this.artY;
    const tall = P && this.tallY != null ? assets.get('scenes/title_portrait') : null;
    const img = assets.get('scenes/title');
    if (tall) drawFull(tall, 0, this.tallY);
    else if (img) drawFull(img, ax, ay);
    else {
      drawTravelView('coast', t * 60, 0.72, 'sunny', t, H);
      drawRV(W / 2, H * 0.7, t, { moving: true });
    }
    // logo
    const bob = Math.sin(t * 2) * 2;
    const ly = tall ? Math.max(24, this.tallY + 70) : P ? Math.max(18, ay - 70) : 18;
    gfx.text("BELA'S", W / 2, ly + bob, { size: 18, head: true, align: 'center', color: PAL.hi, shadowColor: '#5a2a0a' });
    gfx.text('BIG DRIVE', W / 2, ly + 24 + bob, { size: 30, head: true, align: 'center', color: '#ffffff', shadowColor: '#a8456e' });
    if (P) {
      gfx.text('San Diego ▸ Portland', W / 2, ly + 64, { size: 18, align: 'center', color: '#fff6dc', shadowColor: '#000' });
      gfx.text('one 1999 Georgetown · 2 humans · 1 dog · 2 cats', W / 2, ly + 84, { size: 16, align: 'center', color: '#fff6dc', shadowColor: '#000' });
    } else {
      gfx.text('San Diego ▸ Portland  ·  one 1999 Georgetown  ·  2 humans, 1 dog, 2 cats', W / 2, 82, { size: 14, align: 'center', color: '#fff6dc', shadowColor: '#000' });
    }
    // bela trotting
    const run = assets.get('sprites/bela_run_side');
    const bx = ((t * 70) % (W + 80)) - 40;
    if (run && !tall) gfx.frame(run, 32, 24, Math.floor(t * 10) % 4, 0, bx, ay + 168);
    const [px, py, pw, ph] = this.panel;
    gfx.panel(px, py, pw, ph, { body: 'rgba(30,20,45,0.92)' });
    this.menu.draw();
    gfx.text('made with love for C, J, B, M & P', P ? W / 2 : 10, H - (P ? 26 : 12), { size: P ? 14 : 12, align: P ? 'center' : 'left', color: '#e8dcc0' });
  },
}));
