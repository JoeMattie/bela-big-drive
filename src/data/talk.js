// What people say when you choose "Talk to people" at a stop.
//
// TALK[nodeId] = [{ who, text }, ...] — 1-3 sentences each. Every line is
// flavor plus a useful hint about the road ahead (weather, fuel, forks,
// dump stations, chain controls, season, cheap gas, ferry hours).
// REVIEWS[nodeId] = 2 short fake online reviews, affectionate and fictional.

export const TALK = {
  san_diego: [
    { who: 'Retired full-timer in a lawn chair', text: 'We left in April and we are still "just going to Portland." Two pieces of advice: fill the water tank at home where it is free, and never trust a fuel gauge that has been sitting at three-quarters since 2019.' },
    { who: 'Lot attendant with a clipboard', text: 'That rig has been sitting here so long the spiders voted. Check the tire date codes before you roll — if the DOT number is older than your dog, they are decorative.' },
    { who: 'Surfer loading a board', text: 'You will hit Camp Pendleton in twenty minutes and it is either empty or a parking lot, no in-between. If you see brake lights at Oceanside, take the coast road and get breakfast instead.' },
    { who: 'Woman walking two tiny dogs', text: 'Get gas before you leave San Diego County, hon. It only goes up from here until you cross into Oregon — and in Oregon somebody else pumps it for you like it is 1974.' },
  ],
  oceanside: [
    { who: 'Surfer waxing a board', text: 'Those two domes are San Onofre. Decommissioned, still humming, still the best-looking nuclear plant in America. The break below it is world class and I have never once gotten a wave without thinking about it.' },
    { who: 'Beach parking volunteer', text: 'June gloom sits on us till noon most summer days, so do not panic if your windshield is fogged in. It burns off by one o clock and then you will want the AC.' },
    { who: 'Dad with three boogie boards', text: 'If your dog likes the water, Trestles is right there. Just keep her off the trail — it is a state park, and the rangers have absolutely no sense of humor about paws on protected sand.' },
  ],
  los_angeles: [
    { who: 'Trucker eating a burrito on his tailgate', text: 'You got two ways north. The Five over the Grapevine is shorter, but that pass closes for snow two or three times a winter and the wind will push a box like yours around like a shopping cart. The One-oh-One is longer and prettier and the fuel is worse.' },
    { who: 'Woman in a rideshare waiting for a fare', text: 'Do not hit the Five between three and seven. Nobody is moving, and the guy next to you will be eating cereal out of the box. Leave at five in the morning and you will sail.' },
    { who: 'Guy selling fruit from a cart', text: 'If you take the coast, stop at San Luis Obispo for the gum alley and Buellton for the soup. If you take the Five, you will smell Harris Ranch before you see it, and you will never forget it.' },
    { who: 'Older man in a Camp Pendleton cap', text: 'Your rig is 12 feet tall, right? Then stay out of the far left lane on the interchanges. There are overpasses in this city that were designed by someone who had never met a motorhome.' },
  ],
  grapevine: [
    { who: 'CHP officer with a thermos', text: 'Six percent grade both directions, and we close it when the snow gets serious — sometimes for a day, sometimes for four. Check QuickMap before you commit, and if the sign is flashing, believe the sign.' },
    { who: 'Trucker chaining up', text: 'Keep it in the slow lane, flashers on, and let the semis pass. We are all going 35 up this thing, and the guy behind you can wait. Nobody has ever been late to Portland because they drove the Grapevine politely.' },
    { who: 'Woman refilling a thermos at the viewpoint', text: 'The wind here can gust to 65 and it comes at you sideways. If the wheel starts fighting back, slow down and do not correct hard. You are driving a billboard with a V10, not a sports car.' },
    { who: 'Roadside coffee vendor', text: 'Best view on the whole route and the coffee is terrible. Take the photo at the top, then get down into the valley before the afternoon wind comes over the ridge.' },
  ],
  kettleman: [
    { who: 'Barista at the mega travel center', text: 'Yes, the gas is absurd. Yes, the line at the burger place is out the door. Charge up, use the clean bathroom, and buy your snacks here because the next hundred miles is almonds and regret.' },
    { who: 'Guy with a Tesla and a dog', text: 'A hundred and some chargers in the middle of nowhere. It is the strangest sight on the Five. My dog and your dog should probably not meet, but I respect the setup.' },
    { who: 'Parked RV couple', text: 'Dump station in the back, free with a fill-up, and the water spigot actually works. Do it now — the next reliable one is a long way north and the sign will not tell you that.' },
    { who: 'Cashier with a very dry sense of humor', text: 'Kettleman City exists because it is exactly halfway between here and there. That is the whole business plan. It has worked for fifty years and it will outlive all of us.' },
  ],
  harris_ranch: [
    { who: 'Waitress in a steakhouse apron', text: 'You smell it before the sign, everybody does. Roll the windows up and put the AC on recirculate, and by the time you see the restaurant you will have adjusted. Sort of.' },
    { who: 'Feedlot worker on a lunch break', text: 'Thirty thousand head in those pens, give or take. People stop to take pictures of the cows like they are a monument. I guess they kind of are.' },
    { who: 'A very small kid at a picnic table', text: 'My dad says it is the smell of money. My mom says it is the smell of the cows. It is definitely the cows.' },
  ],
  santa_barbara: [
    { who: 'Jogger who has never had a bad day', text: 'Welcome to the One-oh-One! North of here it gets narrow and pretty and slow, and the wind comes off the point at Gaviota like it has a personal grudge against tall vehicles.' },
    { who: 'Retired teacher walking a golden retriever', text: 'If you are sleeping in the rig, El Capitan State Beach is right on the water — book ahead, it fills up months out. The train goes by at night and you will think it is an earthquake. It is not.' },
    { who: 'Fish taco stand cook', text: 'Get your groceries here or in San Luis. After that it is farm stands and gas station jerky until Gilroy, and gas station jerky is how you end up with a story you do not want.' },
  ],
  buellton: [
    { who: 'Split pea soup fan in a windmill hat', text: 'The windmill is the landmark, the soup is the religion. Get the bottomless bowl and the little crackers, and do not ask what is in the split pea — you know what is in the split pea.' },
    { who: 'Wine tasting room host', text: 'This valley is pinot country now, but it was pea soup and ostrich farms before that. If you see an ostrich, do not let the dog out. I am serious, and I am speaking from experience.' },
    { who: 'Guy loading a bicycle onto a roof rack', text: 'Fuel up in Buellton or Santa Maria before you head north. San Luis is cute and the gas there is priced like a souvenir.' },
  ],
  bubblegum_alley: [
    { who: 'College student with a camera', text: 'Seventy feet of wall, sixty years of gum. It started in the fifties and the city has tried to clean it twice. It always comes back. It is the most persistent artwork in California.' },
    { who: 'Shop owner down the block', text: 'Add a piece if you want, everybody does. Just do not touch anything with your bare hand and do not tell me about it afterward.' },
    { who: 'Cyclist in a very expensive helmet', text: 'San Luis is where the One-oh-One gets fun. Head north and you get rolling hills, vineyards, and then a whole lot of nothing until Gilroy. Fill the tank here.' },
  ],
  gilroy: [
    { who: 'Farm stand cashier', text: 'You are smelling the garlic capital of the world, hon. It gets into your clothes, your curtains, your dog. Three days from now you will still smell it and you will miss it.' },
    { who: 'Man eating garlic ice cream with a straight face', text: 'It tastes like vanilla for about a second. Then it tastes like garlic for the rest of your life. I have had one every summer for nineteen years.' },
    { who: 'Trucker with a coffee and a map', text: 'This is your last cheap fuel before the Bay. San Jose and Oakland will charge you city prices, and the Bay Bridge does not take cash, so make sure your toll tag is set up before you get in the wrong lane.' },
    { who: 'Teenager restocking a display', text: 'If you head up 101 to the bridge, avoid four to seven. And keep an eye on the fog — it comes in over the bridge so fast the towers disappear while you are looking at them.' },
  ],
  bay_bridge: [
    { who: 'Bridge worker in a hard hat', text: 'No cash, no change, no coin bucket. If you do not have a tag they will bill you by plate and it will be a surprise in the mail three weeks from now. Also, your rig is tall — stay out of the far left lane.' },
    { who: 'Tech worker on an electric unicycle', text: 'The fog does that thing where it pours over the hills like dry ice. It is beautiful. It also means you will drive into a wall of gray at 50 mph, so please slow down, motorhome person.' },
    { who: 'Woman on the ferry dock', text: 'You can take the bridge or you can take the long way around the bay. The bridge is faster, the long way is prettier, and neither of them is fun at five o clock.' },
  ],
  sacramento: [
    { who: 'Caltrans worker on a break', text: 'Tule fog is the real hazard up here from November to February. It comes down after the first big rain and sits. Visibility drops to a quarter mile, sometimes less, and people still drive 75.' },
    { who: 'Farmer selling corn out of a truck', text: 'This valley feeds a lot of the country and it is flat as a table, which is why the fog just stays. If it gets thick, get off the freeway and wait. It burns off by ten, usually.' },
    { who: 'RVer with a golden retriever and a solar panel', text: 'Stock up here. There is good shopping, cheap fuel, and a dump station at the fairgrounds. North of Redding the towns get small and the prices get optimistic.' },
    { who: 'Woman at the Tower Bridge railing', text: 'The bridge is gold, the river is green, the humidity is a war crime. Welcome to the capital. Head north on Five and you will climb out of this heat in about two hours.' },
  ],
  redding: [
    { who: 'Ranger at the Sundial Bridge', text: 'The glass deck is the point — you can see the river under your feet. Also, it is a working sundial, which is either engineering or witchcraft. Either way, do not wear socks, the glass gets hot.' },
    { who: 'Local in a shade hat', text: 'It hits 110 here in July and the asphalt gets soft enough to keep your tires. If your rig is running warm, do your climbing in the morning. The Shasta grade is not the place to find out your fan clutch is tired.' },
    { who: 'Man filling a cooler at the gas station', text: 'Last big stop before the mountains. Water, ice, groceries, and a real bathroom. After this it is Shasta Lake and then a whole lot of trees and expensive gas.' },
  ],
  lake_shasta: [
    { who: 'Houseboat captain with a cooler', text: 'The lake goes up and down forty feet depending on the year. Right now the red dirt shoreline is a couple hundred yards wide, which means you can walk out to where the water used to be.' },
    { who: 'Fisherman with eleven rods', text: 'Shasta Dam is 600 feet of concrete and it holds back the biggest reservoir in the state. You can drive across the top of it. Your rig will fit. Probably.' },
    { who: 'Campground host in a golf cart', text: 'Good dump station up the road at the RV park, and the water is cold and clean. Fill up. The next stretch is uphill and hot and there is nothing but trees and a very confident chipmunk.' },
  ],
  mt_shasta: [
    { who: 'Gift shop clerk in a "I ♥ Weed" shirt', text: 'Yes, we have the shirts. Yes, everyone takes the same photo. The town is named after a lumber man, not the other thing, and we have been explaining that since 1897.' },
    { who: 'Woman in a crystal shop doorway', text: 'Mount Shasta is one of the most sacred mountains in the world, and there are people here who will tell you about the Lemurians living inside it. I am not saying I believe it. I am saying the mountain does something to people.' },
    { who: 'Trucker filling up', text: 'This is your last cheap tank before the pass. Fill it and top off the water. Siskiyou is 4,300 feet and if the weather turns you will be glad you are not looking for a station in the snow.' },
    { who: 'Hiker adjusting a boot', text: 'There is a lenticular cloud on the summit most afternoons and it looks like a UFO every single time. If you see one, pull over. It is worth it and the photo will not do it justice.' },
  ],
  siskiyou: [
    { who: 'ODOT worker in an orange vest', text: 'Highest point on all of I-5, 4,310 feet. Winter rules, chains or traction tires, and we will turn you around if you are not carrying them. Check TripCheck before you start up — conditions here change faster than the forecast.' },
    { who: 'Trucker with chains over his shoulder', text: 'If they are chaining up in front of you, do what they do. Do not be the guy in the motorhome who says "I have all-wheel drive." You do not. You have a house.' },
    { who: 'Couple at the state line sign', text: 'Welcome to Oregon! Cheaper gas, no sales tax, and a nice young person who will pump it for you. You are about ten minutes from Ashland and about an hour from a decent cup of coffee.' },
    { who: 'Park host with a snow shovel', text: 'This pass closes for weather more than people expect. If the sign says chains, believe it, and if the road is closed, take the long way or wait. There is no prize for being first over the top.' },
  ],
  ashland: [
    { who: 'Barista at a drive-thru window', text: 'Welcome to Oregon. Yes, we pump your gas, and yes, you can pump your own now — but half the stations still do it for you and honestly, why would you get out in the rain?' },
    { who: 'Shakespeare festival volunteer', text: 'The festival runs from March to October and the actors are genuinely famous. In the summer the whole town smells like sunscreen and everyone walks around carrying a folding chair.' },
    { who: 'Retired couple at the RV park', text: 'Gas drops about a dollar when you cross the line, and there is no sales tax, so buy your supplies here. Also, do not speed through town — Ashland has one police officer and he is extremely dedicated.' },
    { who: 'Kid selling lemonade by the park', text: 'If you go up to the Vortex, tell them my cousin works there. The broom stands up by itself and my dad says it is magnets, but my dad also says the moon landing was filmed in a basement.' },
  ],
  oregon_vortex: [
    { who: 'Tour guide at the House of Mystery', text: 'Everything you see is real and everything you think is happening is an illusion. The balls roll uphill, two people swap heights, and the broom stands on its own. We do not explain it, we just let you feel weird.' },
    { who: 'Goth teen leaning on the fence', text: 'It is physics and it is also a scam and it is also genuinely fun. My friend works the gift shop and she says the same people come back every year to be confused again.' },
    { who: 'Local mechanic in coveralls', text: 'You are twenty minutes from Grants Pass and that is where the road splits. Five north through the mountains, or 199 west through the redwoods to the coast. Both are good. The coast is longer and the trees are bigger.' },
  ],
  grants_pass: [
    { who: 'Chamber of commerce volunteer', text: 'It is the climate! That is our actual slogan. The caveman is twenty-two feet tall and he has been waving at traffic since 1971. You are legally required to take a photo, I do not make the rules.' },
    { who: 'Trucker at the diesel island', text: 'This is your fork. I-5 up through Canyonville and Eugene, or 199 into the redwoods. If you take 199, fill up first — it is a hundred miles of trees and fog and a couple of gas stations that know they have you.' },
    { who: 'Woman with a rescue dog', text: 'The caveman is fiberglass over steel and he has survived four repaintings, three recessions, and one very determined pigeon situation. We love him. He does not do anything. That is his whole thing.' },
    { who: 'Barista at the drive-thru window', text: 'You want the coast route if you have got the time. Sea Lion Caves, the dinosaurs, the big trees. It adds a day, and it is the part of the trip everyone talks about afterward.' },
  ],
  wolf_creek: [
    { who: 'Innkeeper at the front desk', text: 'Oregon oldest continuously operating hotel, 1883. Jack London finished a novel in one of these rooms, Clark Gable slept upstairs, and room eight is our most active — doors, piano, voices. We do not guarantee anything.' },
    { who: 'Guest in a historical dress for a photo', text: 'The stagecoach stopped here for a hot meal and a bed. You can still get the meal, and you can still get the bed, and the ghost is included at no extra charge.' },
    { who: 'Local at the bar', text: 'It is twenty minutes to Canyonville from here and the road is dark and winding. Take it slow. The casino is the only thing for miles that is lit up like a birthday cake.' },
  ],
  canyonville: [
    { who: 'RV park host with a shuttle schedule', text: 'Seven Feathers is right off exit 99, the RV resort is a short walk to the casino, and there is a free shuttle if the walk is too much. Full hookups, big rig friendly, and a dump station that actually works.' },
    { who: 'Retired man with a players club card', text: 'We come down from Roseburg twice a month and we have never once come out ahead. The buffet is worth it, though. That is how they get you. The buffet is always how they get you.' },
    { who: 'Cashier at the gift shop', text: 'Do not put your whole wallet in the slot machine, hon. We see a lot of optimistic people in this parking lot. Also, the RV spots fill up on weekends, so call ahead if you are rolling in after six.' },
  ],
  eugene: [
    { who: 'Student in a bright yellow rain jacket', text: 'Sco Ducks. If you are here on a Saturday in the fall, the whole town is either at the game or hiding from it. Also, that green is not a suggestion — it is a lifestyle.' },
    { who: 'Farmers market vendor', text: 'If it is late summer, the blackberries along every fence line are free and ripe and better than anything you will buy. Bring a bucket and long sleeves. The brambles fight back.' },
    { who: 'Retired teacher on a bike', text: 'The Willamette is right there and there is a path along it. Take the dog. And check the construction on I-5 north — they have been moving that same lane closure for two years and it is still winning.' },
    { who: 'Man in a very tie-dyed shirt', text: 'Track Town, USA. Prefontaine ran here, the Olympic trials come here, and every third person you meet has a personal best. The coffee is good and there are ducks on all the flags. You will see.' },
  ],
  redwoods: [
    { who: 'Ranger at a trailhead kiosk', text: 'These trees are up to 350 feet tall and 2,000 years old, and the roots are shockingly shallow. Stay on the trail — the soil under your feet is holding up a cathedral.' },
    { who: 'Gift shop worker by the giant Paul Bunyan', text: 'He is 49 feet and 2 inches, his ox Babe is 35 feet, and he has been waving at Highway 101 since the forties. If you have a rig, ask about the drive-through tree before you commit. Clearance is not a suggestion.' },
    { who: 'Trucker pulled over for a nap', text: 'US-199 is a beautiful road and it will fog in on you like a wall. Slow down, use the low beams, and watch for elk. Elk do not look both ways and they are the size of a small car.' },
    { who: 'Couple with two cameras', text: 'Everyone stops at the same four trees and misses the good stuff. Walk a half mile in any direction and you will be alone with something that was alive before Rome.' },
  ],
  prehistoric_gardens: [
    { who: 'Groundskeeper with a rake', text: 'Ernie Nelson built these dinosaurs by hand starting in 1952, opened in 1955, and they are concrete over steel, so they are not going anywhere. The T. rex has been mid-roar for seventy years.' },
    { who: 'Kid on a field trip', text: 'The big one is a T. rex and the long-necked one is the one that would eat the trees. My teacher says they are not accurate but I think they are extremely accurate.' },
    { who: 'Woman in rain gear', text: 'This is the Oregon coast, so plan on fog and rain and then be delighted when it is sunny. The road south of here is curves the whole way, so if anyone in the rig gets carsick, sit them up front.' },
    { who: 'Cyclist drying off in the gift shop', text: 'Highway 101 down here is one blind curve after another, and the fog does not help. Turn your headlights on. Half the people coming the other way will not have theirs on, and you want to be the visible one.' },
  ],
  sea_lion_caves: [
    { who: 'Ticket clerk at the cave entrance', text: 'The elevator drops about 200 feet into the cave and the sea lions are not employees, so they come and go. If it is quiet down there, it means they are out on the rocks. Come back at low tide and it is a completely different place.' },
    { who: 'Ranger at the overlook', text: 'Steller sea lions weigh about a ton and sound like a diesel engine having a feeling. You will hear them before you see them. And keep an eye offshore — this is whale season from December into spring.' },
    { who: 'Couple in matching rain jackets', text: 'Cape Perpetua is just north and the wind there will take the door off your car if you are not holding it. Worth it. The spouting horn is spectacular when the surf is up.' },
  ],
  albany: [
    { who: 'Park volunteer by the lake', text: 'The giant duck on Waverly Lake is not official and nobody will admit to putting it there. It has been floating for years. We have stopped asking questions and started bringing bread.' },
    { who: 'Farmer selling berries at a stand', text: 'Late summer, the blackberries are thick as a hedge along every ditch in this county. Free for the picking, and the best pie filling in Oregon. Wear gloves and do not wear anything you like.' },
    { who: 'Older man with a walking stick', text: 'If you are heading to the ferry, get there before dark. It runs from early morning to about a quarter to ten at night, and it stops entirely when the river gets high. Cash only, and it is only a few dollars.' },
  ],
  wheatland_ferry: [
    { who: 'Ferry operator in a ball cap', text: 'She has been crossing here since the 1840s and the current boat holds nine cars. It is three dollars for a car, more if you are long, and no credit cards. Drive on slow, do exactly what I signal, and do not stop halfway.' },
    { who: 'Commuter waiting in a pickup', text: 'It is the oldest continuously running ferry west of the Mississippi, and it is faster than driving to Salem. If the river is up past fifteen feet they shut it down, so check before you commit.' },
    { who: 'Woman with a basket of blackberries', text: 'I pick these on the far bank while I wait. You want to know the secret? The best bushes are always on the side you cannot reach from the road. That is the whole secret.' },
  ],
  oregon_city: [
    { who: 'Elevator operator, third decade on the job', text: 'It is 130 feet, it is free, and it is the only vertical street in North America. It goes from downtown up to the bluff, and it has been doing it since 1955. You are welcome to ride it as many times as you like.' },
    { who: 'Local with a camera pointed at the falls', text: 'Willamette Falls is the biggest waterfall in the Northwest by volume, and most people drive right past it. There is a viewpoint at the top of the elevator. Go up, walk left, and prepare to be annoyed that nobody told you.' },
    { who: 'Retired mill worker', text: 'This town was the end of the Oregon Trail, and it was the biggest city west of the Mississippi before Portland stole it. Now we have the elevator and the falls and a very good bakery. It is enough.' },
    { who: 'Goth teen eating a doughnut', text: 'Portland is fifteen minutes that way if there is no traffic, and there is always traffic. Do not try to park the rig downtown. Park at a MAX station and take the train in. Trust me.' },
  ],
  portland: [
    { who: 'Barista with a very impressive mustache', text: 'Welcome to Portland. It is going to rain, and then it is going to rain, and then there will be one perfect afternoon and you will understand why everyone lives here.' },
    { who: 'Food cart owner', text: 'No sales tax, so everything costs what it says, which is a beautiful thing after eleven hundred miles of California math. Get the cart pod on Hawthorne, get something with too much garlic, and sit outside even if it is drizzling.' },
    { who: 'Woman leaving a doughnut shop with a pink box', text: 'The line is long, the doughnuts are good, the box is the real souvenir. If you have a dog with you, there is a shop down the street that will give her a free treat and tell her she is beautiful.' },
    { who: 'Cyclist in the rain, unbothered', text: 'You made it. Mount Hood is out there behind the clouds, the bridges are all lit up blue, and it is going to rain for a week. Nobody here minds. Welcome home.' },
  ],
};

export const REVIEWS = {
  san_diego: [
    '★★★★☆ "Perfect weather, perfect tacos, and the RV storage lot let us live there for two years without comment." — Marcy T.',
    '★★☆☆☆ "Too many people having a nice time. Suspicious. The fish tacos were, admittedly, transcendent." — Grumpy Inland Empire',
  ],
  oceanside: [
    '★★★★☆ "Surfed beneath two enormous concrete domes. Did not grow a third arm. Would recommend." — Saltwater Dan',
    '★★★☆☆ "Beautiful beach, but the ranger made me put a leash on my emotional support seagull." — Todd from Temecula',
  ],
  los_angeles: [
    '★★☆☆☆ "Drove nine miles in three hours and saw a man eat cereal with a spoon in the fast lane. Five stars for the cereal." — Commuter #4,000,001',
    '★★★★☆ "The mattress in the carpool lane was nicely upholstered and I appreciated the ladder selection." — Very Confused Visitor',
  ],
  grapevine: [
    '★★★★☆ "Six percent grade, sixty mph gusts, and a view that made me forget I was terrified. Ten out of ten would grip the wheel again." — Full-Timer Frank',
    '★★☆☆☆ "Closed for snow. Sat in a parking lot for two days eating crackers. The crackers were fine." — Stuck Since Tuesday',
  ],
  kettleman: [
    '★★☆☆☆ "Paid eleven dollars for a coffee and six dollars for a banana. The bathroom was, however, immaculate." — Budget Traveler',
    '★★★★★ "One hundred and some chargers in the absolute middle of nowhere. My dog met eleven other dogs. Life-changing." — EV Gary',
  ],
  harris_ranch: [
    '★★★★☆ "The steak was incredible. The smell was also incredible, in the other direction." — Ranch Enjoyer',
    '★★☆☆☆ "Rolled up the windows, turned on recirculate, and still smelled it in my dreams. The cows seemed happy, though." — Sensitive Nose',
  ],
  santa_barbara: [
    '★★★★★ "Red tile roofs and everyone jogging like they have never known sorrow. I jogged too. It was awful. Five stars." — Weekend Runner',
    '★★★☆☆ "Gorgeous. Parking for a 33-foot motorhome is theoretical." — Big Rig Brenda',
  ],
  buellton: [
    '★★★★☆ "Bottomless split pea soup and a windmill. I ate four bowls and forgot my own name." — Soup Devotee',
    '★★★☆☆ "The ostrich looked at me with genuine contempt. Soup was great. Windmill was great." — Bird Skeptic',
  ],
  bubblegum_alley: [
    '★★☆☆☆ "Seventy feet of other people\'s chewed gum. Disgusting. I added mine. It felt important." — Art Critic Kyle',
    '★★★★☆ "Truly the most honest artwork in California. Bring hand sanitizer and a sense of proportion." — Local Mom',
  ],
  gilroy: [
    '★★★★★ "The air is a seasoning. I have not needed garlic at home in three weeks." — Chef Ron',
    '★★★☆☆ "Garlic ice cream tastes like vanilla for one second and then like regret for the rest of the evening." — Sweet Tooth Sam',
  ],
  bay_bridge: [
    '★★★★☆ "The fog poured over the hills like dry ice and I nearly drove into a tower admiring it." — Bridge Fan',
    '★★☆☆☆ "No cash, no coin bucket, no mercy. Got a bill in the mail three weeks later for a bridge I barely remember." — Out-of-State Dave',
  ],
  sacramento: [
    '★★★★☆ "Gold bridge, green river, and humidity that could be bottled and sold as a punishment. Great farmers market." — Valley Visitor',
    '★★☆☆☆ "Tule fog so thick I drove past my own exit twice. The fog is not the city\'s fault but I am blaming the city." — Morning Commuter',
  ],
  redding: [
    '★★★★★ "Walked on a glass bridge over a green river and used a giant sundial to tell the time. Weird town, big heart." — Sundial Stan',
    '★★☆☆☆ "It was 110 degrees and my tires melted into the asphalt. The bridge was nice." — Overheated',
  ],
  lake_shasta: [
    '★★★★☆ "Red dirt shoreline, cold water, and a dam the size of a building. The houseboats look like small cities." — Lake Person',
    '★★★☆☆ "The lake was forty feet lower than the photos. The chipmunk who stole my trail mix was at exactly the level of the water line." — Snack Victim',
  ],
  mt_shasta: [
    '★★★★★ "Bought a T-shirt, saw a sacred mountain, and heard a very convincing lecture about Lemurians at a crystal shop." — Believer Barb',
    '★★★☆☆ "The mountain is genuinely unbelievable. The gift shop has exactly the shirts you think it has." — Road Trip Ryan',
  ],
  siskiyou: [
    '★★★☆☆ "Highest point on I-5, and the state line sign is the most photographed object in Oregon. Chained up, made it over, felt like a hero." — Winter Warrior',
    '★★☆☆☆ "The wind tried to remove my side mirror as a souvenir. The pass won. The coffee at the bottom did not." — White Knuckle Wendy',
  ],
  ashland: [
    '★★★★★ "Shakespeare, cheap gas, and someone else pumping it. Oregon is doing something right." — Festival Fan',
    '★★★☆☆ "Beautiful town, great coffee, and one extremely dedicated police officer who found me in under four minutes." — Speedy From Sacramento',
  ],
  oregon_vortex: [
    '★★★★☆ "A broom stood up by itself, my wife got taller than me, and I left questioning gravity and also my marriage." — Mystery Enjoyer',
    '★★☆☆☆ "It is definitely an optical illusion and I am definitely still thinking about it four years later. Annoying. Fun. Both." — Rational Rick',
  ],
  grants_pass: [
    '★★★★★ "It is the climate! Also a twenty-two-foot fiberglass caveman, which is more than most towns can offer." — Caveman Fan Club',
    '★★★★☆ "The fork in the road here is the best decision on the trip. We took the coast and still talk about the trees." — Coast Route Convert',
  ],
  wolf_creek: [
    '★★★★☆ "Slept in a haunted inn and heard the piano at 2 AM. Did not sleep. Would do it again. Room eight is no joke." — Ghost Hunter Gail',
    '★★★☆☆ "The ghost did not show up but the breakfast did, and the breakfast was better." — Pragmatic Pete',
  ],
  canyonville: [
    '★★★★☆ "An RV resort and a casino in the middle of a forest. The buffet broke even for the whole trip." — Slot Machine Steve',
    '★★☆☆☆ "Put twenty dollars in a machine and it ate it without so much as a wink. RV park was genuinely excellent, though." — Cautious Carl',
  ],
  eugene: [
    '★★★★★ "Everything is green and yellow, there are ducks on every flag, and a stranger told me his personal best mile time. Perfect." — Track Town Tourist',
    '★★★★☆ "Free blackberries on every fence line and nobody told me to bring long sleeves. Worth the scratches." — Berry Person',
  ],
  redwoods: [
    '★★★★★ "Stood next to a tree that was alive before Rome and forgot what year it was. The giant lumberjack waved at me." — Awed Amanda',
    '★★★☆☆ "The drive-through tree cost fifteen dollars and took six inches off my roof rack. I would do it again immediately." — Roof Rack Randy',
  ],
  prehistoric_gardens: [
    '★★★★★ "Concrete dinosaurs built by one guy in the fifties, in a rainforest, in the fog. This is the best country on earth." — Dino Dad',
    '★★★★☆ "The T. rex has been mid-roar since 1955 and honestly, same. My kid thinks they are real." — Roadside Romantic',
  ],
  sea_lion_caves: [
    '★★★★☆ "Took an elevator 200 feet into a sea cave and heard a sound like a diesel engine having feelings. Ten out of ten." — Cave Curious',
    '★★★☆☆ "The sea lions were out on the rocks, so the cave was quiet. The elevator operator was funnier than the sea lions anyway." — Timing Is Everything',
  ],
  albany: [
    '★★★☆☆ "There is a giant duck on the lake and nobody will explain it. I have questions and I have made peace." — Duck Investigator',
    '★★★★☆ "Blackberries on every ditch, a floating duck, and a ferry down the road. This is what Oregon does best." — Valley Visitor',
  ],
  wheatland_ferry: [
    '★★★★★ "A cable ferry from the 1840s that holds nine cars and costs three dollars. Best forty minutes of the trip, and we only crossed once." — Ferry Fanatic',
    '★★★☆☆ "We were too long and too wide and the operator was very kind about it. Sat and watched the water instead. No regrets." — Big Rig Bob',
  ],
  oregon_city: [
    '★★★★★ "Rode a free elevator up a basalt cliff, walked left, and saw the biggest waterfall in the Northwest. Nobody mentions this and I am furious." — Elevator Enthusiast',
    '★★★★☆ "The only vertical street in North America and it goes nowhere but up. The bakery at the bottom is the real attraction." — Pastry Pilgrim',
  ],
  portland: [
    '★★★★★ "It rained for six days, the doughnuts came in a pink box, and a barista complimented my dog. Moving here." — Converted Californian',
    '★★★★☆ "No sales tax, food carts on every corner, and Mount Hood behind the clouds. The parking for a 33-foot motorhome is a myth." — Big Rig Brenda',
  ],
};
