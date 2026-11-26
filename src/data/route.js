// The road from San Diego to Portland. Nodes are stops; `next` lists the legs
// leaving each stop (two entries = a fork in the road).
// kind: start | town (store+talk) | landmark | pass | ferry | casino | end
// biome: scenery for the leg *arriving* at this node.

export const NODES = {
  san_diego: {
    name: 'San Diego, CA', kind: 'start', state: 'CA', lat: 32.72, lon: -117.16, gas: 5.39,
    blurb: 'Home of fish tacos, perfect weather, and the RV storage lot where the Georgetown has been quietly growing a family of spiders.',
    next: [{ to: 'oceanside', miles: 55 }],
  },
  oceanside: {
    name: 'San Onofre', kind: 'landmark', state: 'CA', lat: 33.37, lon: -117.56, biome: 'coast',
    blurb: 'Two giant concrete domes sit beside a world-class surf break. The decommissioned San Onofre nuclear plant: the most famous pair of… domes… on the I-5.',
    next: [{ to: 'los_angeles', miles: 85 }],
  },
  los_angeles: {
    name: 'Los Angeles, CA', kind: 'town', state: 'CA', lat: 34.05, lon: -118.24, biome: 'city', gas: 5.89,
    blurb: 'Fourteen lanes of brake lights. Somewhere ahead, a mattress lies in the carpool lane like a sleeping god.',
    fork: 'The road splits! The I-5 climbs over the Grapevine and barrels up the hot Central Valley. Or take the long, pretty way up the 101 along the coast.',
    next: [
      { to: 'grapevine', miles: 70, label: 'I-5 over the Grapevine', note: 'Shorter. Steep grades, wind & snow closures, cow smell.' },
      { to: 'santa_barbara', miles: 95, label: 'US-101 Coast Route', note: '130 miles longer. Pea soup, gum, garlic & the Bay Bridge.' },
    ],
  },
  // ---------- I-5 branch ----------
  grapevine: {
    name: 'The Grapevine', kind: 'pass', state: 'CA', lat: 34.83, lon: -118.87, biome: 'pass', elev: 4144,
    blurb: 'Tejon Pass, elevation 4,144 ft. Six percent grades, 65 mph wind gusts, and the CHP shuts it down for snow a few times every winter.',
    next: [{ to: 'kettleman', miles: 115 }],
  },
  kettleman: {
    name: 'Kettleman City, CA', kind: 'town', state: 'CA', lat: 36.01, lon: -119.96, biome: 'valley', gas: 6.29,
    blurb: 'An oasis of 100+ EV chargers, a legendary burger drive-thru line, and the most expensive gas in the known universe.',
    next: [{ to: 'harris_ranch', miles: 25 }],
  },
  harris_ranch: {
    name: 'Harris Ranch', kind: 'landmark', state: 'CA', lat: 36.25, lon: -120.24, biome: 'valley',
    blurb: 'You smell it four miles before you see it: one of the largest cattle feedlots on the West Coast. The cats are deeply offended.',
    next: [{ to: 'sacramento', miles: 185 }],
  },
  // ---------- 101 coast branch ----------
  santa_barbara: {
    name: 'Santa Barbara, CA', kind: 'landmark', state: 'CA', lat: 34.42, lon: -119.70, biome: 'coast',
    blurb: 'Red tile roofs, white stucco, and people jogging who have clearly never had a bad day in their lives.',
    next: [{ to: 'buellton', miles: 45 }],
  },
  buellton: {
    name: 'Buellton, CA', kind: 'town', state: 'CA', lat: 34.61, lon: -120.19, biome: 'pass', gas: 5.79,
    blurb: 'Home of the famous split pea soup restaurant with the windmill. Bottomless soup! Bela would like bottomless soup.',
    next: [{ to: 'bubblegum_alley', miles: 60 }],
  },
  bubblegum_alley: {
    name: 'Bubblegum Alley', kind: 'landmark', state: 'CA', lat: 35.28, lon: -120.66, biome: 'pass',
    blurb: 'San Luis Obispo\'s 70-foot alley, walls caked floor-to-roof in chewed gum since the 1950s. Beautiful. Disgusting. Art.',
    next: [{ to: 'gilroy', miles: 160 }],
  },
  gilroy: {
    name: 'Gilroy, CA', kind: 'town', state: 'CA', lat: 37.01, lon: -121.57, biome: 'valley', gas: 5.69,
    blurb: 'The Garlic Capital of the World. The air itself is seasoned. You will smell like this until Oregon.',
    next: [{ to: 'bay_bridge', miles: 75 }],
  },
  bay_bridge: {
    name: 'Bay Bridge', kind: 'landmark', state: 'CA', lat: 37.80, lon: -122.37, biome: 'city',
    blurb: 'The San Francisco–Oakland Bay Bridge in the fog. Somewhere a tech bro on an electric unicycle is judging your gas mileage.',
    next: [{ to: 'sacramento', miles: 90 }],
  },
  // ---------- rejoin ----------
  sacramento: {
    name: 'Sacramento, CA', kind: 'town', state: 'CA', lat: 38.58, lon: -121.49, biome: 'valley', gas: 5.49,
    blurb: 'The state capital, the golden Tower Bridge, and humidity you did not sign up for.',
    next: [{ to: 'redding', miles: 160 }],
  },
  redding: {
    name: 'Redding, CA', kind: 'town', state: 'CA', lat: 40.59, lon: -122.39, biome: 'valley', gas: 5.29,
    blurb: 'The Sundial Bridge: a glass-decked footbridge whose tower is literally a giant sundial. Also: 110°F in the shade.',
    next: [{ to: 'lake_shasta', miles: 15 }],
  },
  lake_shasta: {
    name: 'Shasta Lake', kind: 'landmark', state: 'CA', lat: 40.72, lon: -122.42, biome: 'forest',
    blurb: 'California\'s biggest reservoir, red-dirt shores, houseboats, and a dam taller than a 45-story building.',
    next: [{ to: 'mt_shasta', miles: 50 }],
  },
  mt_shasta: {
    name: 'Weed & Mt. Shasta', kind: 'town', state: 'CA', lat: 41.42, lon: -122.38, biome: 'forest', gas: 5.19,
    blurb: 'A 14,179-ft volcano rises over a town named Weed, whose gift shop has exactly the T-shirts you think it has.',
    next: [{ to: 'siskiyou', miles: 50 }],
  },
  siskiyou: {
    name: 'Siskiyou Summit', kind: 'pass', state: 'CA', lat: 42.08, lon: -122.60, biome: 'forest', elev: 4310,
    blurb: 'Elevation 4,310 ft — the highest point on all of I-5. Chain controls, jackknifed trucks, and the Oregon border just beyond.',
    next: [{ to: 'ashland', miles: 12 }],
  },
  ashland: {
    name: 'Ashland, OR', kind: 'town', state: 'OR', lat: 42.19, lon: -122.71, biome: 'oregon', gas: 4.39,
    blurb: 'Welcome to Oregon! Shakespeare festival, cheaper gas, and a polite young man who insists on pumping it for you.',
    next: [{ to: 'oregon_vortex', miles: 33 }],
  },
  oregon_vortex: {
    name: 'The Oregon Vortex', kind: 'landmark', state: 'OR', lat: 42.49, lon: -123.09, biome: 'oregon',
    blurb: 'The House of Mystery! A crooked shack where brooms stand on their own, balls roll uphill, and Joe appears taller than Caity.',
    next: [{ to: 'grants_pass', miles: 20 }],
  },
  grants_pass: {
    name: 'Grants Pass, OR', kind: 'town', state: 'OR', lat: 42.44, lon: -123.33, biome: 'oregon', gas: 4.29,
    blurb: '"IT\'S THE CLIMATE," says the arch over the main drag. A giant fiberglass caveman waves hello.',
    fork: 'Another fork! Keep on the I-5 through the mountains and the Willamette Valley, or swing west on US-199 through the redwoods to the wild Oregon coast.',
    next: [
      { to: 'wolf_creek', miles: 20, label: 'Stay on I-5', note: 'Faster. A haunted inn, a casino, and the land of Ducks.' },
      { to: 'redwoods', miles: 85, label: 'US-199 to the Coast', note: '190 miles longer. Giant trees, dinosaurs & sea lions.' },
    ],
  },
  // ---------- I-5 branch (Oregon) ----------
  wolf_creek: {
    name: 'Wolf Creek Inn', kind: 'landmark', state: 'OR', lat: 42.70, lon: -123.40, biome: 'forest',
    blurb: 'Oregon\'s oldest hotel (1883). Jack London finished a novel here. Clark Gable slept here. Something else may still be checking in.',
    next: [{ to: 'canyonville', miles: 25 }],
  },
  canyonville: {
    name: 'Canyonville, OR', kind: 'casino', state: 'OR', lat: 42.93, lon: -123.28, biome: 'forest', gas: 4.35,
    blurb: 'A glittering casino resort with a big RV park, appearing out of the forest like a neon mirage. The slots are calling.',
    next: [{ to: 'eugene', miles: 100 }],
  },
  eugene: {
    name: 'Eugene, OR', kind: 'town', state: 'OR', lat: 44.05, lon: -123.09, biome: 'oregon', gas: 4.45,
    blurb: 'Track Town, USA. Everything is green and yellow, there are ducks on every flag, and the tie-dye is load-bearing.',
    next: [{ to: 'albany', miles: 45 }],
  },
  // ---------- Coast branch (Oregon) ----------
  redwoods: {
    name: 'The Redwoods', kind: 'landmark', state: 'CA', lat: 41.80, lon: -124.08, biome: 'forest',
    blurb: 'US-199 dives back into California through trees 350 feet tall and 2,000 years old. A giant lumberjack statue nods at the RV.',
    next: [{ to: 'prehistoric_gardens', miles: 85 }],
  },
  prehistoric_gardens: {
    name: 'Prehistoric Gardens', kind: 'landmark', state: 'OR', lat: 42.65, lon: -124.40, biome: 'oregon_coast',
    blurb: 'A 1950s roadside rainforest full of life-size concrete dinosaurs. Pookah does not trust the T. rex. Correct.',
    next: [{ to: 'sea_lion_caves', miles: 130 }],
  },
  sea_lion_caves: {
    name: 'Sea Lion Caves', kind: 'landmark', state: 'OR', lat: 44.12, lon: -124.13, biome: 'oregon_coast',
    blurb: 'America\'s largest sea cave, full of barking, belching Steller sea lions. Bela has entered a conversation she cannot win.',
    next: [{ to: 'albany', miles: 80 }],
  },
  // ---------- rejoin ----------
  albany: {
    name: 'Albany, OR', kind: 'town', state: 'OR', lat: 44.64, lon: -123.10, biome: 'oregon', gas: 4.39,
    blurb: 'Waverly Lake, home of a giant floating duck. Nobody knows why. Nobody asks. It is Oregon.',
    next: [{ to: 'wheatland_ferry', miles: 50 }],
  },
  wheatland_ferry: {
    name: 'Wheatland Ferry', kind: 'ferry', state: 'OR', lat: 45.09, lon: -123.04, biome: 'oregon',
    blurb: 'A tiny cable ferry that has crossed the Willamette here since 1844. It fits about nine cars. Or one 1999 Georgetown and a prayer.',
    next: [{ to: 'oregon_city', miles: 35 }],
  },
  oregon_city: {
    name: 'Oregon City, OR', kind: 'landmark', state: 'OR', lat: 45.36, lon: -122.61, biome: 'oregon',
    blurb: 'A public elevator climbs the basalt bluff over Willamette Falls. It goes nowhere but up. It is the most Oregon thing yet.',
    next: [{ to: 'portland', miles: 15 }],
  },
  portland: {
    name: 'Portland, OR', kind: 'end', state: 'OR', lat: 45.52, lon: -122.68, biome: 'portland',
    blurb: 'Bridges, food carts, Mt. Hood on the horizon, and rain. Home.',
    next: [],
  },
};

export const START = 'san_diego';
export const END = 'portland';

// Minimum road miles from a node to Portland (for "miles to go" displays).
export function milesToEnd(id) {
  const memo = {};
  const f = (n) => {
    if (n === END) return 0;
    if (memo[n] !== undefined) return memo[n];
    memo[n] = Math.min(...NODES[n].next.map((l) => l.miles + f(l.to)));
    return memo[n];
  };
  return f(id);
}

// Rough coastline polygon (lat, lon) for the procedural map, north→south.
export const COAST = [
  [46.30, -124.05], [45.90, -123.96], [45.45, -123.97], [45.00, -124.02], [44.60, -124.07],
  [44.00, -124.13], [43.40, -124.25], [42.80, -124.52], [42.30, -124.42], [42.00, -124.21],
  [41.70, -124.20], [41.30, -124.10], [40.80, -124.20], [40.40, -124.40], [40.00, -124.05],
  [39.50, -123.80], [39.00, -123.70], [38.50, -123.20], [38.00, -122.95], [37.80, -122.52],
  [37.50, -122.50], [37.10, -122.30], [36.95, -122.00], [36.80, -121.80], [36.60, -121.90],
  [36.30, -121.90], [35.80, -121.35], [35.40, -120.90], [35.00, -120.65], [34.55, -120.62],
  [34.45, -120.45], [34.40, -119.70], [34.20, -119.25], [34.03, -118.80], [33.90, -118.42],
  [33.75, -118.30], [33.60, -117.90], [33.35, -117.58], [33.00, -117.28], [32.70, -117.20],
  [32.53, -117.12],
];
