import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { Menu } from '../engine/ui.js';
import { drawTravelView, drawRV } from '../engine/art.js';
import { game } from '../game/game.js';
import { GameState } from '../game/state.js';
import { loadGame, hasSave } from '../game/save.js';

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
      { label: 'Sound: ' + (audio.isMuted() ? 'OFF' : 'ON'), onPick: (it) => { audio.setMuted(!audio.isMuted()); it.label = 'Sound: ' + (audio.isMuted() ? 'OFF' : 'ON'); if (!audio.isMuted()) audio.playMusic('title'); } },
    );
    this.menu = new Menu(items, { x: 30, y: 206, w: 200, size: 16, lh: 17 });
    audio.playMusic('title');
  },
  resume() { audio.playMusic('title'); },
  update(dt) {
    this.t += dt;
    if (input.anyKey()) audio.playMusic('title'); // after first gesture unlocks audio
    this.menu.update(dt);
  },
  draw() {
    const t = this.t;
    const img = assets.get('scenes/title');
    if (img) gfx.image(img, 0, 0);
    else {
      drawTravelView('coast', t * 60, 0.72, 'sunny', t, 300);
      drawRV(250, 210, t, { moving: true });
    }
    // logo
    const bob = Math.sin(t * 2) * 2;
    gfx.text("BELA'S", 240, 18 + bob, { size: 18, head: true, align: 'center', color: PAL.hi, shadowColor: '#5a2a0a' });
    gfx.text('BIG DRIVE', 240, 42 + bob, { size: 30, head: true, align: 'center', color: '#ffffff', shadowColor: '#a8456e' });
    gfx.text('San Diego ▸ Portland  ·  one 1999 Georgetown  ·  2 humans, 1 dog, 2 cats', 240, 82, { size: 14, align: 'center', color: '#fff6dc', shadowColor: '#000' });
    // bela trotting
    const run = assets.get('sprites/bela_run_side');
    const bx = ((t * 70) % 560) - 40;
    if (run) gfx.frame(run, 32, 24, Math.floor(t * 10) % 4, 0, bx, 168);
    gfx.panel(10, 196, 228, this.menu.items.length * 17 + 18, { body: 'rgba(30,20,45,0.92)' });
    this.menu.draw();
    gfx.text('made with love for C, J, B, M & P', 470, 288, { size: 12, align: 'right', color: '#e8dcc0' });
  },
}));
