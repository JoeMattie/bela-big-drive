// Game state + daily simulation. Pure logic; scenes render it.
import { NODES, START, milesToEnd } from '../data/route.js';
import { ITEMS, ITEM, DIFFICULTIES, MONTHS } from '../data/items.js';
import { PARTY, MEMBER, AILMENTS, DEPARTURES } from '../data/party.js';

export const PACES = {
  mosey: { name: 'Moseying', miles: 120, mpg: 8.4, desc: 'Scenic stops, long lunches. Easy on everyone.' },
  cruise: { name: 'Cruising', miles: 180, mpg: 7.5, desc: 'A steady 62 mph in the right lane.' },
  floorit: { name: 'Floor It', miles: 250, mpg: 6.2, desc: 'Pedal down, V10 screaming. Hard on the RV and the crew.' },
};
export const SNACKS = {
  gourmet: { name: 'Farmers-Market Fancy', mult: 1.35, desc: 'Fresh fruit, real meals. Healthy & happy.' },
  normal: { name: 'Regular Meals', mult: 1.0, desc: 'Sandwiches, pasta, the occasional taco.' },
  gas: { name: 'Gas Station Snacks', mult: 0.65, desc: 'Jerky, cheese crackers, mystery burritos. Cheap but grim.' },
};
export const SLEEPS = {
  rvpark: { name: 'RV Park', cost: 65, desc: 'Full hookups: dumps the tank, refills water, hot showers. $65/night.' },
  walmart: { name: 'Big-Box Parking Lot', cost: 0, desc: 'Free! Sodium lights, idling semis, the occasional knock.' },
  boondock: { name: 'Boondocking', cost: 0, desc: 'Free & gorgeous. No hookups, uses propane, rangers may move you along.' },
};

export const WEATHER = {
  sunny: { name: 'Sunny', icon: '☀', speed: 1 },
  hot: { name: 'Hot', icon: '☀', speed: 1 },
  scorching: { name: 'Scorching', icon: '♨', speed: 0.95 },
  cloudy: { name: 'Cloudy', icon: '☁', speed: 1 },
  fog: { name: 'Foggy', icon: '≈', speed: 0.8 },
  rain: { name: 'Rainy', icon: '☂', speed: 0.9 },
  storm: { name: 'Stormy', icon: '⚡', speed: 0.7 },
  snow: { name: 'Snowy', icon: '❄', speed: 0.55 },
  windy: { name: 'Windy', icon: '~', speed: 0.85 },
  smoke: { name: 'Wildfire Smoke', icon: '▒', speed: 0.85 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export class GameState {
  constructor() {
    this.reset();
  }

  reset(difficultyId = 'fresh', month = 5) {
    const d = DIFFICULTIES.find((x) => x.id === difficultyId) || DIFFICULTIES[0];
    this.difficulty = d.id;
    this.money = d.money;
    this.rv = d.rv;            // RV condition 0..100
    this.tank = 10;            // black tank fill %
    this.inv = Object.fromEntries(ITEMS.map((i) => [i.id, 0]));
    this.inv.gas = 30;         // what's left in the tank
    this.inv.water = 20;
    this.members = PARTY.map((p) => ({ id: p.id, health: 85, ailment: null, ailDays: 0, gone: false }));
    this.vibes = 70;
    this.month = month;
    this.date = new Date(2026, month, 1, 9);
    this.day = 0;
    this.node = START;
    this.leg = null;           // {from, to, miles, done}
    this.milesTotal = 0;
    this.pace = 'cruise';
    this.snacks = 'normal';
    this.sleep = 'rvpark';
    this.weather = 'sunny';
    this.visited = [START];
    this.journal = [];
    this.flags = {};
    this.stats = { tickets: 0, flats: 0, breakdowns: 0, berries: 0, catsCaught: 0, casino: 0, events: 0, fed: 0 };
    this.seen = {};
    this.rollWeather();
  }

  // ---------- queries ----------
  get diff() { return DIFFICULTIES.find((x) => x.id === this.difficulty); }
  get nodeData() { return NODES[this.node]; }
  member(id) { return this.members.find((m) => m.id === id); }
  alive(id) { const m = this.member(id); return !!m && !m.gone; }
  present() { return this.members.filter((m) => !m.gone); }
  humans() { return this.present().filter((m) => MEMBER[m.id].species === 'human'); }
  pets() { return this.present().filter((m) => MEMBER[m.id].species !== 'human'); }
  cats() { return this.present().filter((m) => MEMBER[m.id].species === 'cat'); }
  randomPresent(filter = () => true) {
    const list = this.present().filter((m) => filter(MEMBER[m.id], m));
    return list.length ? pick(list) : null;
  }
  name(id) { return MEMBER[id].name; }
  monthName() { return MONTHS[this.date.getMonth()]; }
  season() {
    const m = this.date.getMonth();
    if (m === 11 || m <= 1) return 'winter';
    if (m <= 4) return 'spring';
    if (m <= 8) return 'summer';
    return 'fall';
  }
  dateStr() {
    return this.date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  }
  milesToGo() {
    if (this.leg) return this.leg.miles - this.leg.done + milesToEnd(this.leg.to);
    return milesToEnd(this.node);
  }
  biome() {
    if (this.leg) return NODES[this.leg.to].biome || 'coast';
    return this.nodeData.biome || 'coast';
  }
  lat() {
    if (!this.leg) return this.nodeData.lat;
    const a = NODES[this.leg.from], b = NODES[this.leg.to];
    return a.lat + (b.lat - a.lat) * (this.leg.done / this.leg.miles);
  }
  inOregon() { return this.lat() > 42.0; }
  gasPrice() {
    const n = this.nodeData;
    return n.gas || (this.inOregon() ? 4.4 : 5.6);
  }
  healthWord(h) {
    if (h >= 80) return 'great';
    if (h >= 55) return 'good';
    if (h >= 30) return 'poor';
    return 'very poor';
  }
  avgHealth() {
    const p = this.present();
    return p.length ? p.reduce((a, m) => a + m.health, 0) / p.length : 0;
  }
  vibesWord() {
    const v = this.vibes;
    if (v >= 85) return 'Immaculate';
    if (v >= 65) return 'Good';
    if (v >= 45) return 'Okay';
    if (v >= 25) return 'Tense';
    return 'Mutinous';
  }

  // ---------- mutation helpers (used by events) ----------
  add(item, n) {
    const def = ITEM[item];
    const max = def ? def.max : Infinity;
    this.inv[item] = Math.max(0, Math.min(max, Math.round((this.inv[item] + n) * 10) / 10));
  }
  has(item, n = 1) { return this.inv[item] >= n; }
  spend(n) { this.money = Math.round(this.money - n); }
  earn(n) { this.money = Math.round(this.money + n); }
  addVibes(n) { this.vibes = Math.max(0, Math.min(100, Math.round(this.vibes + n))); }
  damageRV(n) { this.rv = Math.max(0, Math.min(100, Math.round(this.rv - n))); }
  repairRV(n) { this.damageRV(-n); }
  hurt(id, n, ailment = null) {
    const m = this.member(id);
    if (!m || m.gone) return;
    m.health = Math.max(0, Math.min(100, Math.round(m.health - n)));
    if (ailment) { m.ailment = ailment; m.ailDays = irand(2, 5); }
  }
  heal(id, n) { this.hurt(id, -n); }
  healAll(n) { this.present().forEach((m) => this.heal(m.id, n)); }
  hurtAll(n) { this.present().forEach((m) => this.hurt(m.id, n)); }
  sicken(id, ailment) {
    const m = this.member(id);
    if (!m || m.gone) return null;
    const sp = MEMBER[id].species;
    m.ailment = ailment || pick(AILMENTS[sp]);
    m.ailDays = irand(2, 5);
    m.health = Math.max(1, m.health - irand(8, 18));
    return m.ailment;
  }
  cure(id) { const m = this.member(id); if (m) { m.ailment = null; m.ailDays = 0; } }
  loseDays(n) {
    for (let i = 0; i < n; i++) this.advanceDate();
  }
  log(text) { this.journal.push({ day: this.day, date: this.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), where: this.whereName(), text }); }
  whereName() {
    if (!this.leg) return this.nodeData.name;
    return 'near ' + (this.leg.done < this.leg.miles / 2 ? NODES[this.leg.from].name : NODES[this.leg.to].name);
  }

  snapshot() {
    return {
      money: this.money, rv: this.rv, vibes: this.vibes, inv: { ...this.inv },
      health: Object.fromEntries(this.members.map((m) => [m.id, m.health])),
      gone: Object.fromEntries(this.members.map((m) => [m.id, m.gone])),
      days: this.day,
    };
  }
  // Human-readable list of changes since a snapshot: [{text, good}]
  diff(s) {
    const out = [];
    if (this.money !== s.money) out.push({ text: (this.money > s.money ? '+$' : '−$') + Math.abs(this.money - s.money), good: this.money > s.money });
    for (const it of ITEMS) {
      const d = Math.round((this.inv[it.id] - s.inv[it.id]) * 10) / 10;
      if (d) out.push({ text: `${d > 0 ? '+' : '−'}${Math.abs(d)} ${it.unit} ${it.name}`, good: d > 0, icon: it.icon });
    }
    if (this.rv !== s.rv) out.push({ text: `RV ${this.rv > s.rv ? '+' : '−'}${Math.abs(this.rv - s.rv)}%`, good: this.rv > s.rv });
    for (const m of this.members) {
      const d = m.health - s.health[m.id];
      if (d && !m.gone) out.push({ text: `${MEMBER[m.id].name} ${d > 0 ? '+' : '−'}${Math.abs(d)}♥`, good: d > 0 });
    }
    if (this.vibes !== s.vibes) out.push({ text: `Vibes ${this.vibes > s.vibes ? '+' : '−'}${Math.abs(this.vibes - s.vibes)}`, good: this.vibes > s.vibes });
    if (this.day !== s.days) out.push({ text: `${this.day - s.days} day${this.day - s.days > 1 ? 's' : ''} lost`, good: false });
    return out;
  }

  // ---------- travel ----------
  startLeg(index = 0) {
    const l = this.nodeData.next[index];
    this.leg = { from: this.node, to: l.to, miles: l.miles, done: 0 };
  }

  milesPerDay() {
    let m = PACES[this.pace].miles;
    m *= WEATHER[this.weather].speed;
    if (this.rv < 30) m *= 0.75;
    if (this.biome() === 'city') m *= 0.8; // traffic
    if (this.biome() === 'pass') m *= 0.85;
    return Math.max(20, Math.round(m * rand(0.9, 1.1)));
  }
  mpg() {
    let g = PACES[this.pace].mpg;
    if (this.biome() === 'pass') g *= 0.8;
    if (this.weather === 'windy') g *= 0.85;
    if (this.biome() === 'city') g *= 0.85;
    return g;
  }

  advanceDate() {
    this.date = new Date(this.date.getTime() + 86400000);
    this.day++;
    this.rollWeather();
  }

  rollWeather() {
    const mo = this.date.getMonth();
    const lat = this.leg ? this.lat() : (this.nodeData ? this.nodeData.lat : 33);
    const b = this.leg ? (NODES[this.leg.to].biome || 'coast') : (this.nodeData?.biome || 'coast');
    const s = this.season();
    const north = lat > 41.5;
    const r = Math.random();
    let w = 'sunny';
    if (s === 'winter') {
      if ((b === 'pass' || b === 'forest') && r < 0.35) w = 'snow';
      else if (north && r < 0.65) w = r < 0.12 ? 'storm' : 'rain';
      else if (b === 'valley' && r < 0.35) w = 'fog';
      else if (r < 0.55) w = 'rain';
      else w = r < 0.8 ? 'cloudy' : 'sunny';
    } else if (s === 'summer') {
      if (b === 'valley') w = r < 0.5 ? 'scorching' : 'hot';
      else if (b === 'coast' || b === 'oregon_coast') w = r < 0.45 ? 'fog' : 'sunny';
      else if ((mo >= 6 && mo <= 8) && (b === 'forest' || b === 'oregon') && r < 0.28) w = 'smoke';
      else if (b === 'pass' && r < 0.3) w = 'windy';
      else w = r < 0.75 ? 'sunny' : 'hot';
    } else if (s === 'spring') {
      if (north && r < 0.45) w = 'rain';
      else if (b === 'pass' && r < 0.2) w = mo <= 2 ? 'snow' : 'windy';
      else if (r < 0.65) w = 'sunny';
      else w = 'cloudy';
    } else { // fall
      if (b === 'pass' && r < 0.2) w = 'windy';
      else if ((b === 'forest' || b === 'oregon') && mo === 8 && r < 0.25) w = 'smoke';
      else if (north && r < 0.4) w = 'rain';
      else if (mo === 10 && (b === 'pass' || b === 'forest') && r < 0.55) w = 'snow';
      else w = r < 0.7 ? 'sunny' : 'cloudy';
    }
    this.weather = w;
  }

  // Simulate one day of driving. Returns {miles, arrived, notes:[...]}
  driveDay() {
    const notes = [];
    let miles = Math.min(this.milesPerDay(), this.leg.miles - this.leg.done);
    const need = miles / this.mpg();
    if (this.inv.gas < need) {
      miles = Math.floor(this.inv.gas * this.mpg());
      this.inv.gas = 0;
    } else {
      this.add('gas', -need);
    }
    this.leg.done += miles;
    this.milesTotal += miles;
    const wear = (miles / 100) * (this.pace === 'floorit' ? 2.2 : this.pace === 'mosey' ? 0.7 : 1.2) * rand(0.6, 1.4);
    this.damageRV(wear);
    if (this.inv.gas <= 0) notes.push({ text: 'The V10 coughs, sputters, and dies. You are OUT OF GAS.', bad: true, outOfGas: true });
    const arrived = this.leg.done >= this.leg.miles;
    return { miles, arrived, notes };
  }

  // End-of-day upkeep: food, health, vibes, overnight. Returns notes [{text,bad}]
  endDay({ stayed = false, inTown = false } = {}) {
    const notes = [];
    const humans = this.humans().length;
    const cold = ['snow', 'storm'].includes(this.weather) || (this.season() === 'winter');
    const snackMult = SNACKS[this.snacks].mult;

    // --- consumption ---
    const foodNeed = humans * 3 * snackMult;
    const hungry = this.inv.food < foodNeed;
    this.add('food', -foodNeed);
    const belaHere = this.alive('bela');
    const dogHungry = belaHere && this.inv.kibble < 1.5;
    if (belaHere) this.add('kibble', -1.5);
    const cats = this.cats().length;
    const catHungry = cats && this.inv.catfood < cats * 2;
    if (cats) this.add('catfood', -cats * 2);
    const noLitter = cats && this.inv.litter < cats;
    if (cats) this.add('litter', -cats);
    const noTP = humans && this.inv.toiletpaper < 1;
    if (humans) this.add('toiletpaper', -1);
    const thirsty = this.inv.water < 6;
    this.add('water', -6 - humans);
    let propaneUse = 0.5 + (cold ? 1.2 : 0);
    const hooked = this.sleep === 'rvpark' || inTown && this.sleep === 'rvpark';
    if (hooked) propaneUse *= 0.3;
    const noPropane = this.inv.propane < propaneUse;
    this.add('propane', -propaneUse);
    const coffee = this.inv.coffee > 0;
    this.add('coffee', -0.5);
    this.tank = Math.min(100, this.tank + 9 + humans * 3);

    // --- overnight ---
    const sleep = SLEEPS[this.sleep];
    let sleepBonus = 0;
    if (this.sleep === 'rvpark') {
      if (this.money >= sleep.cost) {
        this.spend(sleep.cost);
        this.tank = 0;
        this.add('water', 80);
        sleepBonus = 3;
        this.addVibes(3);
      } else {
        notes.push({ text: 'Not enough cash for an RV park. You sleep in a parking lot.', bad: true });
      }
    } else if (this.sleep === 'boondock') {
      sleepBonus = 1;
      this.addVibes(2);
    } else {
      this.addVibes(-1);
    }

    // --- health ---
    for (const m of this.present()) {
      const sp = MEMBER[m.id].species;
      let d = 2 + sleepBonus;
      if (sp === 'human') {
        d += this.snacks === 'gourmet' ? 3 : this.snacks === 'gas' ? -3 : 1;
        if (hungry) d -= 12;
        if (thirsty) d -= 6;
      }
      if (sp === 'dog' && dogHungry) d -= 12;
      if (sp === 'cat' && catHungry) d -= 12;
      if (sp === 'cat' && noLitter) d -= 3;
      if (this.pace === 'floorit') d -= 3;
      if (this.pace === 'mosey') d += 2;
      if (this.weather === 'scorching') d -= sp === 'human' ? 3 : 5;
      if (this.weather === 'smoke' && sp !== 'cat') d -= 3;
      if (noPropane && cold) d -= 5;
      if (this.vibes < 25) d -= 2;
      if (stayed) d += 6;
      if (m.ailment) {
        d -= 4;
        m.ailDays--;
        if (m.ailDays <= 0) {
          notes.push({ text: `${MEMBER[m.id].name} has recovered from ${m.ailment}.`, good: true });
          m.ailment = null;
        }
      }
      m.health = Math.max(0, Math.min(100, m.health + d));
      // auto first aid
      if (m.health < 35 && this.inv.firstaid >= 1 && !m.gone) {
        this.add('firstaid', -1);
        m.health += 25;
        m.ailment = null;
        notes.push({ text: `You used a first aid kit on ${MEMBER[m.id].name}.`, good: true });
      }
    }

    // --- vibes ---
    let v = (60 - this.vibes) * 0.08;
    if (this.alive('pookah')) v += 1;
    if (this.pace === 'floorit') v -= 3;
    if (this.weather === 'rain') v -= 1;
    if (this.weather === 'scorching') v -= 3;
    if (this.tank >= 100) { v -= 10; notes.push({ text: 'The black tank is FULL. The RV smells… alive. Find a dump station or RV park!', bad: true }); }
    if (noTP) { v -= 8; notes.push({ text: 'You are out of toilet paper. Napkins from the glovebox are being rationed.', bad: true }); }
    if (noLitter) { v -= 5; notes.push({ text: 'No cat litter! The cats are improvising. The bathtub has been claimed.', bad: true }); }
    if (hungry) notes.push({ text: 'You are out of groceries! The humans are hungry and cranky.', bad: true });
    if (dogHungry) notes.push({ text: 'You are out of kibble! Bela is staring at you with enormous sad eyes.', bad: true });
    if (catHungry) notes.push({ text: 'You are out of cat food! The cats are yelling at 4 AM.', bad: true });
    if (thirsty) notes.push({ text: 'The fresh water tank is empty!', bad: true });
    if (noPropane && cold) notes.push({ text: 'Out of propane: no heat tonight. Everyone sleeps in a pile.', bad: true });
    if (coffee) v += 1;
    this.addVibes(v);

    // --- departures ---
    for (const m of this.present()) {
      if (m.health <= 0) {
        m.gone = true;
        notes.push({ text: DEPARTURES[m.id], bad: true, departure: m.id });
        this.log(`${MEMBER[m.id].name} left the trip.`);
      }
    }

    this.advanceDate();
    return notes;
  }

  // Chance of a random event today.
  eventChance() {
    let p = 0.42;
    if (this.pace === 'floorit') p += 0.08;
    return p;
  }

  breakdownRisk() {
    let p = 0.02 + ((100 - this.rv) / 100) * 0.09;
    if (this.pace === 'floorit') p += 0.04;
    if (this.inv.coffee > 0) p -= 0.01;
    return Math.max(0.01, p);
  }

  // Score on arrival.
  score() {
    const parts = [];
    let pts = 0;
    for (const m of this.members) {
      if (m.gone) continue;
      const base = MEMBER[m.id].species === 'human' ? 600 : 500;
      const k = m.health >= 80 ? 1 : m.health >= 55 ? 0.8 : m.health >= 30 ? 0.6 : 0.4;
      const p = Math.round(base * k);
      parts.push({ label: `${MEMBER[m.id].name} (${this.healthWord(m.health)})`, pts: p });
      pts += p;
    }
    const rvp = this.rv * 5; parts.push({ label: `The Georgetown (${this.rv}%)`, pts: rvp }); pts += rvp;
    const mp = Math.max(0, Math.round(this.money / 4)); parts.push({ label: `Cash left ($${this.money})`, pts: mp }); pts += mp;
    const vp = this.vibes * 4; parts.push({ label: `Vibes (${this.vibesWord()})`, pts: vp }); pts += vp;
    let sp = 0;
    for (const it of ITEMS) sp += Math.round((this.inv[it.id] / it.step) * 2);
    parts.push({ label: 'Leftover supplies', pts: sp }); pts += sp;
    const days = Math.max(0, 400 - this.day * 25); parts.push({ label: `Speed bonus (${this.day} days)`, pts: days }); pts += days;
    const mult = this.diff.mult;
    return { parts, subtotal: pts, mult, total: pts * mult };
  }

  toJSON() {
    return { ...this, date: this.date.getTime() };
  }
  static fromJSON(o) {
    const s = new GameState();
    Object.assign(s, o);
    s.date = new Date(o.date);
    return s;
  }
}
