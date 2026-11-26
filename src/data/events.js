// Random road events.
//
// Event shape:
//   id:      unique string
//   cat:     'rv' (mechanical — rolled against breakdownRisk) | 'general'
//   weight:  number or (s) => number   (relative frequency; 0 = impossible)
//   when:    optional (s) => bool      (extra condition)
//   once:    optional bool             (only ever fires once per game)
//   run(s):  => Result
//
// Result shape (what the player sees):
//   title, text            strings
//   who:   party member id for the portrait (optional), mood: 'neutral'|'happy'|'sick'
//   tone:  'good' | 'bad' | 'neutral'   (colors the box & plays a sting)
//   sfx:   optional sound id
//   choices: [{ label, when?(s)=>bool, run(s) => Result }]   (optional)
//   minigame: { name: 'catchase'|'forage'|'freeway', params, after: (s, outcome) => Result } (optional)
//
// Any change made to `s` inside run() is diffed and shown automatically
// (money, items, health, vibes, days), so text doesn't need to list numbers.
//
// Helpers on s (GameState): add(item,n) has(item,n) spend(n) earn(n) addVibes(n)
//   damageRV(n) repairRV(n) hurt(id,n) heal(id,n) healAll(n) hurtAll(n)
//   sicken(id[,ailment]) -> ailment  cure(id)  loseDays(n)  alive(id)
//   randomPresent(filter) present() humans() pets() cats() name(id)
//   weather biome() season() inOregon() pace snacks sleep flags stats log(text)
import { pick, chance } from '../game/state.js';
import { MEMBER } from './party.js';

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fixer = (s) => (s.alive('joe') ? 0.15 : 0);

export const EVENTS = [
  // ======================= RV MECHANICAL =======================
  {
    id: 'blowout', cat: 'rv', weight: 4,
    run(s) {
      s.stats.flats++;
      if (s.has('tires')) {
        s.add('tires', -1); s.loseDays(0);
        return { title: 'BLOWOUT!', tone: 'bad', sfx: 'pop', who: 'joe', mood: 'sick',
          text: 'BANG! A rear tire explodes into a cloud of rubber confetti. The Georgetown wobbles to the shoulder. Joe swaps on the spare while semis roar past at 80 mph.' };
      }
      return { title: 'BLOWOUT!', tone: 'bad', sfx: 'pop',
        text: 'BANG! A tire explodes and you have no spare. A mobile tire service will come out… for a price.',
        choices: [
          { label: 'Pay for mobile tire service', run: (s) => { s.spend(450); s.loseDays(1); return { text: 'A guy named Dale shows up six hours later, says "whoof, she\'s an old one," and charges you $450.', tone: 'bad' }; } },
          { label: 'Limp to the next exit on the rim', run: (s) => { s.damageRV(18); s.spend(320); return { text: 'Sparks fly. The rim is ruined, but a tire shop at the exit gets you rolling again.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'overheat', cat: 'rv', weight: (s) => (['hot', 'scorching'].includes(s.weather) || s.biome() === 'pass' ? 6 : 1),
    run(s) {
      return { title: 'Overheating', tone: 'bad', sfx: 'bad', who: 'caity',
        text: 'The temperature needle swings into the red and steam pours from under the doghouse cover. The V10 is cooking.',
        choices: [
          { label: 'Pull over, let it cool (lose half a day)', run: (s) => { s.damageRV(2); s.addVibes(-3); return { text: 'You sit on the shoulder eating cheese crackers until it cools. Bela watches the cows.' }; } },
          { label: 'Top off coolant w/ drinking water', when: (s) => s.has('water', 10), run: (s) => { s.add('water', -10); return { text: 'Not ideal, but it works. The needle settles.', tone: 'good' }; } },
          { label: 'Push through it', run: (s) => { if (chance(0.5)) { s.damageRV(20); return { text: 'Something under the hood goes "PFFFT." That was expensive-sounding.', tone: 'bad' }; } return { text: 'The needle hovers in the red… and drops back. You got lucky.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'spark_plug', cat: 'rv', weight: 3,
    run(s) {
      const kit = s.has('parts');
      if (kit && chance(0.75 + fixer(s))) {
        s.add('parts', -1);
        return { title: 'The Ford V10 Spark Plug Thing', tone: 'neutral', who: 'joe', sfx: 'thud',
          text: 'TICK-TICK-TICK-POP. The infamous V10 blew a spark plug right out of the head. Joe watches a 14-minute repair video in a rest stop and fixes it with the parts kit. He is unbearably proud.' };
      }
      s.damageRV(10); s.spend(380); s.loseDays(1);
      return { title: 'The Ford V10 Spark Plug Thing', tone: 'bad', sfx: 'thud',
        text: 'TICK-TICK-TICK-POP. A spark plug launched itself out of the cylinder head. A mobile mechanic re-threads it and charges you a fortune.' };
    },
  },
  {
    id: 'belt', cat: 'rv', weight: 3,
    run(s) {
      if (s.has('parts')) {
        s.add('parts', -1);
        return { title: 'Squeal of Doom', tone: 'neutral', sfx: 'thud', who: 'joe',
          text: 'A horrible squeal, then silence: the serpentine belt shredded. You swap in the spare from the parts kit. Only one knuckle was lost.' };
      }
      if (s.has('ducttape') && chance(0.4)) {
        s.add('ducttape', -1);
        return { title: 'Squeal of Doom', tone: 'good', sfx: 'thud',
          text: 'The serpentine belt frays. You wrap it in duct tape, which absolutely should not work. It works.' };
      }
      s.spend(290); s.loseDays(1);
      return { title: 'Squeal of Doom', tone: 'bad', sfx: 'thud', text: 'The serpentine belt snaps. You wait a day for a tow and a new belt.' };
    },
  },
  {
    id: 'generator', cat: 'rv', weight: 2,
    run(s) {
      s.addVibes(-5);
      return { title: 'Generator Won\'t Start', tone: 'bad', who: 'pookah', mood: 'sick',
        text: 'The Onan generator coughs and gives up. No AC, no microwave. Pookah, wearing the fur equivalent of three parkas, files a formal complaint.' };
    },
  },
  {
    id: 'slide', cat: 'rv', weight: 2,
    run(s) {
      if (s.has('ducttape')) { s.add('ducttape', -1); return { title: 'Leaky Roof', tone: 'neutral', text: 'A drip from the roof vent lands precisely on Joe\'s pillow. Duct tape and a cut-up yogurt tub fix it. Mostly.' }; }
      s.addVibes(-6); s.damageRV(4);
      return { title: 'Leaky Roof', tone: 'bad', text: 'A slow leak around the roof vent soaks the dinette cushions. Everything smells like wet dog — even the cats.' };
    },
  },
  {
    id: 'battery', cat: 'rv', weight: 2,
    run(s) {
      return { title: 'Dead Battery', tone: 'bad', sfx: 'bad',
        text: 'Someone left the step light on all night. The chassis battery is dead. Click. Click. Click.',
        choices: [
          { label: 'Flag down a jump', run: (s) => { if (chance(0.6)) { s.addVibes(4); return { text: 'A retired couple in a Winnebago gives you a jump and a lecture about battery disconnect switches. Legends.', tone: 'good' }; } s.loseDays(1); s.spend(120); return { text: 'Nobody stops. Roadside assistance arrives in the afternoon.', tone: 'bad' }; } },
          { label: 'Call roadside assistance ($120)', run: (s) => { s.spend(120); return { text: 'A tow truck driver jumps you in 4 minutes and leaves without making eye contact.' }; } },
        ] };
    },
  },

  // ======================= ROAD & TRAFFIC =======================
  {
    id: 'mattress', weight: (s) => (s.biome() === 'city' ? 8 : 1),
    run(s) {
      return { title: 'Freeway Debris!', tone: 'bad', sfx: 'honk',
        text: 'A queen-size mattress is lying across the carpool lane. Then a ladder. Then — inexplicably — a couch. The freeway has become a furniture store.',
        minigame: { name: 'freeway', params: { theme: 'debris' },
          after: (s, o) => {
            if (o && o.hits === 0) { s.addVibes(6); return { title: 'Nailed It', tone: 'good', text: 'Caity threads the Georgetown through the debris field like a fighter pilot. Joe applauds.' }; }
            const n = o ? o.hits : 2;
            s.damageRV(4 * n); s.addVibes(-2 * n);
            return { title: 'Bonk', tone: 'bad', text: `You clipped ${n} piece${n === 1 ? '' : 's'} of debris. There is now a box spring wedged in the grille.` };
          } } };
    },
  },
  {
    id: 'traffic', weight: (s) => (s.biome() === 'city' ? 10 : 1),
    run(s) {
      s.loseDays(0); s.addVibes(-5);
      return { title: 'Gridlock', tone: 'bad', who: 'joe', mood: 'sick',
        text: pick([
          'Traffic stopped dead for no reason at all. You move 9 miles in 3 hours. A man in the next lane is eating cereal out of the box. With a spoon.',
          'A "Sig-Alert" turns 14 lanes into a parking lot. Bela falls asleep with her face against the windshield.',
          'An entire lane is closed for a single cone. The cone is not doing anything. Just vibing.',
        ]) };
    },
  },
  {
    id: 'speed_trap', weight: (s) => (s.pace === 'floorit' ? 6 : 0.5),
    run(s) {
      s.stats.tickets++;
      const fine = rint(180, 320);
      s.spend(fine);
      return { title: 'Pulled Over', tone: 'bad', sfx: 'bad',
        text: `Red and blue lights. "Ma'am, do you know you were going 78 in a 55 for vehicles towing or over 3 axles?" The ticket is $${fine}. Bela tried to lick the officer through the window.` };
    },
  },
  {
    id: 'wrong_exit', weight: 2,
    run(s) {
      s.add('gas', -6); s.addVibes(-3);
      return { title: 'Wrong Exit', tone: 'bad', who: 'caity',
        text: pick([
          'The GPS says "make a U-turn" eleven times. You end up at a dead-end almond orchard. The almonds are judging you.',
          'You took the exit for an In-N-Out. It was a mirage. Now you are on a farm road behind a tractor going 4 mph.',
          'Google Maps routes the 33-foot RV down a residential street with a "NO TRUCKS" sign and a 9-foot bridge. Reverse. REVERSE.',
        ]) };
    },
  },
  {
    id: 'trucker_wave', weight: 2,
    run(s) {
      s.addVibes(8);
      return { title: 'Trucker Honk', tone: 'good', sfx: 'honk',
        text: 'Joe does the arm-pump. A trucker gives the long, glorious air-horn blast. Everyone in the RV screams with joy. Bela barks for 11 minutes.' };
    },
  },
  {
    id: 'cheap_gas', weight: 2, when: (s) => s.inv.gas < 60,
    run(s) {
      return { title: 'Cheap Gas Sign', tone: 'good',
        text: 'A hand-painted sign: "GAS — CHEAPEST IN THE COUNTY." Exit?',
        choices: [
          { label: 'Fill up 25 gallons ($85)', when: (s) => s.money >= 85, run: (s) => { s.spend(85); s.add('gas', 25); return { text: 'It really was cheap! The attendant also sells live bait and lottery tickets.', tone: 'good' }; } },
          { label: 'Keep driving', run: () => ({ text: 'You will think about that gas price for the rest of your life.' }) },
        ] };
    },
  },
  {
    id: 'pothole', weight: 2,
    run(s) {
      s.damageRV(5);
      return { title: 'Pothole', tone: 'bad', sfx: 'thud',
        text: 'KA-THUNK. Every cabinet in the RV opens at once. It is raining Tupperware. Muskrat is inside the silverware drawer now somehow.' };
    },
  },

  // ======================= WEATHER =======================
  {
    id: 'wind', weight: (s) => (s.weather === 'windy' ? 10 : s.biome() === 'pass' ? 2 : 0),
    run(s) {
      return { title: 'Crosswinds!', tone: 'bad', sfx: 'bad',
        text: 'Gusts of 60 mph slam the side of the RV like a giant hand. The Georgetown is basically a sail on wheels.',
        choices: [
          { label: 'Slow down to 40 and white-knuckle it', run: (s) => { s.addVibes(-4); return { text: 'Two hours of terror at 40 mph. Caity\'s knuckles are now permanently white.' }; } },
          { label: 'Pull over and wait it out', run: (s) => { s.loseDays(1); return { text: 'You wait out the wind in a truck stop lot watching the RV rock like a boat.' }; } },
          { label: 'Floor it', run: (s) => { if (chance(0.4)) { s.damageRV(15); s.hurtAll(5); return { text: 'A gust shoves you onto the rumble strip and a side mirror tears off. Everyone is shaken.', tone: 'bad' }; } return { text: 'Somehow it works. Nobody speaks for 30 minutes.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'smoke', weight: (s) => (s.weather === 'smoke' ? 10 : 0),
    run(s) {
      const who = s.randomPresent((m) => m.species !== 'cat');
      if (who) s.sicken(who.id, who.id === 'bela' ? 'a smoky cough' : 'a smoke headache');
      return { title: 'Wildfire Smoke', tone: 'bad', who: who ? who.id : null, mood: 'sick',
        text: `The sky turns an apocalyptic orange. The air quality index hits 280. ${who ? s.name(who.id) + ' isn\'t feeling well.' : ''} You run the dash AC on recirculate and drive on.` };
    },
  },
  {
    id: 'heat', weight: (s) => (s.weather === 'scorching' ? 8 : 0),
    run(s) {
      const pet = s.randomPresent((m) => m.species !== 'human');
      if (pet) s.hurt(pet.id, 10);
      s.add('water', -10);
      return { title: '112°F', tone: 'bad', who: pet ? pet.id : null, mood: 'sick',
        text: `The dash AC is losing a war against the Central Valley sun. ${pet ? s.name(pet.id) + ' is panting and miserable.' : ''} You stop to soak towels and blast the generator AC.` };
    },
  },
  {
    id: 'tule_fog', weight: (s) => (s.weather === 'fog' && s.biome() === 'valley' ? 8 : 0),
    run(s) {
      return { title: 'Tule Fog', tone: 'bad',
        text: 'The Central Valley\'s infamous tule fog rolls in. Visibility: 40 feet. You can\'t see the hood of the RV.',
        choices: [
          { label: 'Creep along at 25 mph', run: (s) => { s.addVibes(-3); return { text: 'Slow, tense, but safe.' }; } },
          { label: 'Wait for it to burn off', run: (s) => { s.loseDays(1); return { text: 'It burns off by afternoon. Mostly.' }; } },
        ] };
    },
  },

  // ======================= PETS =======================
  {
    id: 'cat_escape', weight: (s) => (s.cats().length ? 4 : 0),
    run(s) {
      const cat = pick(s.cats());
      const nm = s.name(cat.id);
      return { title: 'CAT ESCAPE!', tone: 'bad', who: cat.id, sfx: 'meow',
        text: `At a rest stop, someone opened the door for one second. ${nm} is OUT and sprinting across the rest area lawn!`,
        minigame: { name: 'catchase', params: { cat: cat.id },
          after: (s, o) => {
            if (o && o.caught) { s.stats.catsCaught++; s.addVibes(4); return { title: 'Gotcha!', tone: 'good', who: cat.id, text: `${nm} is back in the RV, acting like nothing happened.` }; }
            s.loseDays(1); s.addVibes(-10); s.hurt(cat.id, 15);
            return { title: 'Lost Cat…', tone: 'bad', who: cat.id, mood: 'sick', text: `It takes all night, a flashlight, and a can of tuna, but at 5 AM ${nm} finally strolls out from under a picnic table, covered in burrs.` };
          } } };
    },
  },
  {
    id: 'bela_sock', weight: (s) => (s.alive('bela') ? 3 : 0),
    run(s) {
      s.sicken('bela', 'ate a sock');
      return { title: 'Where Did The Sock Go', tone: 'bad', who: 'bela', mood: 'sick',
        text: 'Joe can only find one of his socks. Bela can\'t make eye contact. Bela is having a very bad tummy day.' };
    },
  },
  {
    id: 'bela_zoomies', weight: (s) => (s.alive('bela') ? 3 : 0),
    run(s) {
      s.addVibes(7);
      return { title: 'ZOOMIES', tone: 'good', who: 'bela', mood: 'happy', sfx: 'woof',
        text: 'At a rest stop dog run, Bela achieves full bull-terrier hucklebutt: tucked butt, ears back, 30 mph laps of pure chaos. A crowd gathers. A child cheers.' };
    },
  },
  {
    id: 'hairball', weight: (s) => (s.cats().length ? 3 : 0),
    run(s) {
      const cat = pick(s.cats());
      s.addVibes(-3);
      return { title: 'Hork', tone: 'bad', who: cat.id, mood: 'sick',
        text: `HORK. HORK. HORK. ${s.name(cat.id)} delivers a hairball directly into Caity\'s open shoe at 70 mph.` };
    },
  },
  {
    id: 'cat_window', weight: (s) => (s.cats().length ? 2 : 0),
    run(s) {
      s.addVibes(5);
      const c = pick(s.cats());
      return { title: 'Dashboard Cat', tone: 'good', who: c.id, mood: 'happy',
        text: `${s.name(c.id)} claims the giant sunny dashboard of the Georgetown and lies there like a hood ornament. Three cars full of people wave.` };
    },
  },
  {
    id: 'pookah_shed', weight: (s) => (s.alive('pookah') ? 2 : 0),
    run(s) {
      s.addVibes(-2);
      return { title: 'Floof Storm', tone: 'neutral', who: 'pookah',
        text: 'The RV\'s dash vents are blowing Pookah fur into a slow-motion blizzard. Joe now has a beard. It is not his.' };
    },
  },
  {
    id: 'squirrel', weight: (s) => (s.alive('bela') ? 2 : 0),
    run(s) {
      if (chance(0.5)) {
        s.hurt('bela', 6); s.hurt('caity', 4, 'a sprained wrist');
        return { title: 'SQUIRREL', tone: 'bad', who: 'bela', sfx: 'woof',
          text: 'Bela sees a squirrel. Bela is a 60-pound muscle missile. Caity is now water-skiing across a rest area lawn on her stomach.' };
      }
      s.addVibes(3);
      return { title: 'SQUIRREL', tone: 'neutral', who: 'bela', sfx: 'woof', text: 'Bela spots a squirrel and screams the bull terrier scream. The squirrel is unbothered.' };
    },
  },

  // ======================= PEOPLE & MISC =======================
  {
    id: 'vanlifer', weight: 2,
    run(s) {
      return { title: 'Van Lifers', tone: 'neutral',
        text: 'A couple in a $140,000 Sprinter van with a drone and a ring light ask if they can film the Georgetown for their channel. "It\'s so… vintage."',
        choices: [
          { label: 'Sure! (trade for supplies)', run: (s) => { s.add('coffee', 2); s.add('treats', 1); s.addVibes(4); return { text: 'They give you fancy pour-over coffee and organic dog treats. You are now "content."', tone: 'good' }; } },
          { label: 'Absolutely not', run: (s) => { s.addVibes(2); return { text: 'Joe says "she\'s not vintage, she\'s experienced." They nod respectfully.' }; } },
        ] };
    },
  },
  {
    id: 'farm_stand', weight: (s) => (['valley', 'oregon', 'pass'].includes(s.biome()) ? 3 : 0.5),
    run(s) {
      return { title: 'Farm Stand', tone: 'good',
        text: pick([
          'A roadside farm stand: peaches, strawberries, almonds, a jar of honey with the comb still in it.',
          'An honor-system fruit stand with a coffee can for cash and a hand-drawn sign: "TAKE WHAT U NEED."',
        ]),
        choices: [
          { label: 'Buy 20 meals of produce ($40)', when: (s) => s.money >= 40, run: (s) => { s.spend(40); s.add('food', 20); s.healAll(3); return { text: 'Everyone eats a peach over the sink like a raccoon. Life is good.', tone: 'good' }; } },
          { label: 'Pass', run: () => ({ text: 'You drive on. Peach-less.' }) },
        ] };
    },
  },
  {
    id: 'break_in', weight: (s) => (s.sleep === 'walmart' ? (s.alive('bela') ? 1.5 : 5) : 0.3),
    run(s) {
      if (s.alive('bela') && chance(0.75)) {
        s.addVibes(3);
        return { title: '3 AM Visitor', tone: 'good', who: 'bela', mood: 'happy', sfx: 'woof',
          text: 'Someone tries the door handle at 3 AM. Bela, a large white dog with a shark-like head, presses her face to the window and growls. The person leaves. Fast.' };
      }
      s.spend(Math.min(s.money, rint(60, 180))); s.add('coffee', -2); s.addVibes(-8);
      return { title: 'Break-In', tone: 'bad', sfx: 'bad',
        text: 'Somebody jimmied the storage bay overnight and grabbed what they could, including the emergency cash envelope.' };
    },
  },
  {
    id: 'knock', weight: (s) => (s.sleep === 'walmart' ? 3 : s.sleep === 'boondock' ? 2 : 0),
    run(s) {
      if (s.sleep === 'boondock') {
        s.loseDays(0); s.addVibes(-4);
        return { title: 'The Knock', tone: 'bad', text: 'KNOCK KNOCK. A ranger with a flashlight: "You can\'t camp here, folks." You move at midnight, in your pajamas.' };
      }
      s.addVibes(-3);
      return { title: 'The Knock', tone: 'bad', text: 'KNOCK KNOCK at 2 AM. A security guard says overnight parking isn\'t allowed at this location anymore. Off you go.' };
    },
  },
  {
    id: 'stars', weight: (s) => (s.sleep === 'boondock' && !['rain', 'storm', 'fog', 'smoke', 'cloudy'].includes(s.weather) ? 4 : 0),
    run(s) {
      s.addVibes(10); s.healAll(4);
      return { title: 'A Sky Full of Stars', tone: 'good', who: 'caity', mood: 'happy',
        text: 'Miles from any town, you lie on the roof of the RV and see the Milky Way. Pookah sits on Joe\'s chest. Nobody says anything for a long time.' };
    },
  },
  {
    id: 'potluck', weight: 1.5,
    run(s) {
      s.add('food', 12); s.addVibes(8);
      return { title: 'RV Park Potluck', tone: 'good',
        text: 'A full-timer named Barb invites you to the RV park potluck. There are four kinds of Jell-O salad and a man who will tell you about his solar panels for 90 minutes. You leave with leftovers.' };
    },
  },
  {
    id: 'gig', weight: 1, when: (s) => s.money < 600,
    run(s) {
      return { title: 'Side Hustle', tone: 'neutral',
        text: 'Money\'s getting tight. A cafe with WiFi and outlets beckons.',
        choices: [
          { label: 'Spend a day doing freelance work', run: (s) => { const n = rint(160, 320); s.earn(n); s.loseDays(1); return { text: `A long day of laptops and lattes. You earn $${n}.`, tone: 'good' }; } },
          { label: 'Keep driving', run: () => ({ text: 'Onward. Money is a social construct.' }) },
        ] };
    },
  },
  {
    id: 'lost_item', weight: 1.5,
    run(s) {
      const it = pick(['firstaid', 'ducttape', 'treats', 'coffee']);
      if (!s.has(it)) return null;
      s.add(it, -1);
      return { title: 'Left Behind', tone: 'bad', text: 'You realize 60 miles later that you left something on a picnic table at the last rest stop.' };
    },
  },
  {
    id: 'food_poison', weight: 1.2, when: (s) => s.snacks === 'gas',
    run(s) {
      const h = s.randomPresent((m) => m.species === 'human');
      if (!h) return null;
      s.sicken(h.id, 'gas station sushi poisoning');
      return { title: 'Bad Decision', tone: 'bad', who: h.id, mood: 'sick',
        text: `${s.name(h.id)} ate the gas station sushi. Everybody said not to eat the gas station sushi.` };
    },
  },
  {
    id: 'sickness', weight: 2,
    run(s) {
      const m = s.randomPresent();
      if (!m) return null;
      const a = s.sicken(m.id);
      return { title: 'Under the Weather', tone: 'bad', who: m.id, mood: 'sick', text: `${s.name(m.id)} has ${a}.` };
    },
  },
];
