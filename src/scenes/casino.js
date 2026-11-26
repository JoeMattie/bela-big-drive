// Canyonville casino: a 3-reel slot machine themed on the trip.
import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { drawIcon, drawPortrait } from '../engine/ui.js';
import { game } from '../game/game.js';

const SYMS = [
  { id: 'tire', w: 6, pay: 2 }, { id: 'coffee', w: 6, pay: 3 }, { id: 'gas', w: 5, pay: 4 },
  { id: 'catfood', w: 4, pay: 6 }, { id: 'kibble', w: 3, pay: 10 }, { id: 'money', w: 2, pay: 20 },
  { id: 'BELA', w: 1, pay: 75 },
];
const total = SYMS.reduce((a, s) => a + s.w, 0);
const roll = () => { let r = Math.random() * total; for (const s of SYMS) { r -= s.w; if (r <= 0) return s; } return SYMS[0]; };

game.register('casino', () => ({
  enter() {
    this.t = 0;
    this.bet = 10;
    this.reels = [roll(), roll(), roll()];
    this.spinning = [0, 0, 0];
    this.msg = 'Pull the lever! (SPACE / tap)';
    this.spent = 0; this.won = 0;
    audio.playMusic('town');
  },
  spin() {
    const s = game.state;
    if (this.spinning.some((x) => x > 0)) return;
    if (s.money < this.bet) { this.msg = 'Not enough cash, friend.'; audio.sfx('back'); return; }
    s.spend(this.bet); this.spent += this.bet;
    s.stats.casino -= this.bet;
    this.result = [roll(), roll(), roll()];
    if (Math.random() < 0.06) this.result = [this.result[0], this.result[0], this.result[0]];
    this.spinning = [0.8, 1.2, 1.6];
    audio.sfx('select');
    this.msg = '';
  },
  settle() {
    const s = game.state;
    const [a, b, c] = this.reels;
    let win = 0;
    if (a.id === b.id && b.id === c.id) win = this.bet * a.pay;
    else if (a.id === b.id || b.id === c.id || a.id === c.id) { const p = a.id === b.id ? a : c; win = Math.round(this.bet * p.pay * 0.15); }
    if (this.reels.filter((r) => r.id === 'BELA').length >= 1 && !win) win = Math.round(this.bet * 0.5 * this.reels.filter((r) => r.id === 'BELA').length);
    if (win) {
      s.earn(win); this.won += win; s.stats.casino += win;
      this.msg = a.id === 'BELA' && b.id === 'BELA' && c.id === 'BELA' ? `★ BELA JACKPOT! +$${win} ★` : `Winner! +$${win}`;
      audio.sfx(win >= this.bet * 5 ? 'ding' : 'cash');
      if (win >= this.bet * 10) gfx.flash('#ffd75e', 0.4);
    } else {
      this.msg = ['So close.', 'The house thanks you.', 'Bela believes in you.', 'Maybe next pull.'][Math.floor(Math.random() * 4)];
    }
  },
  update(dt) {
    this.t += dt;
    let was = this.spinning.some((x) => x > 0);
    this.spinning = this.spinning.map((x, i) => {
      if (x <= 0) return 0;
      const nx = x - dt;
      if (nx <= 0) { this.reels[i] = this.result[i]; audio.sfx('thud'); return 0; }
      if (Math.random() < 0.5) this.reels[i] = roll();
      return nx;
    });
    if (was && !this.spinning.some((x) => x > 0)) this.settle();
    if (input.any(' ', 'Enter') || input.clickIn(170, 210, 140, 24)) this.spin();
    const BETS = [5, 10, 25, 50, 100];
    const bi = BETS.indexOf(this.bet);
    if (input.any('ArrowUp', 'ArrowRight', '+') || input.clickIn(330, 150, 70, 20)) { this.bet = BETS[Math.min(BETS.length - 1, bi + 1)]; audio.sfx('select'); }
    if (input.any('ArrowDown', 'ArrowLeft', '-') || input.clickIn(80, 150, 70, 20)) { this.bet = BETS[Math.max(0, bi - 1)]; audio.sfx('select'); }
    if (input.any('Escape', 'Backspace', 'q') || input.clickIn(170, 262, 140, 24)) { audio.sfx('back'); this.leave(); }
  },
  leave() {
    const s = game.state;
    const net = this.won - this.spent;
    game.pop();
    if (this.spent) s.log(`Casino: ${net >= 0 ? 'won' : 'lost'} $${Math.abs(net)}.`);
  },
  draw() {
    const s = game.state;
    gfx.rect(0, 0, 480, 300, '#140a1e');
    // neon border lights
    for (let i = 0; i < 48; i++) {
      const on = (Math.floor(this.t * 8) + i) % 3 === 0;
      gfx.rect(i * 10 + 2, 4, 5, 5, on ? '#ff5ea8' : '#5a1f44');
      gfx.rect(i * 10 + 2, 291, 5, 5, on ? '#5ef0ff' : '#1f4a5a');
    }
    gfx.text('LUCKY GEORGETOWN', 240, 20, { size: 16, head: true, align: 'center', color: Math.floor(this.t * 4) % 2 ? '#ff5ea8' : PAL.hi });
    gfx.text('slots', 240, 42, { size: 16, align: 'center', color: '#5ef0ff' });
    gfx.panel(110, 66, 260, 76, { body: '#0a0610' });
    this.reels.forEach((r, i) => {
      const x = 128 + i * 80, y = 74;
      gfx.rect(x, y, 64, 60, '#f7ecd2');
      gfx.rect(x, y, 64, 4, '#d8cdb0');
      if (r.id === 'BELA') drawPortrait('bela', x + 8, y + 6, 'happy', { size: 48, frame: false });
      else {
        const c = gfx.ctx; c.save(); c.translate(x + 8, y + 6); c.scale(3, 3); drawIcon(r.id, 0, 0); c.restore();
      }
      if (this.spinning[i] > 0) gfx.alpha(0.3, () => gfx.rect(x, y, 64, 60, '#888'));
    });
    gfx.text('◂ BET', 115, 152, { size: 16, align: 'center', color: PAL.dim });
    gfx.text(`$${this.bet}`, 240, 150, { size: 20, align: 'center', color: PAL.hi });
    gfx.text('BET ▸', 365, 152, { size: 16, align: 'center', color: PAL.dim });
    gfx.text(this.msg, 240, 182, { size: 16, align: 'center', color: PAL.good });
    gfx.rect(170, 210, 140, 24, '#8a2442');
    gfx.text('PULL LEVER', 240, 214, { size: 16, align: 'center' });
    gfx.text(`Cash: $${s.money}   ·   Tonight: ${this.won - this.spent >= 0 ? '+' : '−'}$${Math.abs(this.won - this.spent)}`, 240, 240, { size: 14, align: 'center', color: PAL.dim });
    gfx.rect(170, 262, 140, 22, '#2e2140');
    gfx.text('Cash out & leave', 240, 265, { size: 14, align: 'center', color: PAL.text });
    gfx.text('3× BELA = 75×', 418, 80, { size: 12, align: 'center', color: PAL.hi });
    gfx.text('3× cash = 20×', 418, 94, { size: 12, align: 'center', color: PAL.dim });
    gfx.text('3× kibble = 10×', 418, 108, { size: 12, align: 'center', color: PAL.dim });
    gfx.text('pairs pay a little', 418, 122, { size: 12, align: 'center', color: PAL.dim });
  },
}));
