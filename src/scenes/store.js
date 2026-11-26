import { gfx, PAL } from '../engine/gfx.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { drawIcon, Typewriter, continueHint } from '../engine/ui.js';
import { game } from '../game/game.js';
import { ITEMS } from '../data/items.js';
import { NODES } from '../data/route.js';

const ADVICE = 'Welcome to GEORGETOWN OUTFITTERS, San Diego\'s #1 RV superstore! A clerk named Marisol looks at your RV, then at you, then back at the RV. "Okay. You\'ll want gas — lots of it, she drinks. Groceries, kibble, cat food AND litter for the cats. A spare tire or two: those old tires blow. Tire chains if you\'re crossing a pass in winter. A parts kit. And toilet paper. Trust me on the toilet paper."';

const SUGGEST = { gas: 4, food: 5, kibble: 3, catfood: 6, litter: 3, propane: 2, water: 2, tires: 1, parts: 1, chains: 0, ducttape: 2, coffee: 2, treats: 1, toiletpaper: 3, firstaid: 1 };

game.register('store', () => ({
  enter({ start = false, onDone = null }) {
    this.start = start;
    this.onDone = onDone;
    this.t = 0;
    this.sel = 0;
    this.cart = Object.fromEntries(ITEMS.map((i) => [i.id, 0]));
    this.advice = start ? new Typewriter(ADVICE, 400, 16, 90) : null;
    const s = game.state;
    const n = NODES[s.node];
    this.storeName = start ? 'GEORGETOWN OUTFITTERS' : (n.kind === 'casino' ? 'CASINO TRAVEL CENTER' : (n.name.split(',')[0].toUpperCase() + ' GAS & GROCERY'));
    this.markup = start ? 1 : (s.inOregon() ? 1.12 : 1.25);
    if (s.alive('caity')) this.markup *= 0.92;
    this.rows = ITEMS.length + 1; // + done row
    this.flashMsg = '';
    this.flashT = 0;
    audio.playMusic('store');
  },
  price(it) {
    const s = game.state;
    if (it.id === 'gas') return Math.round(s.gasPrice() * it.step * 100) / 100;
    if (it.id === 'water' && !this.start) return 0; // free water at the pump
    return Math.max(1, Math.round(it.price * this.markup));
  },
  total() {
    return Math.round(ITEMS.reduce((a, it) => a + this.cart[it.id] * this.price(it), 0) * 100) / 100;
  },
  canAdd(it) {
    const s = game.state;
    const have = s.inv[it.id] + (this.cart[it.id] + 1) * it.step;
    if (have > it.max + (it.step - 1)) return 'Not enough room for more ' + it.name.toLowerCase() + '.';
    if (this.total() + this.price(it) > s.money) return 'Not enough money!';
    return null;
  },
  adjust(it, d) {
    if (d > 0) {
      const why = this.canAdd(it);
      if (why) { this.flash(why); audio.sfx('back'); return; }
      this.cart[it.id]++;
      audio.sfx('select');
    } else if (this.cart[it.id] > 0) {
      this.cart[it.id]--;
      audio.sfx('back');
    }
  },
  flash(m) { this.flashMsg = m; this.flashT = 1.6; },
  checkout() {
    const s = game.state;
    const tot = this.total();
    for (const it of ITEMS) {
      if (this.cart[it.id]) s.add(it.id, Math.min(it.max - s.inv[it.id], this.cart[it.id] * it.step));
    }
    s.spend(Math.round(tot));
    if (tot > 0) audio.sfx('cash');
    if (this.start) {
      if (s.inv.gas < 20 || s.inv.food < 10) {
        // still let them go, but warn
      }
      game.go('departure');
    } else {
      game.pop();
      if (this.onDone) this.onDone();
    }
  },
  update(dt) {
    this.t += dt;
    this.flashT -= dt;
    if (this.advice && !this.advice.done) {
      this.advice.update(dt);
      if (input.anyKey()) { this.advice.finish(); input.consumeKeys(); input.consumeClicks(); }
      return;
    }
    if (this.advice && this.advice.done && !this.adviceDismissed) {
      if (input.anyKey()) { this.adviceDismissed = true; input.consumeKeys(); input.consumeClicks(); }
      return;
    }
    if (input.any('ArrowUp', 'w')) { this.sel = (this.sel + this.rows - 1) % this.rows; audio.sfx('select'); }
    if (input.any('ArrowDown', 's')) { this.sel = (this.sel + 1) % this.rows; audio.sfx('select'); }
    const it = ITEMS[this.sel];
    if (it) {
      if (input.any('ArrowRight', 'd', '+', '=')) this.adjust(it, 1);
      if (input.any('ArrowLeft', 'a', '-')) this.adjust(it, -1);
    }
    if (input.confirm()) {
      if (this.sel === ITEMS.length) this.checkout();
      else if (it) this.adjust(it, 1);
    }
    if (input.back()) this.checkout();
    if (input.hit('r') && this.start) this.suggest();
    // mouse
    ITEMS.forEach((it, i) => {
      const y = this.rowY(i);
      if (input.mouse.moved && input.hover(10, y, 460, 14)) this.sel = i;
      if (input.clickIn(338, y - 1, 18, 16)) { this.sel = i; this.adjust(it, -1); input.consumeClicks(); }
      else if (input.clickIn(384, y - 1, 18, 16)) { this.sel = i; this.adjust(it, 1); input.consumeClicks(); }
      else if (input.clickIn(10, y, 320, 15)) { this.sel = i; input.consumeClicks(); }
    });
    if (input.clickIn(300, 274, 170, 22)) this.checkout();
    if (this.start && input.clickIn(10, 274, 170, 22)) this.suggest();
  },
  suggest() {
    for (const it of ITEMS) this.cart[it.id] = 0;
    const s = game.state;
    if (s.season() === 'winter' || s.month === 10 || s.month === 2) SUGGEST.chains = 1; else SUGGEST.chains = 0;
    for (const it of ITEMS) {
      for (let k = 0; k < (SUGGEST[it.id] || 0); k++) if (!this.canAdd(it)) this.cart[it.id]++;
    }
    audio.sfx('cash');
    this.flash('Marisol fills your cart with "the usual."');
  },
  rowY(i) { return 44 + i * 14; },
  draw() {
    const s = game.state;
    gfx.rect(0, 0, 480, 300, '#20182c');
    gfx.panel(4, 4, 472, 292);
    gfx.text(this.storeName, 240, 14, { size: 10, head: true, align: 'center', color: PAL.hi });
    gfx.text(s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 18, 12, { size: 14, color: PAL.dim });
    gfx.text(`Cash: $${s.money}`, 462, 12, { size: 14, color: PAL.good, align: 'right' });
    gfx.text('ITEM', 34, 32 + 0, { size: 12, color: PAL.mute });
    gfx.text('HAVE', 270, 32, { size: 12, color: PAL.mute, align: 'right' });
    gfx.text('PRICE', 330, 32, { size: 12, color: PAL.mute, align: 'right' });
    gfx.text('BUY', 370, 32, { size: 12, color: PAL.mute, align: 'center' });
    gfx.text('COST', 458, 32, { size: 12, color: PAL.mute, align: 'right' });
    ITEMS.forEach((it, i) => {
      const y = this.rowY(i);
      const on = i === this.sel;
      if (on) gfx.alpha(0.35, () => gfx.rect(10, y - 1, 460, 14, PAL.edge));
      drawIcon(it.icon, 14, y - 2);
      const col = on ? PAL.hi : PAL.text;
      gfx.text(`${it.name}`, 34, y, { size: 14, color: col });
      gfx.text(`${Math.round(s.inv[it.id])}`, 270, y, { size: 14, color: PAL.dim, align: 'right' });
      const p = this.price(it);
      gfx.text(p === 0 ? 'free' : `$${p.toFixed(p % 1 ? 2 : 0)}/${it.step}`, 330, y, { size: 14, color: PAL.dim, align: 'right' });
      gfx.text('–', 347, y, { size: 14, color: this.cart[it.id] ? PAL.text : PAL.mute, align: 'center' });
      gfx.text(`${this.cart[it.id] * it.step}`, 370, y, { size: 14, color: this.cart[it.id] ? PAL.hi : PAL.mute, align: 'center' });
      gfx.text('+', 393, y, { size: 14, color: PAL.text, align: 'center' });
      const c = this.cart[it.id] * p;
      gfx.text(c ? `$${c.toFixed(0)}` : '', 458, y, { size: 14, color: PAL.text, align: 'right' });
    });
    const it = ITEMS[this.sel];
    const dy = this.rowY(ITEMS.length) + 2;
    gfx.rect(12, dy - 2, 456, 1, PAL.edgeLo);
    if (this.flashT > 0) gfx.text(this.flashMsg, 240, dy, { size: 14, color: PAL.warn, align: 'center' });
    else if (it) gfx.wrap(it.desc, 450, 12).slice(0, 2).forEach((l, i) => gfx.text(l, 240, dy - 1 + i * 11, { size: 12, color: PAL.dim, align: 'center' }));
    // footer buttons
    const doneOn = this.sel === ITEMS.length;
    if (this.start) {
      gfx.rect(10, 274, 170, 20, '#3d2b52');
      gfx.text('R: Marisol\'s picks', 95, 276, { size: 14, align: 'center', color: PAL.teal });
    }
    gfx.rect(300, 274, 170, 20, doneOn ? PAL.edge : '#3d2b52');
    gfx.text(`Pay $${this.total().toFixed(0)} & leave`, 385, 276, { size: 14, align: 'center', color: doneOn ? PAL.ink : PAL.hi, shadow: !doneOn });
    if (this.start && !this.adviceDismissed) {
      gfx.alpha(0.6, () => gfx.rect(0, 0, 480, 300, '#000'));
      gfx.panel(30, 60, 420, 180);
      this.advice.draw(44, 74);
      if (this.advice.done) continueHint(this.t, 240, 220);
    }
  },
}));
