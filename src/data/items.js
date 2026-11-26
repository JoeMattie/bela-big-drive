// Supplies. `unit` is what one purchase step buys; price is per step at the
// San Diego RV superstore (towns multiply by their own markup).

export const ITEMS = [
  { id: 'gas', name: 'Gasoline', unit: 'gal', step: 10, price: null, max: 75, icon: 'gas',
    desc: 'The Georgetown\'s thirsty Ford V10 gets ~7.5 mpg on a good day. Tank holds 75 gallons.' },
  { id: 'food', name: 'Groceries', unit: 'meals', step: 10, price: 45, max: 400, icon: 'food',
    desc: 'Human food. Two humans eat about 6 meals a day (Joe counts as 1.5).' },
  { id: 'kibble', name: 'Dog Kibble', unit: 'lbs', step: 5, price: 14, max: 100, icon: 'kibble',
    desc: 'Bela eats ~1.5 lbs a day and would eat 40 if allowed.' },
  { id: 'catfood', name: 'Cat Food', unit: 'cans', step: 6, price: 9, max: 120, icon: 'catfood',
    desc: 'Muskrat & Pookah need 2 cans a day each. Pookah prefers the fancy pâté.' },
  { id: 'litter', name: 'Cat Litter', unit: 'lbs', step: 10, price: 12, max: 120, icon: 'litter',
    desc: 'Two cats in a moving box with no litter is a biohazard. ~2 lbs/day.' },
  { id: 'propane', name: 'Propane', unit: 'gal', step: 5, price: 22, max: 30, icon: 'propane',
    desc: 'Runs the fridge, stove & furnace when not plugged in. More when it\'s cold.' },
  { id: 'water', name: 'Fresh Water', unit: 'gal', step: 20, price: 3, max: 80, icon: 'water',
    desc: 'For drinking, dishes and the world\'s weakest shower. Free at RV parks.' },
  { id: 'tires', name: 'Spare Tire', unit: 'tire', step: 1, price: 260, max: 3, icon: 'tire',
    desc: '25-year-old RVs and 25-year-old tires have one thing in common: blowouts.' },
  { id: 'parts', name: 'Spare Parts Kit', unit: 'kit', step: 1, price: 85, max: 4, icon: 'parts',
    desc: 'Belts, hoses, fuses, spark plugs. For when the V10 makes The Noise.' },
  { id: 'chains', name: 'Tire Chains', unit: 'set', step: 1, price: 140, max: 1, icon: 'chains',
    desc: 'Required on the passes when it snows. CHP will turn you around without them.' },
  { id: 'ducttape', name: 'Duct Tape', unit: 'roll', step: 1, price: 9, max: 10, icon: 'ducttape',
    desc: 'Holds the universe together. Fixes small problems for free.' },
  { id: 'coffee', name: 'Coffee', unit: 'bags', step: 1, price: 16, max: 10, icon: 'coffee',
    desc: 'Keeps the driver sharp. Fewer mishaps when you\'re hustling. One bag lasts ~2 days.' },
  { id: 'treats', name: 'Pet Treats', unit: 'bags', step: 1, price: 11, max: 10, icon: 'treats',
    desc: 'Bribes for the animals. Raises spirits; can lure an escaped cat.' },
  { id: 'toiletpaper', name: 'Toilet Paper', unit: 'rolls', step: 4, price: 8, max: 48, icon: 'toiletpaper',
    desc: 'RV-safe, single ply, sadness grade. Running out is a morale catastrophe.' },
  { id: 'firstaid', name: 'First Aid Kit', unit: 'kit', step: 1, price: 35, max: 5, icon: 'firstaid',
    desc: 'Bandages, Dramamine, Pepto, Benadryl, cat calming spray. Heals the ailing.' },
];

export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const DIFFICULTIES = [
  {
    id: 'fresh', name: 'Freshly Serviced', money: 3200, rv: 95, mult: 1,
    desc: 'New tires, new belts, oil changed. A suspicious amount of savings in the bank.',
  },
  {
    id: 'cel', name: 'Check Engine Light', money: 2400, rv: 75, mult: 2,
    desc: 'The light has been on since 2019. It\'s probably fine. Less cash.',
  },
  {
    id: 'ziptie', name: 'Held Together With Zip Ties', money: 1700, rv: 55, mult: 3,
    desc: 'The previous owner left a note that just says "good luck." Very little cash.',
  },
];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
