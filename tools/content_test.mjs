// Content harness: proves events_extra.js and talk.js are safe to load and run.
//
//   node tools/content_test.mjs
//
// It builds a spread of GameStates (different nodes, legs, biomes, weather,
// seasons, tank levels, sleep modes, inventories), then calls every event's
// when/weight/run, every choice's when/run, and every minigame's after() with
// several fake outcomes. Everything must return a Result with text, and
// nothing may throw. It also checks that TALK/REVIEWS cover every route node.
import { GameState } from '../src/game/state.js';
import { EVENTS } from '../src/data/events.js';
import { EVENTS_EXTRA } from '../src/data/events_extra.js';
import { NODES } from '../src/data/route.js';
import { TALK, REVIEWS } from '../src/data/talk.js';

let failures = 0;
let checks = 0;
const fail = (msg) => { failures++; console.error('  FAIL: ' + msg); };
const ok = (label) => { checks++; if (process.env.VERBOSE) console.log('  ok: ' + label); };

// ---------- deterministic-ish randomness so failures repeat ----------
let seed = 0xC0FFEE;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xFFFFFFFF; };
const pickOne = (arr) => arr[Math.floor(rnd() * arr.length)];
const ripick = (a, b) => a + Math.floor(rnd() * (b - a + 1));

// ---------- state fixtures ----------
function baseState({ month = 5, difficulty = 'fresh', node = 'san_diego', legTo = null, weather = null, tank = 30, sleep = 'rvpark', flags = {}, money = 2200, rv = 80, pace = 'cruise' } = {}) {
  const s = new GameState();
  s.reset(difficulty, month);
  s.node = node;
  const dest = legTo || pickOne(NODES[node].next.map((l) => l.to));
  const leg = NODES[node].next.find((l) => l.to === dest);
  s.leg = leg ? { from: node, to: leg.to, miles: leg.miles, done: Math.floor(leg.miles / 2) } : null;
  s.weather = weather || s.weather;
  s.tank = tank;
  s.sleep = sleep;
  s.flags = { ...flags };
  s.money = money;
  s.rv = rv;
  s.pace = pace;
  s.vibes = ripick(30, 90);
  return s;
}

const clone = (s) => GameState.fromJSON(JSON.parse(JSON.stringify(s)));

// A spread wide enough that gated events (biome/weather/season/leg/flag) fire.
function fixtures() {
  const out = [];
  const months = [0, 1, 3, 5, 7, 9, 10];
  const weathers = ['sunny', 'hot', 'scorching', 'cloudy', 'fog', 'rain', 'storm', 'snow', 'windy', 'smoke'];
  const nodes = Object.keys(NODES);
  for (const id of nodes) {
    const n = NODES[id];
    out.push(baseState({ node: id, month: pickOne(months), weather: pickOne(weathers), tank: pickOne([0, 40, 70, 95]), sleep: pickOne(['rvpark', 'walmart', 'boondock']) }));
    for (const leg of n.next) {
      for (const weather of [pickOne(weathers), pickOne(weathers)]) {
        out.push(baseState({ node: id, legTo: leg.to, month: pickOne(months), weather, tank: pickOne([10, 55, 90]) }));
      }
    }
  }
  // Explicit stress cases: broke, damaged, no items, all the flags on.
  out.push(baseState({ money: 0, rv: 12, tank: 99, sleep: 'walmart', month: 0, weather: 'snow', flags: { helpedMotorist: 1 } }));
  out.push(baseState({ money: 40, tank: 100, sleep: 'boondock', month: 8, weather: 'smoke' }));
  const empty = baseState({});
  for (const it of Object.keys(empty.inv)) empty.inv[it] = 0;
  out.push(empty);
  // Different party states: everybody healthy, everybody ailing, some gone.
  const sick = baseState({});
  for (const m of sick.members) { m.health = 20; m.ailment = 'a head cold'; m.ailDays = 3; }
  out.push(sick);
  const shrinking = baseState({});
  shrinking.members.find((m) => m.id === 'muskrat').gone = true;
  shrinking.members.find((m) => m.id === 'pookah').gone = true;
  out.push(shrinking);
  const rich = baseState({ money: 9000, tank: 60 });
  for (const it of Object.keys(rich.inv)) rich.inv[it] = 40;
  out.push(rich);
  // Nobody left in the RV at all (events must still return a Result, not throw).
  const empty_crew = baseState({});
  for (const m of empty_crew.members) m.gone = true;
  out.push(empty_crew);
  // Only one cat still aboard.
  const one_cat = baseState({});
  for (const m of one_cat.members) if (m.id !== 'pookah') m.gone = true;
  one_cat.inv.litter = 0;
  out.push(one_cat);
  return out;
}

// ---------- result validation ----------
function checkResult(r, where, { allowNull = true } = {}) {
  checks++;
  if (r === null || r === undefined) {
    if (!allowNull) fail(`${where}: returned ${r}, expected a Result`);
    return;
  }
  if (typeof r !== 'object') return fail(`${where}: Result is ${typeof r}`);
  if (typeof r.text !== 'string' || !r.text.trim()) fail(`${where}: Result has no text`);
  else if (r.text.length < 8) fail(`${where}: Result text suspiciously short (${JSON.stringify(r.text)})`);
  if (r.title != null && typeof r.title !== 'string') fail(`${where}: title is not a string`);
  if (r.who != null && !['joe', 'caity', 'bela', 'muskrat', 'pookah'].includes(r.who)) fail(`${where}: unknown portrait who=${r.who}`);
  if (r.mood != null && !['neutral', 'happy', 'sick'].includes(r.mood)) fail(`${where}: unknown mood ${r.mood}`);
  if (r.tone != null && !['good', 'bad', 'neutral'].includes(r.tone)) fail(`${where}: unknown tone ${r.tone}`);
  if (r.choices != null) {
    if (!Array.isArray(r.choices) || !r.choices.length) fail(`${where}: choices is not a non-empty array`);
    else {
      for (const c of r.choices) {
        if (typeof c.label !== 'string' || !c.label.trim()) fail(`${where}: choice without label`);
        if (typeof c.run !== 'function') fail(`${where}: choice "${c.label}" has no run()`);
      }
    }
  }
  if (r.minigame != null) {
    if (!['catchase', 'forage', 'freeway'].includes(r.minigame.name)) fail(`${where}: unknown minigame ${r.minigame.name}`);
    if (r.minigame.after != null && typeof r.minigame.after !== 'function') fail(`${where}: minigame.after is not a function`);
  }
}

// ---------- events ----------
console.log('events_extra.js');
const allIds = new Set();
for (const e of [...EVENTS, ...EVENTS_EXTRA]) {
  if (allIds.has(e.id)) fail(`duplicate event id: ${e.id}`);
  allIds.add(e.id);
}
if (EVENTS_EXTRA.length < 50) fail(`only ${EVENTS_EXTRA.length} events, expected 50+`);

const states = fixtures();
const outcomeSets = [
  { caught: true, hits: 0, score: 9 },
  { caught: false, hits: 3, score: 0 },
  { caught: false, hits: 0, score: 0 },
  {},
  undefined,
];

let runCount = 0;
let choiceCount = 0;
let afterCount = 0;
let gatedFired = 0;
let rvCount = 0;

for (const e of EVENTS_EXTRA) {
  if (typeof e.id !== 'string' || !e.id) fail('event with no id');
  if (e.cat != null && !['rv', 'general'].includes(e.cat)) fail(`${e.id}: bad cat ${e.cat}`);
  if (e.cat === 'rv') rvCount++;
  if (typeof e.weight !== 'number' && typeof e.weight !== 'function') fail(`${e.id}: weight is not number or function`);
  if (e.when != null && typeof e.when !== 'function') fail(`${e.id}: when is not a function`);
  if (typeof e.run !== 'function') fail(`${e.id}: no run()`);

  for (const st of states) {
    const s = clone(st);
    // when()
    let fires = true;
    if (e.when) {
      try { fires = !!e.when(s); checks++; } catch (err) { fail(`${e.id}: when() threw — ${err.message}`); }
    }
    if (fires) gatedFired++;
    // weight()
    if (typeof e.weight === 'function') {
      try {
        const w = e.weight(s); checks++;
        if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) fail(`${e.id}: weight() returned ${w}`);
      } catch (err) { fail(`${e.id}: weight() threw — ${err.message}`); }
    }
    // run()
    try {
      const r = e.run(s);
      runCount++;
      checkResult(r, `${e.id}.run()`);
      if (r && r.choices) {
        for (const c of r.choices) {
          if (c.when) {
            try { c.when(s); checks++; } catch (err) { fail(`${e.id}: choice when() threw — ${err.message}`); }
          }
          const s2 = clone(s);
          try {
            const cr = c.run(s2);
            choiceCount++;
            checkResult(cr, `${e.id} → "${c.label}"`);
            if (cr && cr.choices) for (const c2 of cr.choices) checkResult(c2.run(clone(s2)), `${e.id} → "${c.label}" → "${c2.label}"`);
          } catch (err) { fail(`${e.id} → "${c.label}": threw — ${err.stack.split('\n')[0]}`); }
        }
      }
      if (r && r.minigame && r.minigame.after) {
        for (const o of outcomeSets) {
          const s3 = clone(s);
          try {
            const ar = r.minigame.after(s3, o);
            afterCount++;
            checkResult(ar, `${e.id}.minigame.after(${JSON.stringify(o)})`, { allowNull: false });
          } catch (err) { fail(`${e.id}.minigame.after(${JSON.stringify(o)}): threw — ${err.message}`); }
        }
      }
    } catch (err) {
      fail(`${e.id}.run(): threw — ${err.stack.split('\n')[0]}`);
    }
    // mutation sanity: no NaN leaked into core numbers
    checks++;
    for (const k of ['money', 'vibes', 'rv', 'tank']) {
      if (!Number.isFinite(s[k])) fail(`${e.id}: state.${k} became ${s[k]}`);
    }
    for (const m of s.members) if (!Number.isFinite(m.health)) fail(`${e.id}: ${m.id}.health became ${m.health}`);
    for (const [k, v] of Object.entries(s.inv)) if (!Number.isFinite(v)) fail(`${e.id}: inv.${k} became ${v}`);
  }
  ok(e.id);
}

// A few events must actually gate on the world, or the "when" wiring is dead.
const gated = EVENTS_EXTRA.filter((e) => e.when);
if (gated.length < 8) fail(`only ${gated.length} events use when(), expected 8+`);
if (gatedFired === 0) fail('no gated event fired on any fixture');

// ---------- talk ----------
console.log('talk.js');
const nodeIds = Object.keys(NODES);
const talkIds = Object.keys(TALK);
const reviewIds = Object.keys(REVIEWS);
let lineCount = 0;
let reviewCount = 0;

for (const id of nodeIds) {
  const lines = TALK[id];
  if (!Array.isArray(lines)) { fail(`TALK missing node "${id}"`); continue; }
  if (lines.length < 3 || lines.length > 4) fail(`TALK["${id}"] has ${lines.length} lines, expected 3-4`);
  for (const [i, l] of lines.entries()) {
    checks++;
    if (!l || typeof l.who !== 'string' || !l.who.trim()) fail(`TALK["${id}"][${i}] has no who`);
    if (typeof l.text !== 'string' || l.text.length < 30) fail(`TALK["${id}"][${i}] text too short`);
    if (typeof l.text === 'string' && !/[.!?]"?$/.test(l.text.trim())) fail(`TALK["${id}"][${i}] text does not end like a sentence`);
    lineCount++;
  }
  const revs = REVIEWS[id];
  if (!Array.isArray(revs)) { fail(`REVIEWS missing node "${id}"`); continue; }
  if (revs.length !== 2) fail(`REVIEWS["${id}"] has ${revs.length} reviews, expected 2`);
  for (const [i, r] of revs.entries()) {
    checks++;
    if (typeof r !== 'string') { fail(`REVIEWS["${id}"][${i}] is not a string`); continue; }
    if (!/^★{1,5}☆{0,4} "/.test(r)) fail(`REVIEWS["${id}"][${i}] missing star rating`);
    if (!r.includes('—')) fail(`REVIEWS["${id}"][${i}] missing reviewer`);
    if (r.length < 40) fail(`REVIEWS["${id}"][${i}] too short`);
    reviewCount++;
  }
}
for (const id of talkIds) if (!nodeIds.includes(id)) fail(`TALK has unknown node "${id}"`);
for (const id of reviewIds) if (!nodeIds.includes(id)) fail(`REVIEWS has unknown node "${id}"`);

// ---------- summary ----------
const byCat = EVENTS_EXTRA.reduce((a, e) => { const k = e.cat || 'general'; a[k] = (a[k] || 0) + 1; return a; }, {});
console.log('');
console.log(`events: ${EVENTS_EXTRA.length} (rv ${rvCount}, general ${byCat.general || 0}), gated ${gated.length}`);
console.log(`checks: ${runCount} run() calls, ${choiceCount} choice runs, ${afterCount} minigame outcomes, ${gatedFired} when() trues`);
console.log(`talk: ${nodeIds.length} nodes, ${lineCount} lines, ${reviewCount} reviews`);
if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(`\nall ${checks} assertions passed`);
