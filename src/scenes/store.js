import { gfx, PAL, W, H, ui } from '../engine/gfx.js';
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
    // pointer
    const G = this.geo();
    ITEMS.forEach((it, i) => {
      const r = G.row(i);
      if (input.mouse.moved && input.hover(r.x, r.y, r.w, r.h)) this.sel = i;
      if (input.clickIn(...r.minus)) { this.sel = i; this.adjust(it, -1); input.consumeClicks(); }
      else if (input.clickIn(...r.plus)) { this.sel = i; this.adjust(it, 1); input.consumeClicks(); }
      else if (input.clickIn(r.x, r.y, r.w, r.h)) { this.sel = i; input.consumeClicks(); }
    });
    if (input.clickIn(...G.pay)) this.checkout();
    if (this.start && input.clickIn(...G.picks)) this.suggest();
  },
  // Screen geometry for the current shape.
  geo() {
    const P = ui.portrait;
    if (!P) {
      const ox = Math.round((W - 480) / 2), oy = Math.round((H - 300) / 2);
      return {
        P, ox, oy,
        row: (i) => {
          const y = oy + 44 + i * 14;
          return { x: ox + 10, y: y - 1, w: 460, h: 14, ty: y, minus: [ox + 336, y - 2, 22, 16], plus: [ox + 382, y - 2, 22, 16] };
        },
        descY: oy + 44 + ITEMS.length * 14 + 2,
        pay: [ox + 300, oy + 274, 170, 20],
        picks: [ox + 10, oy + 274, 170, 20],
      };
    }
    const top = 76;
    const rh = Math.max(30, Math.min(46, Math.floor((H - top - 200) / ITEMS.length)));
    return {
      P, ox: 0, oy: 0, rh, top,
      row: (i) => {
        const y = top + i * rh;
        const bh = Math.min(rh - 4, 38);
        return { x: 6, y, w: W - 12, h: rh, ty: y, minus: [262, y + (rh - bh) / 2, 50, bh], plus: [370, y + (rh - bh) / 2, 50, bh] };
      },
      descY: top + ITEMS.length * rh + 8,
      pay: [W / 2 + 6, H - 72, W / 2 - 18, 52],
      picks: [12, H - 72, W / 2 - 18, 52],
    };
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
  draw() {
    const s = game.state;
    const G = this.geo();
    const P = G.P;
    gfx.rect(0, 0, W, H, '#20182c');
    if (P) gfx.panel(0, 0, W, H); else gfx.panel(G.ox + 4, G.oy + 4, 472, 292);
    const ox = G.ox, oy = G.oy;
    const L = P ? 14 : ox + 18, R = P ? W - 14 : ox + 462;
    gfx.text(this.storeName, W / 2, oy + (P ? 16 : 14), { size: P ? 12 : 10, head: true, align: 'center', color: PAL.hi });
    const date = s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (P) {
      gfx.text(date, L, 38, { size: 18, color: PAL.dim });
      gfx.text(`Cash: $${s.money}`, R, 38, { size: 18, color: PAL.good, align: 'right' });
    } else {
      gfx.text(date, L, oy + 12, { size: 14, color: PAL.dim });
      gfx.text(`Cash: $${s.money}`, R, oy + 12, { size: 14, color: PAL.good, align: 'right' });
      gfx.text('ITEM', ox + 34, oy + 32, { size: 12, color: PAL.mute });
      gfx.text('HAVE', ox + 270, oy + 32, { size: 12, color: PAL.mute, align: 'right' });
      gfx.text('PRICE', ox + 330, oy + 32, { size: 12, color: PAL.mute, align: 'right' });
      gfx.text('BUY', ox + 370, oy + 32, { size: 12, color: PAL.mute, align: 'center' });
      gfx.text('COST', ox + 458, oy + 32, { size: 12, color: PAL.mute, align: 'right' });
    }
    ITEMS.forEach((it, i) => {
      const r = G.row(i);
      const on = i === this.sel;
      const p = this.price(it);
      const priceTxt = p === 0 ? 'free' : `$${p.toFixed(p % 1 ? 2 : 0)}/${it.step}`;
      const c = this.cart[it.id] * p;
      const col = on ? PAL.hi : PAL.text;
      if (on) gfx.alpha(0.35, () => gfx.rect(r.x, r.y, r.w, r.h, PAL.edge));
      if (P) {
        const twoLine = G.rh >= 38;
        const ny = r.y + (twoLine ? 3 : (G.rh - 20) / 2);
        drawIcon(it.icon, 12, r.y + (G.rh - 16) / 2);
        gfx.text(it.name, 36, ny, { size: 20, color: col });
        if (twoLine) gfx.text(`have ${Math.round(s.inv[it.id])} · ${priceTxt}`, 36, ny + 19, { size: 16, color: PAL.dim });
        else gfx.text(`(${Math.round(s.inv[it.id])})`, 210, ny + 2, { size: 16, color: PAL.dim, align: 'right' });
        for (const [b, lbl, en] of [[r.minus, '−', this.cart[it.id] > 0], [r.plus, '+', true]]) {
          gfx.rect(b[0], b[1], b[2], b[3], en ? '#4a3560' : '#2e2140');
          gfx.strokeRect(b[0], b[1], b[2], b[3], en ? PAL.edge : PAL.edgeLo);
          gfx.text(lbl, b[0] + b[2] / 2, b[1] + b[3] / 2 - 12, { size: 24, align: 'center', color: en ? PAL.text : PAL.mute });
        }
        gfx.text(`${this.cart[it.id] * it.step}`, 341, r.y + (G.rh - 22) / 2, { size: 22, color: this.cart[it.id] ? PAL.hi : PAL.mute, align: 'center' });
        gfx.text(c ? `$${c.toFixed(0)}` : '', W - 12, r.y + (G.rh - 20) / 2, { size: 18, color: PAL.text, align: 'right' });
      } else {
        const y = r.ty;
        drawIcon(it.icon, ox + 14, y - 2);
        gfx.text(`${it.name}`, ox + 34, y, { size: 14, color: col });
        gfx.text(`${Math.round(s.inv[it.id])}`, ox + 270, y, { size: 14, color: PAL.dim, align: 'right' });
        gfx.text(priceTxt, ox + 330, y, { size: 14, color: PAL.dim, align: 'right' });
        gfx.text('–', ox + 347, y, { size: 14, color: this.cart[it.id] ? PAL.text : PAL.mute, align: 'center' });
        gfx.text(`${this.cart[it.id] * it.step}`, ox + 370, y, { size: 14, color: this.cart[it.id] ? PAL.hi : PAL.mute, align: 'center' });
        gfx.text('+', ox + 393, y, { size: 14, color: PAL.text, align: 'center' });
        gfx.text(c ? `$${c.toFixed(0)}` : '', ox + 458, y, { size: 14, color: PAL.text, align: 'right' });
      }
    });
    const it = ITEMS[this.sel];
    const dy = G.descY;
    const dw = P ? W - 30 : 450, dfs = P ? 18 : 12, dlh = P ? 22 : 11;
    gfx.rect(P ? 12 : ox + 12, dy - 2, P ? W - 24 : 456, 1, PAL.edgeLo);
    if (this.flashT > 0) gfx.text(this.flashMsg, W / 2, dy + 2, { size: P ? 18 : 14, color: PAL.warn, align: 'center' });
    else if (it) gfx.wrap(it.desc, dw, dfs).slice(0, P ? 3 : 2).forEach((l, i) => gfx.text(l, W / 2, dy - 1 + i * dlh + (P ? 4 : 0), { size: dfs, color: PAL.dim, align: 'center' }));
    // footer buttons
    const doneOn = this.sel === ITEMS.length;
    const bfs = P ? 20 : 14;
    if (this.start) {
      const b = G.picks;
      gfx.rect(b[0], b[1], b[2], b[3], '#3d2b52');
      if (P) gfx.strokeRect(b[0], b[1], b[2], b[3], PAL.teal);
      gfx.text(P ? "Marisol's picks" : 'R: Marisol\'s picks', b[0] + b[2] / 2, b[1] + (b[3] - bfs) / 2, { size: bfs, align: 'center', color: PAL.teal });
    }
    const b = G.pay;
    gfx.rect(b[0], b[1], b[2], b[3], doneOn || P ? PAL.edge : '#3d2b52');
    gfx.text(`Pay $${this.total().toFixed(0)} & leave`, b[0] + b[2] / 2, b[1] + (b[3] - bfs) / 2, { size: bfs, align: 'center', color: doneOn || P ? PAL.ink : PAL.hi, shadow: !(doneOn || P) });
    if (this.start && !this.adviceDismissed) {
      gfx.alpha(0.6, () => gfx.rect(0, 0, W, H, '#000'));
      const aw = P ? W - 24 : Math.min(420, W - 40);
      if (!this.advice || this.advW !== aw || this.advF !== ui.fs) {
        const shown = this.advice ? this.advice.shown : 0;
        this.advice = new Typewriter(ADVICE, aw - 28, ui.fs, 90);
        this.advice.shown = Math.min(shown, this.advice.total);
        this.advW = aw; this.advF = ui.fs;
      }
      const ah = this.advice.height(ui.lh) + 50;
      const ay = Math.max(6, (H - ah) / 2);
      gfx.panel((W - aw) / 2, ay, aw, ah);
      this.advice.draw((W - aw) / 2 + 14, ay + 14, PAL.text, ui.lh);
      if (this.advice.done) continueHint(this.t, W / 2, ay + ah - 22);
    }
  },
}));
