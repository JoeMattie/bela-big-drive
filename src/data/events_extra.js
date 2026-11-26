// Extra road events. Same schema as events.js — see that file's header comment
// for the full shape of Event and Result.
//
// Everything here is additive flavor: place-specific weather and hazards,
// pet business, the Georgetown falling apart in new and creative ways,
// people you meet, and the occasional genuinely good day.
import { pick, chance } from '../game/state.js';

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const to = (s) => s.leg?.to || null;
const wintry = (s) => s.season() === 'winter' || s.weather === 'snow';
const coastish = (s) => ['coast', 'oregon_coast'].includes(s.biome());
const greenish = (s) => ['forest', 'oregon', 'oregon_coast'].includes(s.biome());

export const EVENTS_EXTRA = [
  // ======================= RV QUIRKS =======================
  {
    id: 'x_dump_disaster', cat: 'rv', weight: 3.5, when: (s) => s.tank >= 55,
    run(s) {
      return { title: 'The Dump Station Incident', tone: 'bad', who: 'joe',
        text: 'The black tank is at ' + s.tank + '%. The hose is out. The bay door is open. Joe is reading the campground\'s laminated "PLEASE DO NOT" list out loud like scripture.',
        choices: [
          { label: 'Joe does it himself, gloves up to the elbow',
            run: (s) => {
              if (chance(0.72)) { s.tank = 0; s.addVibes(3); return { text: 'Textbook dump. Joe rinses the hose, caps everything, and takes a bow. A neighboring RVer nods with deep respect.', tone: 'good' }; }
              s.tank = 0; s.addVibes(-8); s.spend(18);
              return { text: 'The hose pops off the fitting at precisely the wrong moment. You buy a replacement hose and a lot of disinfectant. Nobody discusses it again.', tone: 'bad' };
            } },
          { label: 'Pay the camp host $40 to do it',
            run: (s) => { s.spend(40); s.tank = 0; s.addVibes(4); return { text: 'The camp host, a man named Vern who has seen things, does it in ninety seconds flat and tells you to enjoy your stay.', tone: 'good' }; } },
          { label: 'Skip it — the tank can wait',
            run: (s) => { s.tank = Math.min(100, s.tank + 9); s.addVibes(-5); return { text: 'You close the bay door on a problem that is now nine percent larger. The RV smells faintly of consequences.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'x_slide_stuck', cat: 'rv', weight: 2.5,
    run() {
      return { title: 'The Slide Won\'t Come In', tone: 'bad', who: 'caity',
        text: 'The living-room slide makes a sound like "nnnnnNNNNN—clunk" and stops six inches out. The Georgetown is now slightly wider than a Georgetown.',
        choices: [
          { label: 'Crank it in with the manual override',
            run: (s) => { s.damageRV(3); s.addVibes(-3); return { text: 'Twenty minutes of cranking with a handle the size of a wrench, and it seats. Caity\'s arms are now a separate weather system.', tone: 'neutral' }; } },
          { label: 'Pay a mobile RV tech $180',
            run: (s) => { s.spend(180); s.addVibes(3); return { text: 'The tech finds a dime in the slide track, removes it, and charges you for an hour of diagnostic time. The dime is now the most expensive dime you own.', tone: 'neutral' }; } },
          { label: 'Duct tape the gap and drive',
            when: (s) => s.has('ducttape'),
            run: (s) => { s.add('ducttape', -1); s.damageRV(8); s.addVibes(-6); return { text: 'The tape flaps violently for two hundred miles. Rain gets in. So does a surprising amount of dust and one very determined moth.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'x_awning_wind', cat: 'rv', weight: (s) => (s.weather === 'windy' ? 5 : 1.2),
    run() {
      return { title: 'Awning Has Entered the Chat', tone: 'bad',
        text: 'A gust catches the patio awning and it billows out like a sail, arms screeching, fabric snapping. The RV is attempting to become a schooner.',
        choices: [
          { label: 'Roll it up in the gust (fast!)',
            run: (s) => { if (chance(0.65)) { s.addVibes(4); return { text: 'Caity hangs off the strap, cranks it in, and secures it with one hand while holding a coffee. Absolutely iconic.', tone: 'good' }; } s.damageRV(9); s.addVibes(-4); return { text: 'The roller tube bends about four degrees and never rolls perfectly again. It now droops like a tired eyebrow.', tone: 'bad' }; } },
          { label: 'Cut the fabric loose',
            run: (s) => { s.spend(0); s.addVibes(-5); return { text: 'One knife, one decisive slice. The awning is now a very large scarf. You did not have a very large scarf budget.', tone: 'neutral' }; } },
          { label: 'Ignore it and hope',
            run: (s) => { s.damageRV(14); s.addVibes(-3); return { text: 'The front arm snaps off entirely and goes skittering across the rest area parking lot at 40 mph. A teenager retrieves it for you. It is now art.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'x_fridge_propane', cat: 'rv', weight: 2,
    run() {
      return { title: 'The Fridge Is Warm Again', tone: 'bad', who: 'pookah', mood: 'sick',
        text: 'The propane fridge has quietly stopped cooling. The milk has developed opinions. Pookah is sitting in front of it, staring, as if her disappointment alone might restart the flame.',
        choices: [
          { label: 'Bleed the line like the forum thread says',
            run: (s) => { if (chance(0.7)) { s.repairRV(2); s.addVibes(5); return { text: 'You light the burner, hear the little "whump," and the fins start getting cold. A YouTube commenter named RV_Rick was right.', tone: 'good' }; } s.addVibes(-4); s.add('food', -4); return { text: 'It relights, runs for an hour, and dies again. You throw out four meals of uncertain dairy.', tone: 'bad' }; } },
          { label: 'Pay the RV park fix-it guy $60',
            run: (s) => { s.spend(60); s.addVibes(2); return { text: 'He replaces a fifty-cent orifice, tells you a joke about a Winnebago, and refuses to accept a tip. The fridge hums happily.', tone: 'good' }; } },
          { label: 'Eat everything that\'s about to go bad',
            run: (s) => { s.add('food', 4); s.addVibes(6); s.healAll(2); return { text: 'A solemn feast of warm cheese, three hot dogs, and the ice cream. Bela assists. Everyone feels tremendous and slightly ill.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_step_stuck', cat: 'rv', weight: 2,
    run() {
      return { title: 'The Step That Won\'t Retract', tone: 'neutral', who: 'caity',
        text: 'The automatic entry step extends. The automatic entry step refuses to go back in. It sits out there, cheerful, unbothered, a six-inch trip hazard with a motor.',
        choices: [
          { label: 'Kick it (technique passed down for generations)',
            run: (s) => { if (chance(0.6)) { s.addVibes(3); return { text: 'One firm boot, one satisfying clunk. It retracts. You are a mechanic now.', tone: 'good' }; } s.damageRV(4); return { text: 'It retracts, but crooked, and the "step out" light stays on all night. The chassis battery notices.', tone: 'bad' }; } },
          { label: 'Bungee it up with duct tape',
            when: (s) => s.has('ducttape'),
            run: (s) => { s.add('ducttape', -1); s.addVibes(2); return { text: 'Three wraps and a prayer. The step rides shotgun, flat against the body, held by hope and adhesive.', tone: 'good' }; } },
          { label: 'Drive with it out and listen for curbs',
            run: (s) => { s.damageRV(6); s.addVibes(-4); return { text: 'The first gas station curb removes some paint and the step\'s dignity. The step is now permanently out. It is a running board. It is fine.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'x_drive_thru', cat: 'rv', weight: (s) => (['city', 'valley'].includes(s.biome()) ? 4 : 1),
    run() {
      return { title: 'The Canopy Problem', tone: 'neutral',
        text: 'A burger drive-thru. Eleven feet of clearance. The Georgetown is 12 feet to the top of the air conditioner, and she is thirsty for a milkshake.',
        choices: [
          { label: 'Park the whole rig and walk to the counter',
            run: (s) => { s.spend(38); s.add('food', 6); s.addVibes(5); return { text: 'You order like a family that has been driving for eleven days. The teenager at the register asks if the RV has a bathroom. It does. He is deeply envious.', tone: 'good' }; } },
          { label: 'Try the drive-thru anyway',
            run: (s) => {
              if (chance(0.3)) { s.add('food', 6); s.addVibes(8); return { text: 'You clear the canopy by a margin best described as "theological." The speaker box is at knee height so Joe has to lie on the floor. It works. The shakes are perfect.', tone: 'good' }; }
              s.damageRV(13); s.addVibes(-6); s.spend(95);
              return { text: 'The air conditioner shears off the bottom of the menu board in a shower of plastic numerals. You pay for the sign. You do not get the milkshake.', tone: 'bad' };
            } },
          { label: 'Send Joe in on foot',
            run: (s) => { s.spend(26); s.add('food', 4); s.addVibes(3); return { text: 'Joe returns with a bag, a tray of drinks, and a story about a man in the bathroom who also owns a Georgetown. They are now pen pals.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_jacks_mud', cat: 'rv', weight: (s) => (s.sleep === 'boondock' && ['rain', 'storm'].includes(s.weather) ? 4 : 1),
    run() {
      return { title: 'Jacks, Meet Mud', tone: 'bad', who: 'caity',
        text: 'Overnight rain turned the campsite into a pudding. The leveling jacks have sunk to their ankles, the wheels are half-buried, and the Georgetown is leaning like it\'s telling you a secret.',
        choices: [
          { label: 'Stack leveling blocks under the tires',
            run: (s) => { s.addVibes(-3); return { text: 'Forty minutes on your knees in the mud, but she climbs out. Caity\'s boots are now a permanent archaeological site.', tone: 'neutral' }; } },
          { label: 'Rock it out with throttle and grit',
            run: (s) => { if (chance(0.5)) { s.addVibes(4); return { text: 'Forward, reverse, forward, reverse — and out she comes, flinging mud in a beautiful arc. Everyone cheers. A nearby dog is furious.', tone: 'good' }; } s.damageRV(9); return { text: 'The rear tires dig two beautiful, useless trenches. A guy with a tractor takes pity on you.', tone: 'bad' }; } },
          { label: 'Call a tow ($150)',
            run: (s) => { s.spend(150); s.loseDays(1); return { text: 'A tow truck winches you out onto solid gravel. The driver says "happens to everybody" and does not sound like he means it.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_gray_tank', cat: 'rv', weight: 2.2,
    run() {
      return { title: 'The Other Tank', tone: 'bad',
        text: 'Everyone forgets the gray tank. The gray tank has been remembering everyone. The kitchen sink is draining slower and slower, and the shower has become a wading pool with ambition.',
        choices: [
          { label: 'Dump at the next station ($25)',
            run: (s) => { s.spend(25); s.addVibes(5); return { text: 'Two minutes at the dump station and the world is right again. Caity does a small ceremonial dance around the hose.', tone: 'good' }; } },
          { label: 'The coffee-grounds trick from the internet',
            run: (s) => { if (chance(0.55)) { s.addVibes(3); return { text: 'Coffee grounds, hot water, wait an hour, dump. It works. You have solved plumbing with breakfast.', tone: 'good' }; } s.addVibes(-5); return { text: 'Now the sink smells like a compost bin in August and drains exactly the same. Net loss.', tone: 'bad' }; } },
          { label: 'Live with it, shower at truck stops',
            run: (s) => { s.addVibes(-6); s.spend(12); return { text: 'Navy showers and truck-stop stalls for three days. It is survivable. It is not lovely.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_ac_drip', cat: 'rv', weight: (s) => (['hot', 'scorching'].includes(s.weather) ? 4 : 1),
    run() {
      return { title: 'The Roof AC Is Crying', tone: 'bad',
        text: 'The roof air conditioner has begun dripping directly onto the dinette, where it has formed a small, cold lake. Pookah is drinking from it, which is either resourceful or alarming.',
        choices: [
          { label: 'Climb up and clear the drain hole',
            run: (s) => { if (chance(0.75)) { s.repairRV(2); s.addVibes(4); return { text: 'One clogged drain hole and a paper towel later, the lake is gone. Joe is on the roof, triumphant, and we all pretend not to be nervous.', tone: 'good' }; } s.damageRV(5); s.addVibes(-3); return { text: 'The drain is clear, but a screwdriver gets dropped into the vent and now something rattles in there permanently.', tone: 'bad' }; } },
          { label: 'Pay the shop $110',
            run: (s) => { s.spend(110); s.addVibes(2); return { text: 'The shop cleans the coil and the drain and tells you your AC is "actually in great shape for its age," which is what everyone says about the RV.', tone: 'good' }; } },
          { label: 'Turn it off and open the windows',
            run: (s) => { s.addVibes(-5); s.add('water', -4); return { text: 'The windows open. The road noise enters. So does the heat, the dust, and one bee, who lives with you now.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'x_water_pump', cat: 'rv', weight: 1.6,
    run() {
      return { title: 'BZZZT. BZZZT. BZZZT.', tone: 'neutral', who: 'joe',
        text: 'The water pump has started running every ninety seconds for no reason, with the sound of a tiny, furious robot. Somewhere in the walls, water is going where water should not go.',
        choices: [
          { label: 'Track the leak with paper towels',
            run: (s) => { s.damageRV(4); s.addVibes(-2); return { text: 'You find a weeping fitting behind the shower wall, tighten it a quarter turn, and lose a towel to the cause. The robot goes quiet.', tone: 'neutral' }; } },
          { label: 'Pay an RV shop $140',
            run: (s) => { s.spend(140); s.repairRV(3); return { text: 'The shop replaces the pump and charges you for the pump plus a smaller pump\'s worth of labor. The water runs strong and quiet.', tone: 'good' }; } },
          { label: 'Ignore it, it\'s just a noise',
            run: (s) => { s.damageRV(8); s.add('water', -8); s.addVibes(-4); return { text: 'By morning the carpet outside the bathroom squishes. You have watered the RV. It did not need watering.', tone: 'bad' }; } },
        ] };
    },
  },

  // ======================= PETS =======================
  {
    id: 'x_bela_raccoon', weight: (s) => (s.alive('bela') && s.sleep !== 'rvpark' ? 4 : 0.5),
    run(s) {
      if (chance(0.7)) {
        s.addVibes(7);
        return { title: 'Security Chief On Duty', tone: 'good', who: 'bela', mood: 'happy', sfx: 'woof',
          text: 'A raccoon tries the picnic table at 2 AM. Bela hits the window like a furry battering ram and produces a bark you can feel in your teeth. The raccoon leaves. Bela accepts no payment but will take a treat.' };
      }
      s.addVibes(-3);
      return { title: 'The Raccoon Won', tone: 'bad', who: 'bela', mood: 'sick',
        text: 'The raccoon got into the kibble bag. Bela was on duty. Bela has chosen to befriend the raccoon instead. They are sharing. You are now supporting a raccoon.' };
    },
  },
  {
    id: 'x_bela_beach', weight: 4, when: (s) => s.alive('bela') && coastish(s),
    run(s) {
      s.addVibes(9); s.hurt('bela', 3); s.add('water', -3);
      return { title: 'Salt and Sand and Bull Terrier', tone: 'good', who: 'bela', mood: 'happy', sfx: 'woof',
        text: 'Bela sees the ocean, does one full-body shiver of joy, and then runs at the surf barking like the sea owes her money. She digs a hole the size of a wheelbarrow. She rolls in something that used to be a crab.' };
    },
  },
  {
    id: 'x_bela_chihuahua', weight: 2.5, when: (s) => s.alive('bela'),
    run() {
      return { title: 'Dog Park Diplomacy', tone: 'neutral', who: 'bela',
        text: 'A tiny chihuahua in a sweater takes one look at 60 pounds of egg-headed muscle and decides Bela is her personal bodyguard. Bela accepts the job immediately and stands very still, guarding her new friend from a butterfly.',
        choices: [
          { label: 'Stay and let them play a while',
            run: (s) => { s.addVibes(7); s.heal('bela', 3); return { text: 'Twenty minutes of extremely mismatched wrestling. The chihuahua\'s owner gives you a bag of fancy treats "for the big girl."', tone: 'good' }; } },
          { label: 'Get back on the road',
            run: (s) => { s.add('treats', 1); s.addVibes(3); return { text: 'The chihuahua\'s owner presses a bag of treats on you anyway and says, "You can tell she\'s a good one." Bela sleeps for two hours.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_bela_burrito', weight: 2, when: (s) => s.alive('bela') && s.inv.food > 20,
    run(s) {
      s.add('food', -3); s.sicken('bela', 'ate a whole burrito');
      return { title: 'Counter Surfing Champion', tone: 'bad', who: 'bela', mood: 'sick', sfx: 'woof',
        text: 'Bela has, at some point in the last four minutes, eaten an entire burrito off the dinette table while everyone looked at a map. She is licking her chops with the smugness of a cat and the gas of a much larger animal.' };
    },
  },
  {
    id: 'x_muskrat_watch', weight: 3, when: (s) => s.alive('muskrat'),
    run(s) {
      s.addVibes(5);
      return { title: 'The Navigator', tone: 'good', who: 'muskrat', mood: 'happy',
        text: 'Muskrat has taken up a post on the back of the passenger seat, ears swiveling, watching the road with the focus of a tiny air traffic controller. She chirps at a truck. She seems pleased with her work.' };
    },
  },
  {
    id: 'x_muskrat_hide', weight: 2.5, when: (s) => s.alive('muskrat'),
    run() {
      return { title: 'Cat Not Found', tone: 'neutral', who: 'muskrat',
        text: 'Muskrat has discovered a hole behind the dinette cushions that leads into the wall of the RV. She has entered it. She has not come out. The RV is now a haunted house with one ghost.',
        choices: [
          { label: 'Shake the treat bag',
            when: (s) => s.has('treats'),
            run: (s) => { s.add('treats', -1); s.addVibes(5); return { text: 'The bag rustles. A brown head emerges from the wall like a jack-in-the-box. She acts like coming out was her idea.', tone: 'good' }; } },
          { label: 'Wait her out',
            run: (s) => { s.addVibes(-3); return { text: 'Two hours later she strolls out of a different cabinet entirely, dusty and unrepentant, and yawns at you.', tone: 'neutral' }; } },
          { label: 'Unscrew the panel',
            run: (s) => { s.damageRV(3); s.addVibes(2); return { text: 'Six screws out, one cat extracted, six screws back in with one left over. Muskrat is furious. The RV has a new inspection hatch.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_pookah_purr', weight: 3, when: (s) => s.alive('pookah'),
    run(s) {
      s.healAll(4); s.addVibes(7);
      return { title: 'Floof Therapy', tone: 'good', who: 'pookah', mood: 'happy',
        text: 'Pookah climbs onto the dash, curls into a perfect black-and-white comma, and starts purring at a frequency that seems to fix something in everyone\'s chest. Even Caity, who has been gripping the wheel since Sacramento, exhales.' };
    },
  },
  {
    id: 'x_pookah_litter', weight: 3, when: (s) => s.alive('pookah') && s.inv.litter < 8,
    run(s) {
      s.addVibes(-5);
      return { title: 'A Matter of Principle', tone: 'bad', who: 'pookah', mood: 'sick',
        text: 'Pookah has inspected the litter box, found it beneath her standards, and is now pooping in the shower. With eye contact. She is making a point, and the point is being received.' };
    },
  },
  {
    id: 'x_catnip', weight: 2, when: (s) => s.cats().length > 0,
    run(s) {
      const cats = s.cats();
      if (!cats.length) return null;
      const cat = pick(cats);
      s.addVibes(6);
      return { title: 'The Good Stuff', tone: 'good', who: cat.id, mood: 'happy',
        text: `Somewhere in the storage bay there was a forgotten bag of catnip. ${s.name(cat.id)} finds it, rolls in it, defends it with growls, and then stares at the ceiling for eleven minutes.` };
    },
  },
  {
    id: 'x_pet_portrait', weight: 1.5, when: (s) => s.pets().length > 0,
    run(s) {
      s.addVibes(5);
      return { title: 'The Group Photo', tone: 'good',
        text: 'Joe tries to get a photo of all three animals in front of a scenic overlook. Bela looks away. Muskrat leaves. Pookah is perfect but facing backwards. The resulting blurry photo is immediately everyone\'s favorite.',
        choices: [
          { label: 'Print it at the next pharmacy',
            run: (s) => { s.spend(4); s.addVibes(6); return { text: 'Four dollars and ten minutes. The photo goes on the fridge with a magnet. It is slightly crooked and everyone loves it.', tone: 'good' }; } },
          { label: 'Keep trying for a better one',
            run: (s) => { s.addVibes(2); return { text: 'Twenty more minutes, 63 photos, zero usable ones. The blurry one was the good one. It always is.', tone: 'neutral' }; } },
        ] };
    },
  },

  // ======================= PLACES & BIOMES =======================
  {
    id: 'x_grapevine_grade', weight: 8, when: (s) => to(s) === 'grapevine',
    run() {
      return { title: 'The Grapevine Is a Mountain, Actually', tone: 'neutral', who: 'caity', mood: 'sick',
        text: 'Six percent grade. Headlights on. Semis in the slow lane doing 35 with their flashers on. The Georgetown\'s V10 is screaming in second gear and the temperature gauge is thinking about it.',
        choices: [
          { label: 'Take the truck lane and go slow',
            run: (s) => { s.damageRV(3); return { text: 'You crawl up behind the semis at 35 mph, hazard lights blinking, feeling every one of your 33 feet. The summit arrives. Nobody cheers louder than Joe.', tone: 'neutral' }; } },
          { label: 'Keep up with traffic',
            run: (s) => { if (chance(0.5)) { s.damageRV(8); s.addVibes(-4); return { text: 'The transmission downshifts with a sound like a dropped toolbox. You make it, but something now smells hot and faintly sweet.', tone: 'bad' }; } s.damageRV(2); s.addVibes(3); return { text: 'She holds 55 the whole way, engine bellowing, and crests the pass like a very large, very tired hero.', tone: 'good' }; } },
          { label: 'Chain up first, just in case',
            when: (s) => s.has('chains'),
            run: (s) => { s.addVibes(-1); return { text: 'Twenty minutes of cold fingers and rattling chain, and then the Georgetown clanks up the grade like a small tank. It takes forever, and nothing bad happens, which is the whole point.', tone: 'neutral' }; } },
          { label: 'Pull over at the top for the viewpoint',
            run: (s) => { s.addVibes(6); s.healAll(2); return { text: 'At Tejon Pass the whole Central Valley opens up below you, hazy and enormous. Everyone gets out. Bela sniffs a shrub with great seriousness.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_weigh_station', weight: 4, when: (s) => !s.inOregon() && ['valley', 'pass'].includes(s.biome()),
    run() {
      return { title: 'The Scales', tone: 'neutral', who: 'joe',
        text: 'A yellow sign: ALL TRUCKS OVER 8,000 LBS MUST STOP. Red lights flash. A ramp leads to a long concrete pad where semis sit in a patient row. The Georgetown weighs about 18,000 pounds empty. Joe\'s hands are on the wheel at ten and two.',
        choices: [
          { label: 'Drive on by — RVs are exempt',
            run: (s) => { if (chance(0.8)) { s.addVibes(4); return { text: 'The sign is for commercial trucks. You sail past. In the mirror, a trucker gives you a little nod, like he knows you just panicked.', tone: 'good' }; } s.spend(0); s.addVibes(-3); return { text: 'You sail past, and then a CHP officer pulls alongside, looks up at 12 feet of Georgetown, and just shakes his head slowly before merging away. Your soul leaves your body and comes back.', tone: 'neutral' }; } },
          { label: 'Pull in and ask, just to be sure',
            run: (s) => { s.addVibes(-2); return { text: 'The officer in the booth says, "Sir, this is for commercial vehicles," with the patience of a man who has said it 400 times today. She waves you back out into traffic. It takes nine minutes to merge.', tone: 'neutral' }; } },
          { label: 'Stop and weigh her for fun',
            run: (s) => { s.addVibes(5); return { text: 'Off-duty and curious, the officer lets you roll onto the pad. 18,240 pounds. Everyone in the RV gasps. Joe writes the number on his hand. It will come up at dinner for the rest of the trip.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_cattle_air', weight: 7, when: (s) => to(s) === 'harris_ranch',
    run() {
      return { title: 'The Smell Arrives First', tone: 'bad', who: 'pookah', mood: 'sick',
        text: 'Four miles of feedlot. Thirty thousand cattle standing in careful rows like a very large outdoor apartment building. The smell gets into the dash vents, the curtains, the cat litter, and possibly your DNA.',
        choices: [
          { label: 'Recirculate and roll up everything',
            run: (s) => { s.addVibes(-2); return { text: 'The RV becomes a sealed capsule of warm, cow-flavored air. Everyone breathes through their shirt. Bela, inexplicably, is delighted.', tone: 'neutral' }; } },
          { label: 'Stop at the restaurant for a steak',
            run: (s) => { s.spend(72); s.add('food', 8); s.addVibes(4); return { text: 'You eat a steak within sight of the cattle who are, statistically speaking, not the ones on your plate. It is delicious and a little existential.', tone: 'good' }; } },
          { label: 'Open the windows and embrace it',
            run: (s) => { s.addVibes(-6); s.healAll(-2); return { text: 'You breathe the Central Valley\'s most famous air for eleven straight miles. The cats go silent with horror. This was not a good idea.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'x_garlic_air', weight: 7, when: (s) => to(s) === 'gilroy',
    run() {
      return { title: 'Gilroy Breathes On You', tone: 'neutral',
        text: 'The air over Gilroy is not air. It is a seasoning. Garlic hangs over the highway in a visible haze that gets into the RV, the upholstery, the dog, and, somehow, the coffee.',
        choices: [
          { label: 'Buy garlic ice cream at a stand ($9)',
            run: (s) => { s.spend(9); s.addVibes(7); return { text: 'It tastes like vanilla for one second and then like garlic for the rest of time. Caity finishes hers. Joe does not. Bela licks the cone and makes a face.', tone: 'good' }; } },
          { label: 'Buy a braid of garlic for the road ($14)',
            run: (s) => { s.spend(14); s.add('food', 3); s.addVibes(4); return { text: 'A braid of garlic the size of a small child now hangs in the RV, curing in the sunshine. Vampires are handled. So is flavor.', tone: 'good' }; } },
          { label: 'Drive through with the windows up',
            run: (s) => { s.addVibes(-1); return { text: 'You arrive at the next stop smelling like a very well-fed Italian grandmother. This will not wash out for three days.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_oregon_attendant', weight: 5, when: (s) => s.inOregon() && s.inv.gas < 55,
    run() {
      return { title: 'An Attendant Appears', tone: 'good',
        text: 'In Oregon, you pull up to the pump and a cheerful young person materializes. "Hey! How\'s your trip? Fill \'er up?" You had read that Oregon legalized self-serve in 2023, but this station clearly never got the memo.',
        choices: [
          { label: 'Let them do it and chat',
            run: (s) => { s.add('gas', 12); s.spend(rint(48, 62)); s.addVibes(6); return { text: 'They pump, they wipe the windshield without being asked, and they give you a tip about a free dump station two exits up. You feel cared for.', tone: 'good' }; } },
          { label: 'Pump it yourself, you\'re from out of state',
            run: (s) => { s.add('gas', 12); s.spend(rint(48, 62)); s.addVibes(-2); return { text: 'The attendant watches you fumble with the diesel/gas selector, says "that one\'s gas, hon," and then stands beside you the whole time being polite. It is somehow worse.', tone: 'neutral' }; } },
          { label: 'Ask about chain controls up ahead',
            run: (s) => { s.add('gas', 12); s.spend(rint(48, 62)); s.addVibes(3); return { text: 'They pull out their phone and check TripCheck for you: Siskiyou is bare and dry today, but they say "that can change by four o\'clock, it always does."', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_ferry_wait', weight: 8, when: (s) => to(s) === 'wheatland_ferry',
    run() {
      return { title: 'The Ferry Fits Nine', tone: 'neutral', who: 'caity',
        text: 'The Wheatland Ferry is a flat little electric cable ferry that has been crossing the Willamette since the 1840s. A sign says it holds nine vehicles. You are one vehicle, and you are 33 feet long.',
        choices: [
          { label: 'Wave the car behind you to go ahead',
            run: (s) => { s.addVibes(3); return { text: 'A woman in a Subaru takes your spot and gives you a thumbs up. You wait a full round trip, watching the water. It is, honestly, the nicest forty minutes of the week.', tone: 'good' }; } },
          { label: 'Ask the operator if you\'ll fit',
            run: (s) => { s.addVibes(5); return { text: '"She\'ll fit if you pull forward slow and don\'t mind scraping an inch off the deck rail." You mind. But you do it slowly, and the operator walks you on with hand signals like a man parking an airplane.', tone: 'good' }; } },
          { label: 'Chicken out and drive the long way',
            run: (s) => { s.add('gas', -4); s.addVibes(-2); return { text: 'Thirty-five extra miles to the bridge at Salem. Safe, sensible, and completely boring. Caity says nothing for eleven miles, which is its own review.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_portland_rain', weight: 7, when: (s) => to(s) === 'portland',
    run() {
      return { title: 'The Last Rain', tone: 'neutral', who: 'caity',
        text: 'The sky ahead goes gray in a single, clean line, like someone pulled a shade. Then the first drops hit the windshield — big, slow, generous Portland rain.',
        choices: [
          { label: 'Turn on the wipers and the radio',
            run: (s) => { s.addVibes(8); s.healAll(3); return { text: 'Some indie station plays something with a lot of reverb. The wipers keep time. Nobody talks, and it\'s that good kind of silence.', tone: 'good' }; } },
          { label: 'Pull over and put the awning out',
            run: (s) => { s.repairRV(2); s.addVibes(4); return { text: 'You sit under the awning in the rain for twenty minutes, drinking gas station coffee that is somehow perfect, while Bela smells the air.', tone: 'good' }; } },
          { label: 'Push straight through',
            run: (s) => { s.addVibes(2); return { text: 'You arrive early, wet, and slightly smug. Portland is a smudge of bridges and glowing windows.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_blackberry_forage', weight: 4, when: (s) => greenish(s) && ['summer', 'fall'].includes(s.season()),
    run() {
      return { title: 'Blackberry Brakes', tone: 'good',
        text: 'The ditches along the road are black with Himalayan blackberries. They are technically an invasive species. They are also, right now, the most delicious thing within 300 feet.',
        minigame: { name: 'forage', params: { kind: 'blackberry' },
          after: (s, o) => {
            const n = Math.max(1, Math.min(9, Number(o?.score) || rint(3, 8)));
            s.add('food', n * 2); s.addVibes(5); s.stats.berries += n;
            if (n >= 6) return { title: 'Purple Hands, Full Bucket', tone: 'good', text: `You pick ${n} containers of blackberries. There are thorns in your forearms and purple juice on everyone's teeth. Pookah has eaten one and is now vibrating.`, sfx: 'good' };
            if (n >= 3) return { title: 'Worth It', tone: 'good', text: `You get ${n} containers before the thorns win. It's enough for two cobblers and one very smug dog who ate a handful off the bush.` };
            s.hurt('caity', 4); return { title: 'The Bramble Fights Back', tone: 'bad', text: 'The bramble wins. Caity comes out with a scratched forearm, three berries, and a lecture about how "they taste better when you earn it."' };
          } } };
    },
  },
  {
    id: 'x_valley_hay', weight: 3, when: (s) => s.biome() === 'valley',
    run() {
      return { title: 'Hay Bale Freeway', tone: 'bad', sfx: 'honk',
        text: 'The wind has been busy. A flatbed ahead is shedding hay bales onto the freeway in slow motion, one every few hundred feet, each one big enough to end a relationship with your front end.',
        minigame: { name: 'freeway', params: { theme: 'debris' },
          after: (s, o) => {
            const hits = Number.isFinite(o?.hits) ? o.hits : rint(0, 2);
            if (hits === 0) { s.addVibes(5); return { title: 'Clean Line', tone: 'good', text: 'Caity threads the Georgetown between three bales with room to spare. Joe has been gripping the door handle so hard he has left an impression.' }; }
            s.damageRV(3 * hits); s.addVibes(-2 * hits);
            return { title: 'Hay Everywhere', tone: 'bad', text: `You clip ${hits} bale${hits === 1 ? '' : 's'}. The RV sheds straw for the next two hundred miles, like it's been to a very rough square dance.` };
          } } };
    },
  },
  {
    id: 'x_siskiyou_snow', weight: 6, when: (s) => to(s) === 'siskiyou' && wintry(s),
    run() {
      return { title: 'Chain Control at Siskiyou', tone: 'bad', who: 'caity',
        text: 'ODOT has the blue lights on and a sign reading CHAINS OR TRACTION TIRES REQUIRED. Snow is coming down in fat, unhurried flakes. Trucks are queued a half mile back, drivers out in the cold, banging chains on.',
        minigame: { name: 'freeway', params: { theme: 'snow' },
          after: (s, o) => {
            const hits = Number.isFinite(o?.hits) ? o.hits : rint(0, 2);
            if (hits === 0) { s.repairRV(2); s.addVibes(6); return { title: 'Over the Top', tone: 'good', text: 'You creep over the summit at 25 mph, snowflakes going sideways, headlights on, chains biting. Then the grade eases, and Oregon is right down there in the gray.' }; }
            s.damageRV(4 * hits); s.hurtAll(2); s.addVibes(-3);
            return { title: 'A Slip and a Scrape', tone: 'bad', text: `The Georgetown slides a little ${hits} time${hits === 1 ? '' : 's'} and kisses the chain-up area guardrail. Everyone is fine. Everyone is also very, very quiet.` };
          } } };
    },
  },
  {
    id: 'x_old_growth', weight: 5, when: (s) => to(s) === 'redwoods',
    run() {
      return { title: 'Two Thousand Years of Tree', tone: 'neutral',
        text: 'US-199 turns into a tunnel of redwood: trunks eight feet wide, bark the color of a burnt cake, fog hanging in the branches like the trees are remembering something. A sign warns: LOW BRANCHES, 14\'0" CLEARANCE.',
        choices: [
          { label: 'Pull into the drive-through tree ($15)',
            run: (s) => { s.spend(15); s.damageRV(6); s.addVibes(7); return { text: 'The Georgetown fits. Barely. There is a sound from the roof that everyone agrees not to investigate. The photo is worth it.', tone: 'good' }; } },
          { label: 'Park and walk the grove',
            run: (s) => { s.spend(8); s.addVibes(8); s.healAll(3); return { text: 'You walk among the big trees for an hour. Pookah rides in Joe\'s arms, looking up, whiskers forward. Nobody says much. It\'s a cathedral kind of quiet.', tone: 'good' }; } },
          { label: 'Just keep rolling, windows down',
            run: (s) => { s.addVibes(4); return { text: 'Thirty miles of windows-down and no radio. The air smells like wet bark and fern. Even Bela stops panting to smell it.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_bigfoot_country', weight: 3, when: (s) => greenish(s) && s.inOregon(),
    run() {
      return { title: 'Something Out There', tone: 'neutral', who: 'muskrat',
        text: 'It is 9:40 PM on a two-lane road through black timber. Muskrat snaps upright in the window, ears flat, tail fat. Then, in the headlights, thirty feet off the shoulder: a shape. Tall. Upright. Moving. Then gone.',
        choices: [
          { label: 'Turn around and look for tracks',
            run: (s) => { if (chance(0.65)) { s.addVibes(10); s.add('food', 2); return { title: 'Bigfoot, Probably', tone: 'good', text: 'You find a muddy print the size of a dinner plate. Joe photographs it eleven times. It is almost certainly a bear. Muskrat refuses to look at it.', tone: 'good' }; } s.addVibes(-2); return { title: 'Just a Bear', tone: 'neutral', text: 'It was a bear, standing up to reach a branch. A big bear. Everyone is a little deflated and a little relieved, in that order.' }; } },
          { label: 'Lock the doors and keep driving',
            run: (s) => { s.addVibes(3); return { text: 'Nobody says the word "Sasquatch" out loud, but everyone is thinking it. Bela growls at the treeline for eleven miles.', tone: 'neutral' }; } },
          { label: 'Honk and wave',
            run: (s) => { s.addVibes(-3); return { text: 'You honk. The shape does not react. Bela does. Loudly. For a long time. The woods do not care.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_smoke_tourist', weight: 5, when: (s) => s.weather === 'smoke',
    run() {
      return { title: 'The Sky Is Apricot', tone: 'bad',
        text: 'The whole valley is orange. The sun is a flat copper coin. Air quality says 210. A man in the gas station parking lot says, cheerfully, "Ah, it\'s not that bad, we get this every August!"',
        choices: [
          { label: 'Buy N95 masks ($22)',
            run: (s) => { s.spend(22); s.healAll(6); s.addVibes(3); return { text: 'Four masks from the counter. You look ridiculous and feel much better. Bela gets a wet towel to breathe through and is insulted by it.', tone: 'good' }; } },
          { label: 'Keep the windows shut and the AC on recirculate',
            run: (s) => { s.healAll(2); s.addVibes(-2); return { text: 'The RV becomes a sealed little pod of filtered, slightly stale air. It works. It also smells like the inside of a vacuum cleaner.', tone: 'neutral' }; } },
          { label: 'Act normal, it\'s just a smell',
            run: (s) => { s.hurtAll(5); const h = s.randomPresent((m) => m.species === 'human'); if (h) s.sicken(h.id, 'a smoke headache'); return { text: 'By afternoon everyone has a headache and a weird taste in their mouth. The man at the gas station was not a reliable source.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'x_coast_fogbank', weight: 4, when: (s) => coastish(s) && s.weather === 'fog',
    run() {
      return { title: 'One Hundred Feet of World', tone: 'neutral', who: 'caity',
        text: 'The fog bank sits on the highway like a wall. Beyond it, the ocean is enormous and completely invisible. Every few hundred yards the headlights find another cypress tree, then the gray takes it back.',
        choices: [
          { label: 'Slow to 45 and turn on the flashers',
            run: (s) => { s.addVibes(-1); return { text: 'You creep north with the flashers on. A pickup ahead becomes a helpful little red ghost to follow. After twenty minutes, the fog lifts all at once, like a curtain.', tone: 'neutral' }; } },
          { label: 'Stop for chowder in a fogbound town',
            run: (s) => { s.spend(46); s.add('food', 6); s.addVibes(7); return { text: 'A little place with too many buoys on the wall. The chowder is thick enough to stand a spoon in. The waitress says the fog will be gone by two.', tone: 'good' }; } },
          { label: 'Use the fog to teach Bela to howl at ships',
            run: (s) => { s.addVibes(6); return { text: 'Somewhere out there a foghorn sounds. Bela answers it. Then Caity answers it. Then the whole RV is a foghorn choir for eleven straight miles.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_dunes_detour', weight: 3, when: (s) => to(s) === 'santa_barbara',
    run() {
      return { title: 'The Long Way Round', tone: 'neutral',
        text: 'A side road promises SAND DUNES — 4 MILES. The road is a strip of asphalt across a field of rippled gold. Caity looks at it. Bela looks at it. Everyone looks at Caity.',
        choices: [
          { label: 'Take the detour',
            run: (s) => { s.spend(12); s.addVibes(8); s.add('water', -3); return { text: 'You park at the edge and everyone runs up the dunes like children. Bela does the hucklebutt at the top at full speed and disappears over the far side. She comes back wearing most of the dune.', tone: 'good' }; } },
          { label: 'Ask Caity how she feels about sand in the RV',
            run: (s) => { s.addVibes(2); return { text: 'Caity says, "Absolutely not," and then, after a pause, "Maybe one dune." You compromise on zero dunes, and everyone is a little sorry.', tone: 'neutral' }; } },
          { label: 'Keep driving, save the time',
            run: (s) => { s.addVibes(-1); return { text: 'You leave the dunes in the mirror. Joe reads the Wikipedia page about them out loud for six minutes as a form of penance.', tone: 'neutral' }; } },
        ] };
    },
  },

  // ======================= PEOPLE =======================
  {
    id: 'x_stranded_motorist', weight: 3,
    run() {
      return { title: 'Hazards On', tone: 'neutral',
        text: 'A sedan on the shoulder with its hood up and its flashers on. An older woman stands beside it, holding a phone at arm\'s length, squinting at it like it insulted her.',
        choices: [
          { label: 'Pull over and help',
            run: (s) => {
              s.flags.helpedMotorist = 1;
              if (s.has('parts') && chance(0.55)) { s.add('parts', -1); s.earn(40); s.addVibes(9); return { title: 'Fixed It', tone: 'good', text: 'It\'s a loose battery terminal. You tighten it with the kit\'s wrench, she insists on giving you $40 despite your protests, and writes down your names in a little notebook. "For my prayers," she says.' }; }
              s.addVibes(7); s.spend(20); return { title: 'Good Neighbors', tone: 'good', text: 'You can\'t fix it, but you sit with her for twenty minutes until her grandson arrives, and you give her a bottle of water and a granola bar. She calls you "an angel" twice. Bela gets a head pat.' };
            } },
          { label: 'Honk and wave as you pass',
            run: (s) => { s.addVibes(-3); return { text: 'You wave. She waves. You both know that wave meant nothing.', tone: 'neutral' }; } },
          { label: 'Call roadside assistance for her from the next exit',
            run: (s) => { s.spend(0); s.addVibes(4); return { text: 'You spend eleven minutes on hold with a dispatcher to arrange a tow for a stranger. It costs you nothing but time, and it turns out to be the right thing.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_hitchhiker', weight: 2,
    run() {
      return { title: 'Thumbs', tone: 'neutral', who: 'caity',
        text: 'A young man with a guitar case and a cardboard sign that says PORTLAND (EVENTUALLY). He is clean, polite, and has exactly the energy of someone who will either be delightful or a story you tell for years.',
        choices: [
          { label: 'Give him a ride (and a snack)',
            run: (s) => {
              s.add('food', -3); s.addVibes(6);
              if (chance(0.6)) return { title: 'The Guitar Guy', tone: 'good', text: 'He plays "Here Comes the Sun" badly and with total sincerity while Bela rests her chin on his knee. He gets out at a rest area and leaves you a mixtape on a USB stick. It is surprisingly good.' };
              s.addVibes(-3); s.spend(12);
              return { title: 'A Long 40 Miles', tone: 'neutral', text: 'He talks about crypto for forty straight miles. Bela falls asleep. Caity\'s jaw tightens. You drop him at a bus stop and he says "stay blessed," which is somehow the worst part.' };
            } },
          { label: 'Give him water and a granola bar instead',
            run: (s) => { s.add('food', -2); s.addVibes(5); return { text: 'He takes the water, says thanks, and does not push. You feel like a decent person and also like you got out of a forty-mile conversation.', tone: 'good' }; } },
          { label: 'Keep driving',
            run: (s) => { s.addVibes(-2); return { text: 'In the mirror he gets smaller and then he is a dot and then he is a thing you think about at 2 AM.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_dutch_bros', weight: 4, when: (s) => s.inOregon(),
    run() {
      return { title: 'Dutch Bros Drive-Thru', tone: 'good',
        text: 'A little blue-and-green stand with a line of cars and a barista who greets you at a volume that suggests she has had four of these herself. "Heyyy! What can I get started for you guys?"',
        choices: [
          { label: 'Order two large Rebels ($16)',
            run: (s) => { s.spend(16); s.add('coffee', 1); s.addVibes(7); return { text: 'She asks Joe three questions about his order, then says "you got it, babe." The drinks are enormous and taste like a gas station slushie that went to college. Caity is vibrating within four miles.', tone: 'good' }; } },
          { label: 'Ask her what the road ahead looks like',
            run: (s) => { s.spend(9); s.add('coffee', 1); s.addVibes(5); return { text: 'She draws you a tiny map on the back of a punch card: "Skip the exit 228 gas, it\'s a rip-off. Dump station free at the rest area past the ferry." This is better intelligence than either of you got in Sacramento.', tone: 'good' }; } },
          { label: 'Order a plain black coffee and a pup cup',
            run: (s) => { s.spend(6); s.add('coffee', 1); s.add('treats', 1); s.addVibes(6); return { text: 'Bela gets a cup of whipped cream, which she consumes with her entire face. Pookah is offered a sniff of the empty cup and reacts as if handed a dead mouse.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_county_fair', weight: 3, when: (s) => ['valley', 'oregon'].includes(s.biome()) && ['summer', 'fall'].includes(s.season()),
    run() {
      return { title: 'County Fair, Exit Now', tone: 'neutral',
        text: 'A hand-lettered banner: COUNTY FAIR — PIE CONTEST — DEMOLITION DERBY 7PM. There is a field for parking. There is a field for everything.',
        choices: [
          { label: 'Park the RV and go in ($30)',
            run: (s) => { s.spend(30); s.add('food', 8); s.addVibes(9); s.healAll(2); return { text: 'You eat a corn dog, a funnel cake, and something called a "walking taco." Bela wins a ribbon in the unofficial dog contest from a judge who says "she has a very good head." She does.', tone: 'good' }; } },
          { label: 'Just buy a pie from the pie contest table ($18)',
            run: (s) => { s.spend(18); s.add('food', 5); s.addVibes(6); return { text: 'You buy a whole marionberry pie from a 4-H kid who looks at you like you personally saved the fair. You eat it in the RV with three forks and no plates.', tone: 'good' }; } },
          { label: 'Roll past — fairs are a whole day',
            run: (s) => { s.addVibes(-2); return { text: 'You drive on. Later, at a rest stop, you meet a family who went, and the way the kid says "they had a PIG" makes you regret everything.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_weird_attraction', weight: 2,
    run() {
      const a = pick([
        { n: 'WORLD\'S LARGEST BALL OF TWINE', d: 'It is a ball of twine the size of a small car. A man in a lawn chair will tell you about it for as long as you let him.' },
        { n: 'MYSTERY CAVE (EVIDENCE OF GIANTS)', d: 'A hand-painted sign shows a drawing of a very large ribcage. The parking is $5. The gift shop sells geodes and a T-shirt that says I BELIEVE.' },
        { n: 'GRAVITY HILL', d: 'Put your car in neutral on this one hill and it will roll uphill. Probably. For a small fee they will explain why.' },
        { n: 'MUSEUM OF TEETH', d: 'A converted gas station with three glass cases and a very passionate curator who wants to show you a mammoth molar.' },
      ]);
      return { title: a.n, tone: 'neutral',
        text: `${a.d} Caity slows without saying anything. That is how detours happen.`,
        choices: [
          { label: 'Stop for a photo and the $8 tour',
            run: (s) => { s.spend(8); s.addVibes(7); return { text: `You take the tour, ask the questions you're supposed to ask, and buy a magnet. Twenty minutes later, everyone agrees it was the best eight dollars of the trip.`, tone: 'good' }; } },
          { label: 'Pull over for a photo from the shoulder only',
            run: (s) => { s.addVibes(3); return { text: 'One photo, taken at an angle so the RV is in it too. Joe posts it. Eleven of his friends reply "where is this??".', tone: 'good' }; } },
          { label: 'Keep driving — this is a trap',
            run: (s) => { s.addVibes(-1); return { text: 'You drive past. In the mirror, the giant whatever-it-is looks sad and a little smaller.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_trucker_mentor', weight: 2.5,
    run() {
      return { title: 'A Man Named Butch', tone: 'neutral',
        text: 'A trucker in a clean Peterbilt, 41 years on the road, watches you check your tires at a Flying J and says, "You\'re running those how old?" It is not really a question.',
        choices: [
          { label: 'Ask him everything about the road ahead',
            run: (s) => { s.addVibes(6); s.add('coffee', 1); return { text: 'He tells you where the wind gusts hit on the pass, which rest area has the good dump station, and that the scale at the county line "only opens when the budget allows." Then he buys you a coffee and refuses to be thanked.', tone: 'good' }; } },
          { label: 'Take his tire advice and buy two ($240)',
            run: (s) => { s.spend(240); s.add('tires', 2); s.addVibes(4); return { text: 'Two new steer tires and a handshake. "Cheap insurance," he says. He is right, and you will think about him on the pass.', tone: 'good' }; } },
          { label: 'Thank him and keep moving',
            run: (s) => { s.addVibes(1); return { text: 'He nods, says "watch the gusts up top," and climbs into 18 wheels. You feel like you have been given a small blessing by a very large man.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_fulltimer_couple', weight: 2,
    run() {
      return { title: 'Full-Timers', tone: 'good',
        text: 'A couple in matching fleece jackets and a 22-year-old diesel pusher are set up in the next site with two chairs, a solar panel, and a bugle. They have been on the road for nine years and they want to know your life story.',
        choices: [
          { label: 'Sit and trade stories till dark',
            run: (s) => { s.addVibes(9); s.healAll(3); s.add('coffee', 2); return { text: 'They give you coffee, a jar of their homemade jam, and the best advice of the trip: "Never drive past a dump station you\'re not sure about." Joe writes it down. Caity writes down their coffee brand.', tone: 'good' }; } },
          { label: 'Ask them to look at the RV\'s weird noise',
            run: (s) => { s.addVibes(4); s.repairRV(3); return { text: 'The husband climbs under the rear and says, "Ah, that\'s just your heat shield rattling, they all do that." He tightens two bolts with a wrench from his own pocket and refuses payment.', tone: 'good' }; } },
          { label: 'Keep to yourselves',
            run: (s) => { s.addVibes(-2); return { text: 'You wave politely and close the curtains. The bugle starts around sunset. It is, honestly, not bad.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_farmers_market', weight: 2.5, when: (s) => s.inOregon() && ['oregon', 'valley', 'city'].includes(s.biome()),
    run() {
      return { title: 'Saturday Market', tone: 'good',
        text: 'Tents and folding tables under a sky the color of a laundered sheet. Someone is playing a mandolin. A woman is selling marionberries out of the back of a hatchback and she is right about them being the best thing you will eat.',
        choices: [
          { label: 'Buy a week of produce ($45)',
            run: (s) => { s.spend(45); s.add('food', 22); s.healAll(4); s.addVibes(6); return { text: 'Berries, bread, greens, mushrooms, and a jar of honey with the comb. The RV now smells like a farmer\'s market, which is a very good smell to be trapped in.', tone: 'good' }; } },
          { label: 'Buy a marionberry pie and eat it now ($16)',
            run: (s) => { s.spend(16); s.add('food', 4); s.addVibes(8); return { text: 'You eat the whole pie standing up at the edge of the market, passing it back and forth, juice on every chin. Pookah gets a crumb and is now a pie cat.', tone: 'good' }; } },
          { label: 'Buy a bag of dog treats from a farm stand ($8)',
            run: (s) => { s.spend(8); s.add('treats', 2); s.addVibes(4); return { text: 'Homemade oven-dried liver treats. Bela\'s whole body wags. She will now do anything for these. She will remember this farm for the rest of her life.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_ranger_talk', weight: 2.5, when: (s) => ['forest', 'oregon_coast', 'pass'].includes(s.biome()),
    run() {
      return { title: 'A Ranger With Opinions', tone: 'neutral',
        text: 'A park ranger at the trailhead gives you a look — the look rangers give a 33-foot Class A with a 2004 registration sticker at a trailhead built for a Subaru.',
        choices: [
          { label: 'Ask about road conditions and fire restrictions',
            run: (s) => { s.addVibes(4); return { text: 'She relaxes, pulls out a map, and marks the good pullouts with a pencil. "No open flames right now, and if you see smoke on the ridge, it\'s a prescribed burn, don\'t panic. Check the app before the pass."', tone: 'good' }; } },
          { label: 'Thank her, park carefully, and hike',
            run: (s) => { s.healAll(4); s.addVibes(6); s.add('water', -4); return { text: 'Everyone hikes a mile and a half into a grove that smells of cedar and cold water. Bela drinks out of a creek. Pookah does not get out of the backpack.', tone: 'good' }; } },
          { label: 'Take the RV down a road you should not',
            run: (s) => { s.damageRV(10); s.addVibes(-5); return { text: 'The road narrows to a single lane, then to a suggestion. A quarter mile of reverse later, a mirror is gone and the ranger is watching from the trailhead with an expression that will appear in your dreams.', tone: 'bad' }; } },
        ] };
    },
  },
  {
    id: 'x_harley_retirees', weight: 2,
    run() {
      return { title: 'The Chrome Convention', tone: 'neutral',
        text: 'A pack of six Harleys and three couples in matching leather vests, average age 68, all of them laughing like teenagers. One waves you into the parking lot of a diner with a giant coffee cup on the roof.',
        choices: [
          { label: 'Join them for pie',
            run: (s) => { s.spend(22); s.add('food', 3); s.addVibes(8); return { text: 'They want to hear everything about "the motorhome life" and offer conflicting, confident advice about fuel injectors. One of the women, Dawn, takes a photo of Bela and declares her "the best looking dog on this highway."', tone: 'good' }; } },
          { label: 'Ask for the best back road to the coast',
            run: (s) => { s.addVibes(5); return { text: 'They argue about it for four minutes and then draw a map with a stir stick and ketchup. "You want the two-lane. Trust us." The two-lane later turns out to be gorgeous.', tone: 'good' }; } },
          { label: 'Wave and take the empty spot further back',
            run: (s) => { s.addVibes(1); return { text: 'You park at the far end of the lot. They wave at you on the way out, all six of them, with a synchronization only decades of friendship explains.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_karma_repay', weight: 2, when: (s) => !!s.flags.helpedMotorist, once: true,
    run(s) {
      s.earn(60); s.add('food', 6); s.addVibes(9);
      return { title: 'The Notebook Lady', tone: 'good', who: 'joe',
        text: 'In a diner parking lot, the older woman from the shoulder recognizes you through the windshield. She has brought a cooler bag: six homemade tamales, a container of posole, and a card with $60 in it. "You were the only one who stopped," she says, and does not really let you argue.' };
    },
  },

  // ======================= GOOD LUCK =======================
  {
    id: 'x_tailwind', weight: (s) => (s.weather === 'windy' && s.biome() !== 'pass' ? 3 : 1),
    run(s) {
      s.add('gas', 5); s.addVibes(4);
      return { title: 'Free Miles', tone: 'good',
        text: 'The wind turns and pushes gently from behind. The V10 drops to a whisper. The fuel gauge barely moves for an hour. Joe reads a number off the trip computer and says, "That can\'t be right," and reads it again.' };
    },
  },
  {
    id: 'x_gas_war', weight: 1.5,
    run() {
      return { title: 'Gas Price War', tone: 'good',
        text: 'Two stations across the street from each other, both with people on ladders changing the sign. When you pull in, the price is nineteen cents lower than it was four blocks ago.',
        choices: [
          { label: 'Top off the tank ($78)',
            when: (s) => s.money >= 78,
            run: (s) => { s.spend(78); s.add('gas', 22); s.addVibes(3); return { text: 'The pump clicks off and the total is somehow lower than the last fill in California. Everyone in the RV cheers at a diesel generator in effigy.', tone: 'good' }; } },
          { label: 'Buy snacks and leave the gas',
            run: (s) => { s.spend(14); s.add('food', 4); s.add('coffee', 1); s.addVibes(2); return { text: 'You buy two ice creams and a coffee, which are also cheaper here, and drive on feeling like you beat the system.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_found_wrench', weight: 1.5,
    run(s) {
      if (!chance(0.6)) {
        s.addVibes(2);
        return { title: 'Rest Area Ground Score', tone: 'neutral',
          text: 'Under a picnic table: a single flip-flop, a charger for a phone nobody owns, and a bookmark. You take nothing. The V10 remains unhelped.' };
      }
      s.add('parts', 1); s.addVibes(3);
      return { title: 'Rest Area Ground Score', tone: 'good', who: 'joe',
        text: 'Under a picnic table: a 10-inch adjustable wrench, a coil of electrical wire, and a fan belt that fits nothing but might fit something. Joe pockets it all with the reverence of a museum curator. The parts kit is now a little better.' };
    },
  },
  {
    id: 'x_driveway_offer', weight: 2, when: (s) => s.sleep === 'boondock',
    run() {
      return { title: 'A Driveway Appears', tone: 'good',
        text: 'You are parked on a lonely county road, reading, when a man in a flannel walks over. "You kids looking for a place tonight? We got a level spot by the barn and a hose. No charge, we just don\'t get a lot of visitors."',
        choices: [
          { label: 'Accept, and offer to help with chores',
            run: (s) => { s.add('water', 40); s.addVibes(9); s.healAll(4); s.add('food', 4); return { text: 'You spend the evening stacking firewood in exchange for the spot, the hose, and a dinner of garden tomatoes and bread. Nobody wants to leave in the morning. Bela has made a friend named Gus.', tone: 'good' }; } },
          { label: 'Accept, and cook them dinner',
            run: (s) => { s.add('water', 40); s.spend(10); s.addVibes(8); return { text: 'You make the one dish everyone can cook on four burners and they make a big deal out of it. Their dog and Bela chase each other around the barn for an hour. Pookah lets a stranger pet her, once.', tone: 'good' }; } },
          { label: 'Politely decline',
            run: (s) => { s.addVibes(-1); return { text: 'You thank him and stay where you are. Around nine, he drives back past and slows to wave again.', tone: 'neutral' }; } },
        ] };
    },
  },
  {
    id: 'x_rainbow', weight: 3, when: (s) => ['rain', 'storm'].includes(s.weather),
    run(s) {
      s.addVibes(8); s.healAll(2);
      return { title: 'One Perfect Rainbow', tone: 'good',
        text: 'The storm ends all at once. The sun comes under the cloud and there it is: a full double rainbow over the next valley, complete to the earth on both sides. Caity pulls over without a word and everyone gets out.' };
    },
  },
  {
    id: 'x_radio_perfect', weight: 1.5,
    run() {
      return { title: 'The Radio Does Something Good', tone: 'good',
        text: 'You are scanning the AM dial through static and sermons and a man reading hog futures when a small-town station puts on exactly the right song. Everyone goes quiet at the same time.',
        choices: [
          { label: 'Sing along badly',
            run: (s) => { s.addVibes(7); return { text: 'Caity takes the melody. Joe takes the harmony without being asked, which is a rookie move, and the sound they make is genuinely alarming. Bela leans her head on the window and does not judge.', tone: 'good' }; } },
          { label: 'Turn it up and cruise past your exit',
            run: (s) => { s.addVibes(6); s.add('gas', -2); return { text: 'You miss the exit on purpose and drive forty extra miles of river road with the windows down and the music up. Worth it. Completely worth it.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_trail_magic', weight: 1.2,
    run(s) {
      s.add('water', 25); s.add('food', 6); s.addVibes(7);
      return { title: 'Trail Magic', tone: 'good',
        text: 'A cooler at a trailhead with a hand-lettered sign: HIKERS AND STRANGERS — TAKE ONE. Inside: cold drinks, oranges, and a bag of pretzels. There is also a notebook, and the most recent entry just says "thank you, thank you, thank you" eleven times.' };
    },
  },
  {
    id: 'x_sunset_lot', weight: (s) => (['sunny', 'hot'].includes(s.weather) && !s.inOregon() ? 2 : 1),
    run(s) {
      s.addVibes(7); s.healAll(2);
      return { title: 'Parking Lot Sunset', tone: 'good', who: 'caity',
        text: 'The sun goes down over a gas station. Not a beach, not a viewpoint — a gas station, with a taco stand in the corner and the light turning the pumps orange. Everyone sits on the curb with Bela between them and eats tacos out of paper boats.',
        choices: [
          { label: 'Buy a second round of tacos ($18)',
            run: (s) => { s.spend(18); s.add('food', 6); s.addVibes(5); return { text: 'Six more tacos. The woman running the stand remembers your order and adds a free one "for the dog," which Bela eats in one motion. The sun is long gone. Nobody wants to move.', tone: 'good' }; } },
          { label: 'Save the money and take the photo',
            run: (s) => { s.addVibes(2); return { text: 'Joe takes a photo of the three of them against the orange light. Later it will be the one you look at most.', tone: 'good' }; } },
        ] };
    },
  },
  {
    id: 'x_muskrat_escape', weight: 2.5, when: (s) => s.alive('muskrat') && ['rvpark', 'boondock'].includes(s.sleep),
    run() {
      return { title: 'Muskrat Is On The Roof', tone: 'bad', who: 'muskrat', sfx: 'meow',
        text: 'No one saw her leave. She is on the roof of the RV, walking along the edge like a tightrope artist who has done the math and is not impressed by it.',
        minigame: { name: 'catchase', params: { cat: 'muskrat' },
          after: (s, o) => {
            const caught = typeof o?.caught === 'boolean' ? o.caught : chance(0.6);
            if (caught) { s.stats.catsCaught++; s.addVibes(4); return { title: 'Extracted', tone: 'good', who: 'muskrat', text: 'Caity goes up the ladder with a towel, wraps Muskrat like a burrito, and brings her down. Muskrat is furious and purring at the same time, which is a cat specialty.' }; }
            s.hurt('muskrat', 8); s.addVibes(-7);
            return { title: 'Gone to Ground', tone: 'bad', who: 'muskrat', mood: 'sick', text: 'She drops off the far side into the bushes and is gone for three hours. You find her under the trailer next door, damp and furred with leaves, and she does not apologize.' };
          } } };
    },
  },
];
