// Headless balance simulation: plays N trips with a simple bot.
// node tools/balance_sim.mjs [runs] [difficulty] [month]
import { GameState, chance } from '../src/game/state.js';
import { EVENTS } from '../src/data/events.js';
import { EVENTS_EXTRA } from '../src/data/events_extra.js';
import { ITEMS, ITEM } from '../src/data/items.js';

const [runs = 200, diff = 'fresh', month = 4] = process.argv.slice(2).map((x, i) => (i === 1 ? x : Number(x)));
const ALL = [...EVENTS, ...EVENTS_EXTRA];
const SUGGEST = { gas: 4, food: 5, kibble: 3, catfood: 6, litter: 3, propane: 2, water: 2, tires: 1, parts: 1, chains: 1, ducttape: 2, coffee: 2, treats: 1, toiletpaper: 3, firstaid: 1 };

function pickEvent(s, cat) {
  const pool = ALL.filter((e) => (e.cat || 'general') === cat && (!e.once || !s.seen[e.id]) && (!e.when || e.when(s)));
  const w = pool.map((e) => Math.max(0, typeof e.weight === 'function' ? e.weight(s) : (e.weight ?? 1)));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return null;
}
function resolve(s, r, depth = 0) {
  if (!r || depth > 5) return;
  const ch = (r.choices || []).filter((c) => !c.when || c.when(s));
  if (ch.length) resolve(s, ch[Math.floor(Math.random() * ch.length)].run(s), depth + 1);
  if (r.minigame && r.minigame.after) resolve(s, r.minigame.after(s, { caught: chance(0.6), hits: Math.floor(Math.random() * 3), berries: 15, gas: 1 }), depth + 1);
}
function buy(s, item, steps, price) {
  for (let i = 0; i < steps; i++) {
    const it = ITEM[item];
    const p = item === 'gas' ? s.gasPrice() * 10 : price ?? it.price;
    if (s.money < p || s.inv[item] + it.step > it.max + it.step - 1) return;
    s.spend(p); s.add(item, it.step);
  }
}
function restock(s) {
  const need = { gas: Math.ceil((70 - s.inv.gas) / 10), food: Math.ceil((40 - s.inv.food) / 10), kibble: Math.ceil((10 - s.inv.kibble) / 5), catfood: Math.ceil((20 - s.inv.catfood) / 6), litter: Math.ceil((10 - s.inv.litter) / 10), toiletpaper: Math.ceil((6 - s.inv.toiletpaper) / 4), propane: Math.ceil((4 - s.inv.propane) / 5) };
  for (const [k, n] of Object.entries(need)) if (n > 0) buy(s, k, n, k === 'gas' ? undefined : Math.round(ITEM[k].price * 1.2));
  if (s.tank > 60) { s.spend(15); s.tank = 0; }
}

const res = [];
for (let r = 0; r < runs; r++) {
  const s = new GameState();
  s.reset(diff, month);
  for (const [k, n] of Object.entries(SUGGEST)) buy(s, k, n);
  s.sleep = 'rvpark';
  if (r === 0 && process.env.DBG) console.log(JSON.stringify(s.inv), s.money);
  let guard = 0, over = null;
  while (guard++ < 200) {
    if (!s.leg) {
      if (s.node === 'portland') break;
      const n = s.nodeData;
      if (['town', 'casino'].includes(n.kind)) restock(s);
      if (n.kind === 'pass' && s.weather === 'snow' && !s.has('chains')) s.loseDays(1);
      s.startLeg(Math.floor(Math.random() * n.next.length));
      if (s.money < 300) s.sleep = 'walmart';
    }
    const d = s.driveDay();
    if (d.notes.some((x) => x.outOfGas)) { s.spend(180); s.add('gas', 8); }
    if (d.miles > 0) {
      const k = Math.min(1, d.frac * 1.15);
      if (chance(s.breakdownRisk() * k)) { const e = pickEvent(s, 'rv'); if (e) { s.stats.breakdowns++; resolve(s, e.run(s)); } }
      else if (chance(s.eventChance() * k)) { const e = pickEvent(s, 'general'); if (e) { s.stats.events++; resolve(s, e.run(s)); } }
    }
    if (d.dayOver) s.endDay();
    if (s.rv <= 0) { if (s.money >= 900) { s.spend(900); s.rv = 55; } else { over = 'rv'; break; } }
    if (!s.humans().length) { over = 'humans'; break; }
    if (d.arrived) { s.node = s.leg.to; s.leg = null; s.visited.push(s.node); }
  }
  res.push({ over, day: s.day, money: s.money, rv: s.rv, gone: s.members.filter((m) => m.gone).length, vibes: s.vibes, health: Math.round(s.avgHealth()), score: over ? 0 : s.score().total, ev: s.stats.events, bd: s.stats.breakdowns });
}
const avg = (k) => Math.round(res.reduce((a, r) => a + r[k], 0) / res.length);
const wins = res.filter((r) => !r.over);
console.log(`runs=${runs} diff=${diff} month=${month}`);
console.log(`win rate ${Math.round((wins.length / runs) * 100)}%  rv-deaths ${res.filter((r) => r.over === 'rv').length}  human-loss ${res.filter((r) => r.over === 'humans').length}`);
console.log(`avg days ${avg('day')} money ${avg('money')} rv ${avg('rv')} gone ${(res.reduce((a, r) => a + r.gone, 0) / runs).toFixed(2)} vibes ${avg('vibes')} health ${avg('health')} events ${avg('ev')} breakdowns ${avg('bd')}`);
console.log(`avg win score ${wins.length ? Math.round(wins.reduce((a, r) => a + r.score, 0) / wins.length) : 0}`);
