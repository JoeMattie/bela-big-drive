export const PARTY = [
  {
    id: 'joe', name: 'Joe', species: 'human', pronoun: 'he', obj: 'him', poss: 'his',
    title: 'Co-Pilot / DJ',
    bio: 'Glasses, cardigan, a podcast for every mile. Watches enough repair videos that RV fixes succeed more often.',
    perk: 'Repairs succeed more often',
    color: '#7fb0ff',
  },
  {
    id: 'caity', name: 'Caity', species: 'human', pronoun: 'she', obj: 'her', poss: 'her',
    title: 'Captain of the Georgetown',
    bio: 'Undercut, septum ring, spider tattoo, nerves of steel. Haggles like a pro and can calm any animal.',
    perk: 'Better prices & calmer pets',
    color: '#7ee07a',
  },
  {
    id: 'bela', name: 'Bela', species: 'dog', pronoun: 'she', obj: 'her', poss: 'her',
    title: 'Head of Security',
    bio: 'Bull terrier. Egg-shaped head, zero thoughts, infinite love. Guards the RV at night (fewer break-ins).',
    perk: 'Guards the RV at night',
    color: '#ffffff',
  },
  {
    id: 'muskrat', name: 'Muskrat', species: 'cat', pronoun: 'she', obj: 'her', poss: 'her',
    title: 'Escape Artist',
    bio: 'Brown tabby with green eyes and a ringed tail. Fast, curious, plotting. Hears trouble before anyone else.',
    perk: 'Early warning of trouble',
    color: '#c99a5b',
  },
  {
    id: 'pookah', name: 'Pookah', species: 'cat', pronoun: 'she', obj: 'her', poss: 'her',
    title: 'Chief Floof Officer',
    bio: 'Black & white tuxedo longhair, majestic whiskers, tail like a feather duster. Purrs morale back into the crew.',
    perk: 'Boosts everyone\'s vibes',
    color: '#d8d8ff',
  },
];

export const MEMBER = Object.fromEntries(PARTY.map((p) => [p.id, p]));

// Ailments: humorous, modern road-trip maladies.
export const AILMENTS = {
  human: [
    'carsickness', 'a sunburn', 'gas station sushi poisoning', 'a migraine', 'a sprained ankle',
    'road rage', 'allergies', 'a back spasm from the RV mattress', 'a nasty cold', 'heat exhaustion',
    'poison oak', 'a stubbed toe of legendary pain', 'podcast fatigue', 'a caffeine crash',
  ],
  dog: [
    'an upset tummy', 'a torn dewclaw', 'a zoomies injury', 'ate a sock', 'a bee sting on the nose',
    'carsickness', 'an ear infection',
  ],
  cat: [
    'a hairball', 'carsick yowling', 'a hunger strike', 'fleas', 'travel anxiety', 'a sneezy cold',
  ],
};

// What happens when a member's health reaches 0. Nobody dies in this game.
export const DEPARTURES = {
  joe: 'Joe has had enough. He is catching an Alaska Airlines flight to PDX and will meet everyone there with a lukewarm cold brew.',
  caity: 'Caity has had it up to HERE. She\'s taking the Amtrak Coast Starlight the rest of the way, with a sleeper car and a book.',
  bela: 'Bela needs a vet and some rest. A kind friend will drive her up next week. The RV feels very quiet.',
  muskrat: 'Muskrat is too stressed to travel. She\'s staying with a cat-sitter and will be flown up in a carrier. She is furious.',
  pookah: 'Pookah has gone on strike under the bed and refuses to be part of this. A pet transport service will bring her up later.',
};
