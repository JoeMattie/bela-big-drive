# BELA'S BIG DRIVE — Art Spec

An original, retro pixel-art road-trip survival game (late-80s/early-90s DOS / VGA
adventure-game feel, but its OWN look — do NOT imitate any existing game's art).
A family drives a **1999 Forest River Georgetown Class A motorhome** from
**San Diego to Portland, Oregon**, in the present day.

The game canvas is **480 × 300 logical pixels**, scaled up with nearest-neighbor.
Every asset must be **true pixel art at its final native size** (not a big blurry
image). Crisp edges, limited palette, no anti-aliased soft edges, no JPEG noise.

## The family (reference photos are in `family/` — never commit them, never copy them into `assets/`)

| id        | who | look |
|-----------|-----|------|
| `joe`     | dad / human | white man, ~40, rectangular thin metal-frame glasses, short messy brown hair, light stubble, usually a chunky shawl-collar cardigan (dark grey w/ cream pattern) over a band tee, or a loud green cartoon-print button shirt. |
| `caity`   | mom / human | white woman, ~38, undercut: sides shaved, dark brown hair on top swept back (sometimes dyed bright green), septum ring, large wooden plug earrings, big black spider/tarantula tattoo on her chest, sleeve tattoos on both arms, black tank top, rust/maroon cargo pants, sandals. Big expressive blue-grey eyes. |
| `bela`    | dog (female) | white **bull terrier** — egg-shaped head, Roman nose, small triangular eyes, pink-spotted muzzle & ears, one ear tipped black, a few faint pale spots on body. Red collar, sometimes an orange/teal paisley bandana. Goofy, sweet. |
| `muskrat` | cat (female) | brown **mackerel tabby**, striped, pale green eyes, pink nose, warm tan belly, tail with dark rings and black tip. Slim, playful. |
| `pookah`  | cat (female) | **black & white longhair tuxedo** — black fluffy body, white chest bib, white paws, white whisker patch under nose, huge white whiskers, yellow-green eyes, enormous floof tail. |

Characters should be clearly recognizable as these individuals (hair, glasses,
tattoos, markings matter!). Cute and flattering, slightly cartoony.

## Technical rules (ALL assets)

* PNG, RGBA. Sprites/portraits/icons: **transparent background** (no halos — alpha must be 0 or 255).
* Scenes/backgrounds: fully opaque.
* Limit palette per image (≤ 48 colors for scenes, ≤ 24 for sprites). No dithering noise; deliberate dithering patterns are fine.
* Recommended pipeline: generate with the image generator (ask for "pixel art", flat colors,
  for sprites ask for a solid #FF00FF magenta background), then post-process with Python/PIL:
  crop → downscale to EXACT target size with `Image.NEAREST` (or BOX then re-quantize) →
  `quantize(colors=N, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)` →
  chroma-key magenta to alpha 0 → save. Then **look at the result** and fix/regenerate anything mushy.
  Hand-pixel touch-ups via code (drawing exact pixels) are welcome where generation fails.
* Keep a tiny helper script under `tools/` (e.g. `tools/pixelize.py`) — that's fine to commit.
* Put scratch / raw generations in `.art-work/` (gitignored). Only final PNGs go in `assets/`.
* Exact filenames & sizes below are a CONTRACT — the code loads these paths. Missing files fall back
  to placeholders, so partial delivery still works, but please deliver all.

---

## A. Characters & vehicles (worker: "art-characters")

### A1. Portraits — `assets/portraits/<id>_<mood>.png`, **64×64**, transparent
Head-and-shoulders, facing 3/4 toward viewer, consistent style across all five.
moods: `neutral`, `happy`, `sick` (green-ish, tired, sweaty / for pets: droopy ears, sad eyes).
→ 15 files: `joe_neutral.png`, `joe_happy.png`, `joe_sick.png`, `caity_…`, `bela_…`, `muskrat_…`, `pookah_…`

### A2. RV side view — `assets/sprites/rv_side.png`, **128×64**, transparent
1999 Class A motorhome, **facing RIGHT** (front/cab on the right). Boxy fiberglass body,
cream/white with classic late-90s swoopy stripe graphics (teal + burgundy + gold swooshes),
big flat windshield, side windows with blinds, roof AC unit & ladder, "GEORGETOWN" lettering is
optional (tiny). Wheels at bottom; wheels' centers at y≈56. Leave wheels drawn normally.
Also: `assets/sprites/rv_side_broken.png` same size — hood/engine smoke, a flat tire, hazard lights.
Also: `assets/sprites/rv_wheel.png` **16×16** a single wheel (tire + hubcap) the code can rotate/overlay.

### A3. RV top-down — `assets/sprites/rv_top.png`, **32×80**, transparent, facing UP (front at top).

### A4. Top-down walking sheets (for minigames) — transparent
`assets/sprites/joe_walk.png`, `assets/sprites/caity_walk.png`: frame **24×32**, sheet **72×128**
(3 columns = walk frames [step-left, stand, step-right], 4 rows = facing [down, left, right, up]).
3/4 top-down RPG perspective (like a classic SNES RPG overworld character).
`assets/sprites/bela_walk.png`: frame **32×32**, sheet **96×128**, same layout.
`assets/sprites/muskrat_walk.png`, `assets/sprites/pookah_walk.png`: frame **24×24**, sheet **72×96**, same layout.

### A5. Side-view "trotting along" sprites for title/ending flourish — transparent
`assets/sprites/bela_run_side.png`: 4 frames of **32×24** horizontally (sheet 128×24), facing right, running.

---

## B. Landmark scenes (worker: "art-scenes")

Each landmark scene is **480×200**, opaque, a beautiful detailed pixel-art vista (think late-VGA
adventure game backdrop). Include the RV parked/visible somewhere small if natural (optional).
Present-day details. Filename `assets/scenes/<id>.png`:

| id | description |
|----|-------------|
| `san_diego` | Mission Bay / San Diego skyline at golden hour, palm trees, an RV-supply store parking lot in foreground |
| `oceanside` | I-5 along the coast near San Onofre: the two big white domed nuclear containment buildings by the beach, surfers, Camp Pendleton hills |
| `los_angeles` | LA freeway interchange gridlock, 10 lanes of brake lights, smog sunset, palm trees, downtown towers, Hollywood-ish hills |
| `grapevine` | Tejon Pass / "The Grapevine": steep I-5 grade through golden chaparral mountains, trucks crawling uphill, snow dusting the peaks |
| `kettleman` | Kettleman City: a giant modern EV supercharger lot next to a red & yellow burger drive-thru with a long line, flat dry valley, heat shimmer |
| `harris_ranch` | Central Valley cattle feedlot stretching to horizon beside I-5, brown dust haze, a ranch steakhouse sign, (implied smell lines!) |
| `santa_barbara` | Santa Barbara: white Spanish-mission buildings, red tile roofs, palm-lined beach, Stearns Wharf pier |
| `buellton` | a roadside Danish/split-pea-soup restaurant with a windmill & giant soup-bowl sign, rolling oak hills |
| `bubblegum_alley` | San Luis Obispo's narrow alley whose walls are completely covered in colorful chewed gum |
| `gilroy` | Gilroy garlic fields & braids of garlic at a roadside market, mountains behind |
| `bay_bridge` | San Francisco Bay Bridge in fog, city skyline, container ships |
| `sacramento` | Sacramento: the golden Tower Bridge over the river and the State Capitol dome |
| `redding` | Redding's Sundial Bridge: a white glass-decked pedestrian bridge with a single tall angled pylon over the Sacramento River |
| `lake_shasta` | Shasta Lake: red-dirt shoreline, houseboats, the long highway bridge over the lake, Shasta Dam |
| `mt_shasta` | snow-capped Mount Shasta towering over pine forest and the small town of Weed, CA, a big town welcome arch |
| `siskiyou` | Siskiyou Summit (elev 4,310', highest point on I-5): winding pass, snow, chain-up area, conifers, trucks |
| `ashland` | Ashland, OR: charming downtown, Elizabethan theater, Oregon welcome sign, a gas station with an attendant pumping gas |
| `oregon_vortex` | a crooked, tilting old wooden shack in the woods ("House of Mystery"), people appearing different heights on a level platform |
| `grants_pass` | Grants Pass: a big statue of a friendly caveman, "IT'S THE CLIMATE" sign arch over the main street, Rogue River |
| `wolf_creek` | a historic 1880s white two-story stagecoach inn with a long porch, oak hills |
| `canyonville` | a big glitzy casino resort with neon lights in forested hills off the freeway |
| `eugene` | Eugene, OR: college town, green & yellow everywhere, a giant duck mascot banner, bike riders, rain, tie-dye shop |
| `redwoods` | towering coast redwood trees on US-199, tiny RV for scale, misty light beams, a giant lumberjack statue & blue ox |
| `prehistoric_gardens` | an old roadside attraction: life-size, slightly-wonky painted concrete dinosaurs in a rainforest of ferns |
| `sea_lion_caves` | Oregon coast cliffs, a sea cave full of sea lions, a lighthouse on a headland, crashing waves |
| `albany` | a calm small lake with a giant inflatable yellow duck floating on it, Willamette Valley farmland |
| `wheatland_ferry` | a small cable ferry carrying 6 cars across the wide green Willamette River, cottonwoods |
| `oregon_city` | Oregon City: a big art-deco municipal elevator tower on a basalt bluff over Willamette Falls |
| `portland` | Portland: the white stag neon sign, bridges over the Willamette, Mt Hood in the distance, food carts, rain, a pink doughnut shop, a huge bookstore |

Plus these full screens:
* `assets/scenes/title.png` **480×300** — epic title illustration: the RV on a winding coastal highway at
  sunset, Pacific ocean, the family peeking out windows (bull terrier head out the passenger window,
  tongue flapping!). Leave the top ~90px fairly calm (sky) because the logo text is drawn over it.
* `assets/scenes/ending.png` **480×200** — the family + pets celebrating in front of a new Portland house
  with a porch, rain-wet street, green trees, fireworks or sunbeams.
* `assets/scenes/gameover.png` **480×200** — the RV broken down on the shoulder of a lonely highway at dusk,
  hazard lights, steam from the hood, tow truck approaching in distance.
* `assets/scenes/campsite_night.png` **480×200** — the RV parked at night at a campground, campfire, stars,
  string lights (used for the "rest / overnight" screen).
* `assets/scenes/walmart_night.png` **480×200** — the RV parked overnight in a huge big-box store parking lot,
  sodium lights, other RVs.
* `assets/scenes/breakdown.png` **480×200** — close-up: open RV engine hood with steam, tools on ground, Joe
  scratching his head.

---

## C. Travel backgrounds, minigame assets & icons (worker: "art-world")

### C1. Biome parallax layers — `assets/biomes/<biome>_far.png` and `<biome>_near.png`
Each layer is **480 wide** and must **tile seamlessly horizontally** (left edge continues the right edge
— verify by placing two copies side by side). Transparent above the silhouette.
* `_far`: **480×110** — distant scenery (mountains, skyline, ocean horizon…), muted/atmospheric colors.
* `_near`: **480×70** — near roadside scenery (bushes, fences, signs, trees, buildings) whose bottom edge
  sits right on the road shoulder. Saturated.
The sky (gradient, sun, clouds) and the road itself are drawn by code — leave them out.

biomes: `coast` (SoCal ocean, cliffs, palms), `city` (LA sprawl, overpasses, billboards), `pass` (golden
chaparral mountains, oaks), `valley` (Central Valley orchards, almond trees, farm fields, water towers),
`forest` (NorCal pines, Mt Shasta-like volcano in far layer), `oregon` (lush green Willamette valley, firs,
barns, rain-soaked), `oregon_coast` (rocky sea stacks, Sitka spruce), `portland` (bridges, city, Mt Hood far).

### C2. Minigame: "Blackberry Bramble" (foraging) — top-down, 3/4 RPG view
* `assets/minigame/forage_bg.png` **480×300** opaque — a top-down meadow/rest-area field edge in Oregon:
  grass, dirt path, picnic table, edges of a forest. (Bushes are separate sprites.)
* `assets/minigame/bramble.png` **48×40** — a Himalayan blackberry bush (thorny, dark green), transparent.
* `assets/minigame/bramble_ripe.png` **48×40** — same bush loaded with ripe black/purple berries.
* `assets/minigame/berry.png` **8×8**, `assets/minigame/wasp.png` **32×16** (2 frames 16×16, wings flapping),
  `assets/minigame/poison_oak.png` **24×24** (shiny red-green 3-leaf plant), `assets/minigame/basket.png` **16×16**.

### C3. Minigame: "Freeway Frenzy" (top-down highway dodge)
* `assets/minigame/road_tile.png` **160×64** opaque — top-down 4-lane highway strip, tiles vertically
  (top edge continues bottom edge). Dashed lane lines, shoulders.
* `assets/minigame/cars.png` — sheet of 6 top-down cars, each **24×44**, horizontally (144×44), facing UP,
  varied colors (one Prius, one pickup, one sports car, one minivan, one hatchback, one CHP police cruiser).
* `assets/minigame/semi.png` **32×112** top-down big rig facing up.
* `assets/minigame/hazards.png` — sheet of 6 items, each **24×24** horizontal (144×24): pothole, traffic cone,
  a mattress, a tumbleweed, a lost ladder, a shredded truck tire.
* `assets/minigame/gas_can.png` **16×16** pickup.

### C4. Minigame: "Cat Wrangle" (catch the escaped cat at a rest stop) — top-down
* `assets/minigame/reststop_bg.png` **480×300** opaque — top-down rest area: parking lot with the RV
  parked, lawn, picnic tables, trash cans, restroom building, a "PET AREA" sign, trees, dog walkers path.

### C5. Item icons — `assets/icons/<id>.png`, **16×16** transparent
`gas` (red gas can), `food` (grocery bag), `kibble` (dog food bag w/ bone), `catfood` (cat food tin w/ fish),
`litter` (litter box / scoop), `tire` (spare tire), `parts` (wrench+belt/hose), `chains` (tire chains),
`propane` (small propane tank), `ducttape`, `money` (dollar bill), `water` (blue water jug),
`coffee` (to-go coffee cup), `treats` (dog biscuit), `toiletpaper`, `firstaid` (first-aid kit).

### C6. UI — `assets/ui/frame.png` **24×24** 9-slice ornamental border (8px corners) in warm wood/brass tones,
transparent center. `assets/ui/cursor.png` **12×12** pointer hand.
