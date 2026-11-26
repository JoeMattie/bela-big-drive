#!/usr/bin/env python3
"""Hand-crafted native-resolution pixel art generator for Bela's Big Drive (Section C):
- C2 small sprites: berry (8x8), wasp (32x16), poison_oak (24x24), basket (16x16)
- C3 Freeway Frenzy: road_tile (160x64), cars (144x44), semi (32x112), hazards (144x24), gas_can (16x16)
- C5 Item icons: 16 icons (16x16)
- C6 UI: frame (24x24 9-slice), cursor (12x12)
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS = REPO_ROOT / "assets"
WORK = REPO_ROOT / ".art-work" / "art-world"


def render_grid(rows: list[str], palette: dict[str, tuple[int, int, int, int]]) -> Image.Image:
    """Render an ASCII pixel-art grid into an exact-size RGBA Image."""
    h = len(rows)
    w = len(rows[0])
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    for y, row in enumerate(rows):
        if len(row) != w:
            raise ValueError(f"Row {y} width {len(row)} != {w}: {row!r}")
        for x, ch in enumerate(row):
            if ch in (".", " "):
                continue
            if ch not in palette:
                raise KeyError(f"Unknown palette char {ch!r} at ({x},{y})")
            arr[y, x] = palette[ch]
    return Image.fromarray(arr, "RGBA")


def save_png(im: Image.Image, rel_path: str) -> None:
    p = ASSETS / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGBA").save(p)


# =============================================================================
# C2. BLACKBERRY BRAMBLE SMALL SPRITES
# =============================================================================

def make_c2_small():
    # 1. berry.png (8x8) — plump glossy blackberry with tiny green calyx
    berry_pal = {
        "o": (22, 12, 34, 255),    # deep purple-black outline
        "d": (44, 22, 66, 255),    # dark berry shade
        "m": (76, 36, 110, 255),   # mid berry purple
        "l": (126, 74, 168, 255),  # drupelet highlight
        "w": (225, 205, 245, 255), # glossy specular glint
        "g": (52, 122, 46, 255),   # green calyx leaf
        "G": (96, 172, 68, 255),   # bright calyx tip
    }
    berry = render_grid([
        "..gGg...",
        ".oodGoo.",
        "odwmdmdo",
        "odlmldmo",
        "odmdwlmo",
        "odlmlddo",
        ".ooddoo.",
        "...oo...",
    ], berry_pal)
    save_png(berry, "minigame/berry.png")

    # 2. wasp.png (32x16) — 2 frames of 16x16 yellowjacket wasp, wings up / wings down
    wasp_pal = {
        "k": (24, 18, 22, 255),     # dark outline / black stripe
        "y": (246, 204, 32, 255),   # bright yellowjacket yellow
        "Y": (255, 242, 128, 255),  # bright yellow highlight
        "o": (196, 134, 18, 255),   # warm amber shadow
        "w": (220, 244, 255, 255),  # wing bright
        "c": (152, 198, 226, 255),  # wing translucent-style tint
        "b": (94, 138, 174, 255),   # wing outline
        "r": (200, 52, 40, 255),    # eye glint
    }
    # Frame 0: wings swept UP/out (facing right-ish / 3/4 top-down)
    f0 = render_grid([
        "....bbb.........",
        "...bwwwb...bb...",
        "...bwcwwb.bwwb..",
        "....bwccwbwcwb..",
        ".....bbccbccb...",
        "..k...kYyk......",
        "...k.kkyykk..k..",
        "..kkkykYykYkk...",
        ".kkykkykyokyk...",
        "..kk.kkoykk.....",
        ".....k.kk.k.....",
        "....k......k....",
        "................",
        "................",
        "................",
        "................",
    ], wasp_pal)
    # Frame 1: wings swept DOWN/back
    f1 = render_grid([
        "................",
        "................",
        "................",
        "................",
        "..k...kYyk......",
        "...k.kkyykk..k..",
        "..kkkykYykYkk...",
        ".kkykkykyokyk...",
        "..kk.kkoykk.....",
        ".....bbccbccb...",
        "....bwccwbwcwb..",
        "...bwcwwb.bwwb..",
        "...bwwwb...bb...",
        "....bbb.........",
        "................",
        "................",
    ], wasp_pal)
    wasp = Image.new("RGBA", (32, 16), (0, 0, 0, 0))
    wasp.paste(f0, (0, 0))
    wasp.paste(f1, (16, 0))
    save_png(wasp, "minigame/wasp.png")

    # 3. poison_oak.png (24x24) — glossy red-orange-green 3-leaf ("leaves of three") cluster
    po_pal = {
        "k": (34, 18, 16, 255),     # dark umber outline
        "s": (102, 54, 34, 255),    # reddish woody stem
        "r": (184, 44, 32, 255),    # deep crimson leaf tint
        "R": (228, 86, 44, 255),    # bright vermilion/red-orange lobe
        "o": (236, 144, 52, 255),   # glossy orange-amber edge
        "g": (52, 126, 42, 255),    # deep glossy green
        "G": (96, 174, 58, 255),    # mid vibrant green
        "l": (158, 214, 96, 255),   # bright sunlit green
        "w": (248, 236, 198, 255),  # oily sheen highlight!
        "d": (24, 56, 22, 255),     # dark leaf shadow / ground shadow
    }
    po = render_grid([
        "..........kk............",
        ".........kRRk...........",
        "........kRwoRk..........",
        ".......kRRGGRRk.........",
        ".......kRGlGGRk.........",
        "........kGggGk..........",
        "....kk...kggk....kk.....",
        "...kRRk..kssk...kRRk....",
        "..kRwoRk..ks...kRwoRk...",
        ".kRRGGRRk.ks..kRRGGRRk..",
        ".kRGlGGRk.ks..kRGlGGRk..",
        "..kGggGRkks...kRGggGk...",
        "...kggGkksksk..kGggk....",
        "....kkk.ksssk...kkk.....",
        ".......kkssskk..........",
        "..kkk.kRGgskGRk.kkk.....",
        ".kRwoRkGglsgGGRkRoRk....",
        ".kRGGRkGggsggGkRGGGRk...",
        "..kGggkddssdddkGggGk....",
        "...kkk..ksssk..kkkk.....",
        ".......kdddddk..........",
        "......kdddddk...........",
        ".......kkkkk............",
        "........................",
    ], po_pal)
    save_png(po, "minigame/poison_oak.png")

    # 4. basket.png (16x16) — warm woven wicker foraging basket with handle & a few berries peeking!
    bsk_pal = {
        "k": (44, 26, 16, 255),     # dark wood outline
        "d": (118, 72, 34, 255),    # dark wicker weave
        "m": (166, 110, 52, 255),   # mid warm wicker
        "l": (214, 158, 86, 255),   # sunlit straw weave
        "h": (242, 206, 134, 255),  # bright rim highlight
        "i": (74, 42, 24, 255),     # dark interior
        "p": (66, 30, 96, 255),     # berry peek
        "P": (122, 72, 168, 255),   # berry highlight
        "g": (68, 146, 56, 255),    # little leaf
    }
    basket = render_grid([
        ".....kkkkkk.....",
        "...kkllhhllkk...",
        "..klmkkkkkkmlk..",
        "..kdk......kdk..",
        ".kdk..pPp...kdk.",
        ".kdk.pPpgPp.kdk.",
        "kkhllhhllhhllhkk",
        "kdmmdmmdmmdmmdmk",
        "kllmdllmdllmdllk",
        ".kdmmdmmdmmdmdk.",
        ".kllmdllmdllmlk.",
        "..kdmmdmmdmmdk..",
        "..kllmdllmdllk..",
        "...kddddddddk...",
        "....kkkkkkkk....",
        "................",
    ], bsk_pal)
    save_png(basket, "minigame/basket.png")


# =============================================================================
# C3. FREEWAY FRENZY (HIGHWAY DODGE)
# =============================================================================

def make_road_tile():
    """160x64 opaque 4-lane highway strip, tiles seamlessly vertically!
    Layout across x=0..159:
    0..11   : dirt/gravel roadside verge with grass tufts
    12..17  : paved shoulder (left)
    18..19  : solid white/yellow left edge line (yellow on freeway left or white shoulder)
    20..50  : Lane 1 (31px)
    51..52  : dashed white divider
    53..83  : Lane 2 (31px)
    84..85  : dashed white divider (or center dashed line — 4 lanes same direction!)
    86..116 : Lane 3 (31px)
    117..118: dashed white divider
    119..141: wait let's make all 4 lanes EXACT equal width!
    Let's compute:
    0..7    : roadside verge (8px)
    8..15   : left shoulder (8px)
    16..17  : solid yellow left freeway edge line (2px)
    18..49  : Lane 1 (32px)
    50..51  : dashed white line (2px)
    52..83  : Lane 2 (32px)
    84..85  : dashed white line (2px)
    86..117 : Lane 3 (32px)
    118..119: dashed white line (2px)
    120..143: wait 18 + 32*4 + 2*3 = 18 + 128 + 6 = 152! Wait:
    Let's do:
    0..5    : grass/dirt shoulder verge (6px)
    6..13   : left paved shoulder (8px)
    14..15  : solid yellow edge line (2px)
    16..46  : Lane 1 (31px)
    47..48  : dashed white (2px)
    49..79  : Lane 2 (31px)
    80..81  : dashed white (2px)
    82..112 : Lane 3 (31px)
    113..114: dashed white (2px)
    115..145: Lane 4 (31px)
    146..147: solid white right edge line (2px)
    148..153: right paved shoulder (6px)
    154..159: grass/dirt verge (6px)
    Check symmetry: 6+8+2 = 16; 16 + 31*4 + 2*3 = 16 + 124 + 6 = 146; 146+2+6+6 = 160!
    Wait make left & right symmetric: 6 verge, 7 shoulder, 2 line = 15 on each side -> 130 interior!
    4 lanes * 31 + 3 * 2 = 124 + 6 = 130! EXACTLY SYMMETRIC!!
    0..5   : verge (6)
    6..12  : left shoulder (7)
    13..14 : solid yellow left line (2)
    15..45 : Lane 1 (31)
    46..47 : dashed white (2)
    48..78 : Lane 2 (31)
    79..80 : dashed white (2)
    81..111: Lane 3 (31)
    112..113: dashed white (2)
    114..144: Lane 4 (31)
    145..146: solid white right line (2)
    147..153: right shoulder (7)
    154..159: verge (6)
    """
    w, h = 160, 64
    rng = np.random.default_rng(1999)
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    arr[:, :, 3] = 255

    # Palette colors (limited, crisp VGA)
    asph_base = np.array([62, 66, 74], dtype=np.uint8)
    asph_dark = np.array([50, 54, 62], dtype=np.uint8)
    asph_lite = np.array([76, 80, 88], dtype=np.uint8)
    asph_tire = np.array([55, 58, 66], dtype=np.uint8)
    shld_base = np.array([78, 80, 84], dtype=np.uint8)
    shld_dark = np.array([66, 68, 74], dtype=np.uint8)
    dirt_base = np.array([124, 108, 78], dtype=np.uint8)
    dirt_dark = np.array([98, 84, 58], dtype=np.uint8)
    grass_mid = np.array([76, 114, 54], dtype=np.uint8)
    grass_hi  = np.array([104, 146, 68], dtype=np.uint8)
    white_hi  = np.array([236, 236, 228], dtype=np.uint8)
    white_sh  = np.array([188, 190, 188], dtype=np.uint8)
    yellow_hi = np.array([240, 198, 56], dtype=np.uint8)
    yellow_sh = np.array([196, 154, 38], dtype=np.uint8)
    botts_dot = np.array([248, 248, 240], dtype=np.uint8)

    # Fill asphalt
    arr[:, :, :3] = asph_base

    # Subtle vertical-tiling asphalt speckle & tire-wear tracks in each lane
    noise = rng.random((h, w))
    arr[noise < 0.14, :3] = asph_dark
    arr[noise > 0.88, :3] = asph_lite

    # Tire wear tracks centered in each of the 4 lanes
    for lane_start in (15, 48, 81, 114):
        for tx in (lane_start + 7, lane_start + 8, lane_start + 9,
                   lane_start + 21, lane_start + 22, lane_start + 23):
            arr[:, tx, :3] = np.where(noise[:, tx:tx+1] < 0.72, asph_tire, asph_dark)

    # Subtle periodic asphalt tar-crack seam near y=22 (wraps cleanly, doesn't touch y=0/63)
    for x in range(18, 142):
        cy = 22 + int(round(np.sin(x * 0.18) * 1.2))
        if rng.random() < 0.65:
            arr[cy, x, :3] = asph_dark

    # Paved shoulders
    for x in list(range(6, 13)) + list(range(147, 154)):
        arr[:, x, :3] = shld_base
        arr[noise[:, x] < 0.25, x, :3] = shld_dark
    # Rumble strips on shoulders (every 4px vertically -> divides 64 evenly!)
    for y in range(0, h, 4):
        arr[y:y+2, 9:12, :3] = asph_dark
        arr[y:y+2, 148:151, :3] = asph_dark

    # Dirt/grass road edges (seamless vertically using modular indices)
    for x in range(0, 6):
        arr[:, x, :3] = dirt_base
        arr[noise[:, x] < 0.35, x, :3] = dirt_dark
        if x < 4:
            arr[noise[:, x] > 0.45, x, :3] = grass_mid
            arr[noise[:, x] > 0.82, x, :3] = grass_hi
    for x in range(154, 160):
        arr[:, x, :3] = dirt_base
        arr[noise[:, x] < 0.35, x, :3] = dirt_dark
        if x >= 156:
            arr[noise[:, x] > 0.45, x, :3] = grass_mid
            arr[noise[:, x] > 0.82, x, :3] = grass_hi
    # Crisp edge curb line between gravel and shoulder
    arr[:, 6, :3] = dirt_dark
    arr[:, 153, :3] = dirt_dark

    # Solid yellow left edge line (x=13..14)
    arr[:, 13, :3] = yellow_hi
    arr[:, 14, :3] = yellow_sh
    arr[noise[:, 13] < 0.12, 13, :3] = yellow_sh

    # Solid white right edge line (x=145..146)
    arr[:, 145, :3] = white_hi
    arr[:, 146, :3] = white_sh
    arr[noise[:, 145] < 0.12, 145, :3] = white_sh

    # Dashed white lane dividers (period 32px -> 2 full dashes per 64px tile! Perfectly seamless!)
    for dx in (46, 79, 112):
        for start_y in (6, 38):
            arr[start_y:start_y + 18, dx, :3] = white_hi
            arr[start_y:start_y + 18, dx + 1, :3] = white_sh
            # Little California Botts' dots reflective marker between dashes!
            arr[(start_y + 24) % h:(start_y + 26) % h, dx:dx + 2, :3] = botts_dot

    save_png(Image.fromarray(arr, "RGBA"), "minigame/road_tile.png")


def _draw_car_base(w=24, h=44):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def make_cars_sheet():
    """144x44 sheet of 6 top-down cars, each 24x44, facing UP:
    0: Prius (silver-teal wedge hatchback)
    1: Pickup truck (forest green / red cab + open dark bed)
    2: Sports car (sleek crimson coupe with white racing stripes)
    3: Minivan (warm champagne/tan family van with long roof + roof rack)
    4: Hatchback (bright cobalt blue compact)
    5: CHP police cruiser (California Highway Patrol black-and-white with red/blue lightbar!)
    """
    sheet = Image.new("RGBA", (144, 44), (0, 0, 0, 0))

    def paint_vehicle(idx: int, spec: dict):
        im = Image.new("RGBA", (24, 44), (0, 0, 0, 0))
        px = im.load()

        # Soft pixel ground shadow underneath (offset +1 right, +1 down — crisp solid dark shadow!)
        # Actually keep shadow strictly opaque dark charcoal tucked right around tires/bumper
        ol = (20, 22, 28, 255)
        tire = (28, 30, 36, 255)
        glass_d = (36, 56, 78, 255)
        glass_m = (64, 102, 138, 255)
        glass_h = (156, 210, 238, 255)
        headl = (252, 246, 178, 255)
        taill = (224, 44, 44, 255)
        chrome = (196, 206, 216, 255)

        c_dark = spec["dark"]
        c_mid = spec["mid"]
        c_hi = spec["hi"]
        c_roof = spec.get("roof", c_hi)
        top_y = spec.get("top_y", 3)
        bot_y = spec.get("bot_y", 40)
        x0 = spec.get("x0", 4)
        x1 = spec.get("x1", 19)

        # Draw tires peeking slightly on sides
        for ty in (top_y + 5, top_y + 6, top_y + 7, top_y + 8, bot_y - 9, bot_y - 8, bot_y - 7, bot_y - 6):
            px[x0 - 1, ty] = tire
            px[x1 + 1, ty] = tire

        # Body silhouette with rounded corners
        for y in range(top_y, bot_y + 1):
            inset = 0
            if y in (top_y, bot_y):
                inset = 2
            elif y in (top_y + 1, bot_y - 1):
                inset = 1
            for x in range(x0 + inset, x1 - inset + 1):
                is_border = (
                    y in (top_y, bot_y)
                    or x in (x0 + inset, x1 - inset)
                    or (y in (top_y + 1, bot_y - 1) and x in (x0 + inset + 1, x1 - inset - 1))
                )
                if is_border:
                    px[x, y] = ol
                else:
                    # Subtle directional lighting (brighter top-left, shaded right & rear)
                    if x <= x0 + 2:
                        px[x, y] = c_hi
                    elif x >= x1 - 2 or y >= bot_y - 2:
                        px[x, y] = c_dark
                    else:
                        px[x, y] = c_mid

        # Side mirrors
        my = spec.get("mirror_y", top_y + 12)
        px[x0 - 1, my] = ol
        px[x0 - 1, my + 1] = c_dark
        px[x1 + 1, my] = ol
        px[x1 + 1, my + 1] = c_dark

        # Headlights at front (top)
        px[x0 + 2, top_y + 1] = headl
        px[x0 + 3, top_y + 1] = headl
        px[x1 - 2, top_y + 1] = headl
        px[x1 - 3, top_y + 1] = headl
        # Taillights at back (bottom)
        px[x0 + 2, bot_y - 1] = taill
        px[x0 + 3, bot_y - 1] = taill
        px[x1 - 2, bot_y - 1] = taill
        px[x1 - 3, bot_y - 1] = taill

        # Windshield (front glass)
        wy0, wy1 = spec["ws"]
        for y in range(wy0, wy1 + 1):
            w_in = 2 if y == wy0 else 2
            for x in range(x0 + w_in, x1 - w_in + 1):
                if y == wy0 or y == wy1 or x == x0 + w_in or x == x1 - w_in:
                    px[x, y] = glass_d
                else:
                    px[x, y] = glass_m
            # Diagonal specular streak across glass
            sx = x0 + 3 + (y - wy0)
            if x0 + 2 < sx < x1 - 2:
                px[sx, y] = glass_h

        # Roof / Cabin
        ry0, ry1 = spec["roof_y"]
        for y in range(ry0, ry1 + 1):
            for x in range(x0 + 3, x1 - 2):
                if x == x0 + 3 or x == x1 - 3 or y == ry0 or y == ry1:
                    px[x, y] = c_dark
                else:
                    px[x, y] = c_roof
            # Side cabin windows
            px[x0 + 2, y] = glass_d
            px[x1 - 2, y] = glass_d

        # Rear window (unless pickup)
        if spec.get("rw"):
            rwy0, rwy1 = spec["rw"]
            for y in range(rwy0, rwy1 + 1):
                for x in range(x0 + 3, x1 - 2):
                    px[x, y] = glass_d if (y == rwy0 or y == rwy1) else glass_m
                px[x0 + 4, y] = glass_h

        # Vehicle-specific distinctive details!
        kind = spec["kind"]
        if kind == "prius":
            # Split rear hatch glass bar + aerodynamic hood crease
            for x in range(x0 + 3, x1 - 2):
                px[x, bot_y - 7] = ol
            for y in range(top_y + 3, wy0 - 1):
                px[x0 + 4, y] = c_hi
                px[x1 - 4, y] = c_dark
        elif kind == "pickup":
            # Open truck bed behind cab!
            bed_y0, bed_y1 = ry1 + 2, bot_y - 3
            bed_d = (44, 46, 52, 255)
            bed_m = (64, 68, 76, 255)
            bed_l = (88, 92, 100, 255)
            for y in range(bed_y0, bed_y1 + 1):
                for x in range(x0 + 3, x1 - 2):
                    px[x, y] = bed_d if (y == bed_y0 or x in (x0 + 3, x1 - 3)) else (bed_l if x % 2 == 0 else bed_m)
            # Little toolbox at front of bed
            for y in range(bed_y0 + 1, bed_y0 + 4):
                for x in range(x0 + 4, x1 - 3):
                    px[x, y] = chrome if y == bed_y0 + 1 else (142, 152, 164, 255)
        elif kind == "sports":
            # Twin crisp white racing stripes + rear spoiler!
            stripe = (242, 240, 232, 255)
            for y in range(top_y + 2, bot_y - 2):
                if not (wy0 <= y <= wy1) and not (spec["rw"][0] <= y <= spec["rw"][1]):
                    px[10, y] = stripe
                    px[13, y] = stripe
            # Rear wing spoiler
            for x in range(x0 + 1, x1):
                px[x, bot_y - 3] = ol
                px[x, bot_y - 2] = (142, 20, 28, 255)
        elif kind == "minivan":
            # Roof luggage rack rails + crossbars
            rack = (60, 62, 68, 255)
            for y in range(ry0 + 2, ry1 - 1):
                px[x0 + 4, y] = rack
                px[x1 - 4, y] = rack
            for x in range(x0 + 4, x1 - 3):
                px[x, ry0 + 4] = rack
                px[x, ry1 - 3] = rack
        elif kind == "hatch":
            # Sunroof & cute compact rear wiper
            for y in range(ry0 + 2, ry0 + 6):
                for x in range(x0 + 5, x1 - 4):
                    px[x, y] = glass_d
            px[11, bot_y - 3] = ol
            px[12, bot_y - 3] = ol
        elif kind == "chp":
            # Classic California Highway Patrol: white roof & doors, black hood/trunk, red+blue lightbar!
            white = (240, 242, 246, 255)
            w_sh = (198, 204, 214, 255)
            # White door side panels + white roof
            for y in range(ry0 - 1, ry1 + 2):
                px[x0 + 1, y] = white
                px[x1 - 1, y] = w_sh
            # CHP gold star emblem dot on roof/doors? Actually crisp lightbar on roof!
            ly = ry0 + 2
            for x in range(x0 + 3, x1 - 2):
                px[x, ly - 1] = ol
                px[x, ly + 2] = ol
            for x in range(x0 + 3, 11):
                px[x, ly] = (242, 46, 46, 255)     # bright red strobe
                px[x, ly + 1] = (182, 24, 28, 255)
            for x in range(11, 13):
                px[x, ly] = chrome
                px[x, ly + 1] = (140, 146, 156, 255)
            for x in range(13, x1 - 2):
                px[x, ly] = (48, 128, 248, 255)    # bright blue strobe
                px[x, ly + 1] = (28, 78, 192, 255)
            # Push bumper bar at very front!
            for x in range(x0 + 3, x1 - 2):
                px[x, top_y - 1] = ol

        sheet.paste(im, (idx * 24, 0))

    specs = [
        # 0: Prius (silver-blue-teal)
        dict(kind="prius", dark=(92, 126, 138, 255), mid=(144, 182, 194, 255), hi=(196, 224, 232, 255),
             roof=(172, 208, 218, 255), top_y=5, bot_y=39, x0=4, x1=19, mirror_y=15,
             ws=(12, 17), roof_y=(18, 28), rw=(29, 34)),
        # 1: Pickup truck (warm forest green)
        dict(kind="pickup", dark=(34, 88, 52, 255), mid=(56, 134, 78, 255), hi=(94, 174, 108, 255),
             roof=(74, 154, 92, 255), top_y=2, bot_y=41, x0=3, x1=20, mirror_y=13,
             ws=(10, 14), roof_y=(15, 22), rw=None),
        # 2: Sports car (sleek crimson red)
        dict(kind="sports", dark=(142, 24, 34, 255), mid=(212, 42, 50, 255), hi=(244, 96, 86, 255),
             roof=(226, 62, 64, 255), top_y=4, bot_y=40, x0=4, x1=19, mirror_y=16,
             ws=(14, 19), roof_y=(20, 27), rw=(28, 32)),
        # 3: Minivan (warm champagne/beige)
        dict(kind="minivan", dark=(138, 114, 86, 255), mid=(194, 168, 132, 255), hi=(230, 210, 174, 255),
             roof=(214, 192, 156, 255), top_y=2, bot_y=41, x0=3, x1=20, mirror_y=12,
             ws=(9, 14), roof_y=(15, 34), rw=(35, 38)),
        # 4: Hatchback (bright cobalt blue)
        dict(kind="hatch", dark=(34, 68, 142, 255), mid=(58, 114, 212, 255), hi=(112, 166, 244, 255),
             roof=(86, 140, 230, 255), top_y=7, bot_y=38, x0=4, x1=19, mirror_y=16,
             ws=(14, 18), roof_y=(19, 30), rw=(31, 34)),
        # 5: CHP police cruiser (black & white!)
        dict(kind="chp", dark=(28, 32, 38, 255), mid=(48, 52, 62, 255), hi=(78, 84, 96, 255),
             roof=(236, 240, 246, 255), top_y=3, bot_y=41, x0=4, x1=19, mirror_y=14,
             ws=(12, 16), roof_y=(17, 28), rw=(29, 33)),
    ]
    for i, sp in enumerate(specs):
        paint_vehicle(i, sp)

    save_png(sheet, "minigame/cars.png")


def make_semi():
    """32x112 top-down 18-wheeler big rig facing UP (tractor cab + long white trailer)."""
    im = Image.new("RGBA", (32, 112), (0, 0, 0, 0))
    px = im.load()

    ol = (20, 22, 28, 255)
    tire = (26, 28, 34, 255)
    cab_d = (138, 30, 34, 255)   # classic red Peterbilt/Freightliner tractor!
    cab_m = (196, 48, 46, 255)
    cab_h = (238, 96, 78, 255)
    chrome = (212, 222, 232, 255)
    ch_d = (128, 138, 152, 255)
    glass_d = (34, 52, 74, 255)
    glass_m = (64, 100, 138, 255)
    glass_h = (160, 212, 240, 255)
    trl_w = (232, 234, 238, 255)
    trl_m = (202, 206, 214, 255)
    trl_d = (158, 164, 176, 255)
    trl_s = (118, 124, 136, 255)
    stripe_b = (42, 92, 164, 255)
    headl = (254, 246, 174, 255)
    amber = (242, 168, 36, 255)
    taill = (224, 42, 42, 255)

    # --- Tractor cab (y=2..30, x=5..26) ---
    # Chrome front bumper (y=2..3)
    for x in range(6, 26):
        px[x, 2] = ol
        px[x, 3] = chrome if 7 <= x <= 24 else ol
    # Hood (y=4..12, narrower nose x=8..23 with fenders x=5..7, 24..26)
    for y in range(4, 14):
        for x in range(5, 27):
            if x in (5, 26):
                px[x, y] = ol
            elif x in (6, 7, 24, 25):
                px[x, y] = cab_h if x == 6 else (cab_d if x == 25 else cab_m)
            elif x in (8, 23):
                px[x, y] = cab_d
            else:
                px[x, y] = cab_h if x < 12 else (cab_d if x > 20 else cab_m)
    # Headlights & amber clearance lights
    for hx in (6, 7, 24, 25):
        px[hx, 4] = headl
    for ax in (11, 14, 17, 20):
        px[ax, 14] = amber
    # Front wheels peeking
    for y in range(5, 11):
        px[4, y] = tire
        px[27, y] = tire

    # Cab body + sleeper (y=13..29, x=4..27)
    for y in range(13, 30):
        for x in range(4, 28):
            if x in (4, 27) or y == 29:
                px[x, y] = ol
            elif x <= 7:
                px[x, y] = cab_h
            elif x >= 24:
                px[x, y] = cab_d
            else:
                px[x, y] = cab_m
    # Chrome side mirrors
    for y in (14, 15):
        px[2, y] = ol
        px[3, y] = chrome
        px[28, y] = chrome
        px[29, y] = ol
    # Split windshield (y=15..18)
    for y in range(15, 19):
        for x in range(7, 25):
            if x in (15, 16) or y in (15, 18) or x in (7, 24):
                px[x, y] = glass_d
            else:
                px[x, y] = glass_m
        px[9 + (y - 15), y] = glass_h
        px[18 + (y - 15), y] = glass_h
    # Roof aero wind-deflector / sleeper roof detail (y=20..27)
    for y in range(20, 28):
        for x in range(7, 25):
            if x in (7, 24) or y in (20, 27):
                px[x, y] = cab_d
            else:
                px[x, y] = cab_h if y < 23 else cab_m
    # Twin chrome exhaust smokestacks behind cab!
    for y in (27, 28, 29):
        px[5, y] = chrome
        px[6, y] = ch_d
        px[25, y] = ch_d
        px[26, y] = chrome

    # Hitch / fifth wheel gap (y=30..33)
    for y in range(30, 34):
        for x in range(8, 24):
            px[x, y] = (46, 50, 58, 255) if (11 <= x <= 20) else tire
        px[5, y] = tire
        px[6, y] = tire
        px[25, y] = tire
        px[26, y] = tire

    # --- 53-foot Trailer (y=34..109, x=3..28) ---
    for y in range(34, 110):
        for x in range(3, 29):
            if x in (3, 28) or y in (34, 109):
                px[x, y] = ol
            elif x == 4:
                px[x, y] = trl_w
            elif x == 5:
                px[x, y] = stripe_b if 37 <= y <= 106 else trl_m
            elif x == 26:
                px[x, y] = stripe_b if 37 <= y <= 106 else trl_d
            elif x == 27:
                px[x, y] = trl_s
            else:
                # Subtle corrugated metal roof ribs every 6px!
                if y % 6 == 0:
                    px[x, y] = trl_d
                elif y % 6 == 1:
                    px[x, y] = trl_w
                elif x > 22:
                    px[x, y] = trl_m
                else:
                    px[x, y] = trl_w if x < 12 else trl_m

    # Refrigeration unit ("reefer") on front of trailer (y=35..38)
    for y in range(35, 39):
        for x in range(10, 22):
            px[x, y] = ch_d if (y == 38 or x in (10, 21)) else chrome

    # Rear tandem trailer wheels peeking out (y=93..105)
    for y in list(range(93, 98)) + list(range(100, 105)):
        px[2, y] = tire
        px[29, y] = tire

    # Rear doors / taillights / ICC bumper bar
    for x in range(6, 10):
        px[x, 108] = taill
    for x in range(22, 26):
        px[x, 108] = taill
    for x in range(10, 22):
        px[x, 108] = chrome if x % 2 == 0 else trl_d

    save_png(im, "minigame/semi.png")


def make_hazards_sheet():
    """144x24 sheet of 6 top-down highway hazards, each 24x24:
    0: pothole
    1: traffic cone
    2: mattress
    3: tumbleweed
    4: lost ladder
    5: shredded truck tire
    """
    sheet = Image.new("RGBA", (144, 24), (0, 0, 0, 0))

    # 0. Pothole (24x24) — jagged cracked dark asphalt cavity with rubble edge
    pot_pal = {
        "c": (36, 38, 44, 255),     # dark crack
        "e": (94, 98, 106, 255),    # chipped concrete rim highlight
        "m": (66, 70, 78, 255),     # broken lip
        "d": (42, 42, 46, 255),     # inner wall
        "k": (22, 20, 24, 255),     # deep pit
        "b": (76, 62, 48, 255),     # exposed dirt/gravel at bottom
        "g": (110, 94, 72, 255),    # pebble
    }
    pothole = render_grid([
        "........................",
        ".........c..............",
        "........c..ee...........",
        "......eeeemmmmee........",
        ".....emddddddddme.......",
        "....emddkkkkkkddme..c...",
        "...emdkkkbbbbkkkdmec....",
        "..ccmdkkbbggbbkkdmc.....",
        "....mdkkbbbbbkkkdm......",
        "...emdkkkbbbbkkkdm......",
        "...emddkkkkkkkkddme.....",
        "....emddkkkkkkdddme.....",
        "....eemddddddddddme.c...",
        ".....cemmmddddmmmecc....",
        "......c..eeemmeee.......",
        "........c....c..........",
        ".......c......c.........",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
    ], pot_pal)
    # Center pothole vertically
    p0 = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    p0.paste(pothole.crop((0, 1, 24, 18)), (0, 3))
    sheet.paste(p0, (0, 0))

    # 1. Traffic cone (24x24) — bright orange cone w/ white reflective collar & dark square base
    cone_pal = {
        "k": (34, 20, 18, 255),
        "b": (58, 56, 62, 255),     # rubber base dark
        "B": (88, 86, 94, 255),     # rubber base top
        "o": (236, 96, 26, 255),    # bright safety orange
        "O": (254, 148, 54, 255),   # sunlit orange
        "d": (176, 56, 18, 255),    # shaded orange
        "w": (244, 246, 248, 255),  # reflective white band
        "s": (188, 198, 210, 255),  # shaded white band
    }
    cone = render_grid([
        "........................",
        "........................",
        "..........kkkk..........",
        ".........kOOOOd.........",
        ".........kOOood.........",
        "........kOOooood........",
        "........kwwwwwss........",
        ".......kwwwwwwsss.......",
        ".......kOOooooodd.......",
        "......kOOooooooddd......",
        "......kwwwwwwwwsss......",
        ".....kwwwwwwwwwwsss.....",
        ".....kOOooooooooddd.....",
        "....kOOooooooooooddd....",
        "...kBBooooooooooodBBk...",
        "..kBBBBOOOOOoooodBBBBk..",
        "..kBBBBBBBBBBBBBBBBBBk..",
        "..kbbbbBBBBBBBBBBbbbbk..",
        "..kbbbbbbbbbbbbbbbbbbk..",
        "...kkkkkkkkkkkkkkkkkk...",
        "........................",
        "........................",
        "........................",
        "........................",
    ], cone_pal)
    sheet.paste(cone, (24, 0))

    # 2. Mattress (24x24) — fallen quilted cream mattress with light-blue ticking stripes & tufts!
    mat_pal = {
        "k": (44, 46, 56, 255),
        "w": (242, 238, 224, 255),  # cream top
        "s": (212, 206, 190, 255),  # quilted shadow
        "d": (166, 160, 148, 255),  # side gusset shade
        "b": (134, 166, 204, 255),  # blue ticking stripe
        "t": (146, 142, 134, 255),  # button tuft dimple
        "r": (174, 92, 62, 255),    # snapped bungee strap!
    }
    mattress = render_grid([
        "........................",
        "........................",
        "....kkkkkkkkkkkkkkkk....",
        "...kwwbwwwbwwwbwwwbwk...",
        "..kwwwbwwwbwwwbwwwbwwk..",
        "..kwwtwwwtwwwtwwwtwwwk..",
        "..kwwwbwwwbwwwbwwwbwwk..",
        "..kwwbwwwbwwwbwwwbwwwk..",
        "..krrrbwwwbwwwbwwwbwwk..",
        "..kwwbbrrrbwwwbwwwbwwk..",
        "..kwwtwwwtrrrtwwwtwwwk..",
        "..kwwwbwwwbwwrrrbwbwwk..",
        "..kwwbwwwbwwwbwwrrwwwk..",
        "..kwwwbwwwbwwwbwwwrwwk..",
        "..kwwtwwwtwwwtwwwtwwwk..",
        "..ksssbsssbsssbsssbssk..",
        "..kddddddddddddddddddk..",
        "..kddddddddddddddddddk..",
        "...kkkkkkkkkkkkkkkkkk...",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
    ], mat_pal)
    sheet.paste(mattress, (48, 0))

    # 3. Tumbleweed (24x24) — tangled thorny golden-brown dry brush ball
    tw_pal = {
        "k": (54, 38, 22, 255),     # dark twig
        "d": (104, 74, 42, 255),    # deep tan branch
        "m": (154, 114, 66, 255),   # warm tumbleweed brown
        "l": (202, 162, 102, 255),  # dry golden straw
        "h": (228, 196, 136, 255),  # bright dry tip
    }
    tumble = render_grid([
        "........................",
        ".........k...l..........",
        "......l..m..k..h........",
        "....k.m.kllmd.m.k.......",
        "...m.kllmdkmmlk..l......",
        "..k.dlmkhlmdkmllk.k.....",
        ".h.mlkdmklkdlmklmd.m....",
        "..kdlmhlmdmklmhlmdk.....",
        ".k.mklmdklmdkmklm.lk....",
        ".m.dlmklmhlmklmdk..m....",
        "..kmlkdmklkdmklmdk.k....",
        ".k.dmhlmklmdmklmd.l.....",
        "..k.mlkdmklmdkdlmk.k....",
        "...kdlmklmhlmklmd.m.....",
        "..h.mkdmklkdmklm.k......",
        "...k.dlmklmdmkl.k.......",
        "....m.kdlmklmd.k........",
        ".....k..mkdlm.k.........",
        ".......k.k.k.k..........",
        ".........k..d...........",
        "........................",
        "........................",
        "........................",
        "........................",
    ], tw_pal)
    sheet.paste(tumble, (72, 0))

    # 4. Lost ladder (24x24) — shiny aluminum extension ladder angled across lane
    lad_pal = {
        "k": (36, 40, 48, 255),
        "s": (124, 134, 148, 255),  # aluminum shadow
        "m": (176, 188, 202, 255),  # aluminum mid
        "h": (232, 240, 248, 255),  # bright highlight
        "y": (234, 182, 42, 255),   # yellow safety end-cap / label
    }
    ladder = render_grid([
        "........................",
        "...............kk.......",
        "..............kyhk......",
        ".............khmkk..kk..",
        "............khmkk..kyhk.",
        "...........khmkk..khmkk.",
        "..........khmhmk.khmkk..",
        ".........khmkkhmkhmkk...",
        "........khmkk.kkhmkk....",
        ".......khmkk...khmkk....",
        "......khmhmk..khmkk.....",
        ".....khmkkhmkshmkk......",
        "....khmkk.kkshmkk.......",
        "...khmkk...khmkk........",
        "..khmhmk..khmkk.........",
        ".khmkkhmkshmkk..........",
        ".kykk.kkshmkk...........",
        "..kk...khmkk............",
        "......khmkk.............",
        ".....khmkk..............",
        "....kyskk...............",
        ".....kk.................",
        "........................",
        "........................",
    ], lad_pal)
    sheet.paste(ladder, (96, 0))

    # 5. Shredded truck tire ("road gator", 24x24) — torn curved black rubber tread + steel wires
    gator_pal = {
        "k": (18, 18, 22, 255),     # deep black rubber
        "d": (40, 42, 48, 255),     # dark tire rubber
        "m": (66, 70, 78, 255),     # tread block ridge
        "l": (96, 102, 112, 255),   # worn rubber highlight
        "s": (188, 196, 208, 255),  # frayed steel belt wire!
    }
    gator = render_grid([
        "........................",
        "........................",
        "........................",
        "..........s.............",
        "........sskkk...........",
        ".......skkmdkkk.........",
        "......kkmdlmddkk........",
        ".....kmdlmddmddkk.......",
        "....kmdlmdkkmdddkk......",
        "...kmdmddk..kmdmdkk.....",
        "...kmdddk....kmdddkk....",
        "..kmdmdk......kmdmdk....",
        "..kmddk........kmddk....",
        "..kmdmk........kmdmks...",
        ".skmdk..........kmdkss..",
        "..kdk...........kkdk....",
        "..kk.............kk.s...",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
    ], gator_pal)
    sheet.paste(gator, (120, 0))

    save_png(sheet, "minigame/hazards.png")


# =============================================================================
# C5. ITEM ICONS (16x16) + C3 gas_can (16x16)
# =============================================================================

def make_icons_and_gas_can():
    icons = {}

    # 1. gas (and minigame/gas_can.png) — iconic bright red gas can w/ yellow spout
    gas_pal = {
        "k": (34, 16, 18, 255),
        "r": (198, 36, 36, 255),
        "R": (242, 74, 62, 255),
        "d": (132, 20, 26, 255),
        "y": (246, 204, 48, 255),
        "Y": (255, 240, 128, 255),
        "w": (255, 168, 152, 255),
    }
    icons["gas"] = render_grid([
        ".........kkk....",
        "........kYYyk...",
        "....kkkkkkkyk...",
        "...kRRRRRRkkk...",
        "..kRkkRRkkRRk...",
        "..kRkkkkkkRRk...",
        "..kRRRRRRRRdk...",
        "..kRwrrrrrrdk...",
        "..kRrrddrrrdk...",
        "..kRrrdrrdrdk...",
        "..kRrrrdrrddk...",
        "..kRrrdrrdrdk...",
        "..kRrrddrrrdk...",
        "..kRdddddddk....",
        "...kkkkkkkk.....",
        "................",
    ], gas_pal)

    # 2. food — brown paper grocery bag with baguette, leafy celery/greens & red apple!
    food_pal = {
        "k": (42, 26, 16, 255),
        "b": (176, 124, 68, 255),   # kraft paper bag
        "B": (214, 164, 102, 255),  # bag highlight
        "d": (132, 86, 44, 255),    # bag shadow
        "g": (58, 146, 54, 255),    # leafy greens
        "G": (118, 202, 86, 255),   # bright lettuce
        "y": (236, 184, 92, 255),   # baguette golden crust
        "Y": (252, 224, 152, 255),  # baguette slash
        "r": (214, 46, 42, 255),    # red apple
        "w": (250, 168, 154, 255),  # apple shine
    }
    icons["food"] = render_grid([
        "..........kkk...",
        "....kkk..kYYyk..",
        "...kGGgk.kYyyk..",
        "..kGgGgkkyyYyk..",
        "..kggGgrrkYyk...",
        "..kkGgrwrrkk....",
        "..kBBBBBBBBk....",
        "..kBbbbbbbdk....",
        "..kBbbddbbdk....",
        "..kBbbbbbbdk....",
        "..kBbbddbbdk....",
        "..kBbbbbbbdk....",
        "..kBbbbbbbdk....",
        "..kBdddddddk....",
        "...kkkkkkkk.....",
        "................",
    ], food_pal)

    # 3. kibble — dog food bag (warm blue/tan) with unmistakable white bone emblem!
    kib_pal = {
        "k": (30, 24, 22, 255),
        "b": (196, 126, 48, 255),   # warm golden-orange bag
        "B": (236, 172, 78, 255),   # highlight
        "d": (142, 82, 28, 255),    # shadow
        "u": (48, 102, 168, 255),   # blue label band
        "w": (246, 242, 228, 255),  # white bone icon
        "r": (198, 52, 44, 255),    # red top seal
    }
    icons["kibble"] = render_grid([
        "...kkkkkkkkkk...",
        "..krrrrrrrrrrk..",
        "...kBBBBBBBBk...",
        "..kBbbbbbbbbdk..",
        "..kBuuuuuuuudk..",
        "..kBwwuuuuwwdk..",
        "..kBwwwwwwwwdk..",
        "..kBwwuuuuwwdk..",
        "..kBuuuuuuuudk..",
        "..kBbbbbbbbbdk..",
        "..kBbbBbbBbbdk..",
        "..kBbbbbbbbbdk..",
        "..kBdddddddddk..",
        "..kddddddddddk..",
        "...kkkkkkkkkk...",
        "................",
    ], kib_pal)

    # 4. catfood — silver/teal cat food tin can with fish icon & pull tab!
    cat_pal = {
        "k": (26, 28, 36, 255),
        "s": (166, 178, 192, 255),  # silver rim
        "S": (228, 236, 244, 255),  # bright tin shine
        "g": (108, 118, 132, 255),  # dark metal
        "t": (46, 152, 164, 255),   # teal label
        "T": (82, 196, 204, 255),   # bright teal
        "d": (30, 104, 118, 255),   # dark teal
        "o": (244, 162, 62, 255),   # orange fish silhouette
        "w": (252, 234, 166, 255),  # fish eye/highlight
    }
    icons["catfood"] = render_grid([
        "................",
        "................",
        "...kkkkkkkkkk...",
        "..kSSssssssggk..",
        ".kSsskkkkssssgk.",
        ".kSSSSSSSSSSSSk.",
        ".kTttttttttttdk.",
        ".kTtttoootttodk.",
        ".kTttoowooootdk.",
        ".kTtttoootttodk.",
        ".kTttttttttttdk.",
        ".kTttttttttttdk.",
        ".kSssssssssssgk.",
        "..kggggggggggk..",
        "...kkkkkkkkkk...",
        "................",
    ], cat_pal)

    # 5. litter — blue plastic cat litter pan filled with speckled sand + yellow scoop!
    lit_pal = {
        "k": (28, 32, 42, 255),
        "b": (62, 126, 198, 255),   # blue tray
        "B": (112, 174, 236, 255),  # rim highlight
        "d": (38, 82, 142, 255),    # tray shadow
        "s": (212, 198, 168, 255),  # litter sand
        "S": (176, 162, 136, 255),  # litter pebble
        "y": (242, 198, 56, 255),   # scoop handle
        "o": (196, 146, 32, 255),   # scoop shade
    }
    icons["litter"] = render_grid([
        "...........kkk..",
        "..........kkyyk.",
        ".........kkyok..",
        "........kkyok...",
        "..kkkkkkkkyk....",
        ".kBBBBBBByBBk...",
        "kBsSsSssyySsBk..",
        "kBssSsSyySssBk..",
        "kBBBBBBBBBBBBk..",
        "kBbbbbbbbbbbdk..",
        "kBbbbbbbbbbbdk..",
        ".kBbbbbbbbbdk...",
        ".kddddddddddk...",
        "..kkkkkkkkkk....",
        "................",
        "................",
    ], lit_pal)

    # 6. tire — crisp spare tire with tread & 5-spoke silver hubcap!
    tire_pal = {
        "k": (18, 18, 24, 255),
        "t": (44, 46, 54, 255),     # dark tire
        "T": (76, 80, 92, 255),     # rubber highlight
        "s": (166, 176, 190, 255),  # silver rim
        "S": (228, 236, 244, 255),  # bright hubcap shine
        "g": (106, 114, 128, 255),  # hubcap shade
    }
    icons["tire"] = render_grid([
        "....kkkkkkkk....",
        "..kkTTTTTTTTkk..",
        ".kTTttttttttTTk.",
        ".kTttkkkkkkttTk.",
        "kTttkSSssSSkttTk",
        "kTtkSSgkkSSsktTk",
        "kTtkSgkSSkgsktTk",
        "kTtkskSggSksktTk",
        "kTtkSgkSSkgsktTk",
        "kTtkssgkkggsktTk",
        "kTttkggggggkttTk",
        ".kTttkkkkkkttTk.",
        ".kttttttttttttk.",
        "..kkttttttttkk..",
        "....kkkkkkkk....",
        "................",
    ], tire_pal)

    # 7. parts — steel wrench crossed over ribbed rubber radiator hose/belt!
    parts_pal = {
        "k": (22, 24, 32, 255),
        "s": (164, 176, 194, 255),  # wrench mid
        "S": (230, 238, 248, 255),  # wrench shine
        "g": (104, 114, 130, 255),  # wrench shade
        "b": (88, 92, 106, 255),    # rubber fan belt mid (visible on dark UI!)
        "B": (132, 138, 154, 255),  # belt highlight
        "r": (196, 76, 52, 255),    # copper clamp/bolt accent
    }
    icons["parts"] = render_grid([
        ".........kk.kk..",
        "........kSk.kSk.",
        "........kSSkSSk.",
        "....kkkkkSSSSk..",
        "..kkBBBbkSSSgk..",
        ".kBbbkkbbSSgk...",
        ".kBrk..kSSgkbbk.",
        ".kBbk.kSSgk.kBbk",
        ".kBbk.kSgk..kBrk",
        ".kBbkkSgk...kBbk",
        "..kbbSgk..kkBbk.",
        "..kSSgkkkkbBBk..",
        ".kSSgkkbbbbkk...",
        ".kSgk..kkkk.....",
        "..kk............",
        "................",
    ], parts_pal)

    # 8. chains — coiled interlocking steel tire snow-chains!
    ch_pal = {
        "k": (24, 28, 36, 255),
        "S": (232, 240, 248, 255),
        "s": (160, 174, 192, 255),
        "g": (96, 108, 124, 255),
        "y": (232, 186, 46, 255),   # brass clasp!
    }
    icons["chains"] = render_grid([
        "....kkkkkkkk....",
        "..kkSSssssggkk..",
        ".kSSgkkkkkksggk.",
        ".kSgkSSssggkkSk.",
        "kSgkkSk..kSgkkSk",
        "kSgkSgk..kgSkkSk",
        "kSgkkSSssSSgkkSk",
        "kSgk..kkkk..kgSk",
        "kSgk.kSssSk.kgSk",
        "kSgk.kg..gk.kgSk",
        "kSgk.kSssSk.kgSk",
        ".kSgkkggggkkggk.",
        ".kssgkyyyykgggk.",
        "..kkggyyyyggkk..",
        "....kkkkkkkk....",
        "................",
    ], ch_pal)

    # 9. propane — white/silver camping propane tank cylinder with brass valve & collar!
    prop_pal = {
        "k": (26, 28, 36, 255),
        "w": (238, 242, 246, 255),
        "S": (248, 250, 252, 255),
        "s": (196, 204, 216, 255),
        "g": (134, 144, 160, 255),
        "y": (232, 186, 56, 255),   # brass valve
        "o": (176, 126, 30, 255),
        "r": (208, 48, 44, 255),    # red warning stripe
    }
    icons["propane"] = render_grid([
        ".....kkkkkk.....",
        "....kssyyssk....",
        "....kskooksk....",
        "....kksssskk....",
        "...kwwSSSSssk...",
        "..kwwwssssssgk..",
        "..kwwwssssssgk..",
        "..krrrrrrrrrrk..",
        "..kwwwssssssgk..",
        "..kwwwssssssgk..",
        "..kwwwssssssgk..",
        "..kwwwssssssgk..",
        "...kggggggggk...",
        "...kssggggssk...",
        "....kkkkkkkk....",
        "................",
    ], prop_pal)

    # 10. ducttape — classic chunky silver duct tape roll (3/4 view showing cardboard core)
    dt_pal = {
        "k": (28, 30, 38, 255),
        "S": (228, 234, 242, 255),
        "s": (176, 184, 196, 255),
        "g": (118, 126, 140, 255),
        "c": (166, 122, 74, 255),   # cardboard core
        "C": (116, 80, 44, 255),    # inner core shadow
        "d": (72, 76, 88, 255),
    }
    icons["ducttape"] = render_grid([
        "................",
        "....kkkkkkkk....",
        "..kkSSSSSSSSkk..",
        ".kSSssssssssSSk.",
        "kSSskkkkkkkkssgk",
        "kSskCCccccCCksgk",
        "kSskCckkkkCcksdk",
        "kSskCCkkkkCCksdk",
        "kSsskkkkkkkkssgk",
        "kSSssssssssssggk",
        "kSsssssssssssggk",
        "kssggggggggggddk",
        ".kggggggggggddk.",
        "..kkddddddddkk..",
        "....kkkkkkkk....",
        "................",
    ], dt_pal)

    # 11. money — crisp green US dollar bill stack with golden band & '$' emblem!
    mon_pal = {
        "k": (20, 36, 22, 255),
        "g": (68, 152, 72, 255),    # dollar bill green
        "G": (122, 202, 108, 255),  # bright bill green
        "d": (42, 102, 48, 255),    # deep green shadow
        "c": (222, 238, 194, 255),  # pale cream border/emblem
        "y": (238, 196, 68, 255),   # paper strap band
    }
    icons["money"] = render_grid([
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".kGGGGGGGGGGGGk.",
        "kGccgggyygggccgk",
        "kGcggggyyggggcgk",
        "kGcggcgyygcggcgk",
        "kGcggcgyygcggcgk",
        "kGcggggyyggggcgk",
        "kGccgggyygggccgk",
        ".kdddddyydddddk.",
        ".kGGgggyygggddk.",
        ".kdddddyydddddk.",
        "..kkkkkkkkkkkk..",
        "................",
        "................",
    ], mon_pal)

    # 12. water — bright blue camping water jug with handle & white cap!
    wat_pal = {
        "k": (20, 32, 54, 255),
        "b": (56, 138, 222, 255),   # water jug blue
        "B": (118, 194, 250, 255),  # highlight
        "d": (34, 88, 162, 255),    # shade
        "w": (236, 246, 254, 255),  # white cap & specular shine
        "s": (176, 214, 242, 255),  # water line
    }
    icons["water"] = render_grid([
        ".....kkkk.......",
        "....kwwwwk......",
        "....kBBBBkkkk...",
        "...kBbbbbbbBBk..",
        "..kBbbbkkkkbBk..",
        "..kBwbbk..kbBk..",
        "..kBwbbk..kbbk..",
        "..kBwbbkkkkbdk..",
        "..kBssBBBBbbdk..",
        "..kBbbbbbbbbdk..",
        "..kBbbbbbbbbdk..",
        "..kBbbbbbbbbdk..",
        "..kBdddddddddk..",
        "...kkkkkkkkkk...",
        "................",
        "................",
    ], wat_pal)

    # 13. coffee — to-go paper coffee cup with dark lid, kraft sleeve & steam wisp!
    cof_pal = {
        "k": (34, 24, 20, 255),
        "w": (244, 240, 232, 255),  # white cup
        "s": (204, 198, 188, 255),  # cup shadow
        "l": (76, 56, 46, 255),     # dark brown lid
        "L": (112, 86, 72, 255),    # lid highlight
        "b": (184, 128, 72, 255),   # cardboard sleeve
        "B": (222, 168, 104, 255),  # sleeve highlight
        "d": (138, 90, 46, 255),    # sleeve shadow
        "g": (212, 224, 234, 255),  # hot steam wisp
    }
    icons["coffee"] = render_grid([
        "......g...g.....",
        ".....g...g......",
        "....kkkkkkkk....",
        "...kLLLLLLLLk...",
        "..kllllllllllk..",
        "...kwwwwwwwwk...",
        "...kwwssssssk...",
        "...kBBBBBBBBk...",
        "...kBbbbbbbdk...",
        "...kBbbddbbdk...",
        "...kBbbbbbbdk...",
        "....kwwssssk....",
        "....kwwssssk....",
        "....kssssssk....",
        ".....kkkkkk.....",
        "................",
    ], cof_pal)

    # 14. treats — crunchy golden-brown dog bone biscuit!
    trt_pal = {
        "k": (52, 30, 16, 255),
        "b": (204, 146, 74, 255),   # biscuit golden tan
        "B": (242, 198, 122, 255),  # highlight
        "d": (152, 96, 42, 255),    # baked edge shadow
        "s": (176, 118, 54, 255),   # baked speck
    }
    icons["treats"] = render_grid([
        "................",
        "................",
        ".........kkk....",
        "........kBBbk...",
        "........kBbbkk..",
        ".......kBbbBBbk.",
        "......kBbsbbbdk.",
        ".....kBbbbbddk..",
        "....kBbsbbdk....",
        "..kkBbbbbdk.....",
        ".kBBbbbsdk......",
        ".kBbbbbdk.......",
        "..kkbBddk.......",
        "...kBddk........",
        "....kkk.........",
        "................",
    ], trt_pal)

    # 15. toiletpaper — white TP roll with cardboard tube & dangling square sheet!
    tp_pal = {
        "k": (34, 38, 48, 255),
        "w": (246, 246, 242, 255),  # pure soft white
        "s": (206, 212, 222, 255),  # cool paper shade
        "g": (162, 170, 186, 255),  # perforation / deep shadow
        "c": (164, 122, 78, 255),   # cardboard tube
        "C": (112, 78, 46, 255),    # tube interior
    }
    icons["toiletpaper"] = render_grid([
        "................",
        "...kkkkkkkkkk...",
        "..kwwwwwwwwwwk..",
        ".kwwkccCckwwwwk.",
        ".kwwkCCCCkwwwwk.",
        ".kwwwkkkkwwwwwk.",
        ".kwwwwwwwwwwssk.",
        ".kwwsssssswwssk.",
        ".kwwsssssswwssk.",
        ".kwwsssssswwgsk.",
        ".kwwsssssswwssk.",
        "..ksssssssswwsk.",
        "...kkkkkkkkwwsk.",
        "..........kwwsk.",
        "..........kkkkk.",
        "................",
    ], tp_pal)

    # 16. firstaid — crisp white medical first-aid kit box with bold red cross & handle!
    fa_pal = {
        "k": (28, 32, 42, 255),
        "w": (244, 246, 250, 255),
        "s": (196, 206, 218, 255),
        "g": (132, 144, 162, 255),
        "r": (222, 42, 46, 255),
        "R": (250, 92, 86, 255),
        "d": (162, 24, 30, 255),
    }
    icons["firstaid"] = render_grid([
        "................",
        ".....kkkkkk.....",
        "....ksskkssk....",
        ".kkkskkkkkkskkk.",
        "kwwwwwwwwwwwwwwk",
        "kwwwwwrRrwwwwwwk",
        "kwwwwwrRrwwwwwwk",
        "kwwwrrRRrrrwwwwk",
        "kwwwrrddrrdwwwwk",
        "kwwwwwrddwwwwwwk",
        "kwwwwwrddwwwwwwk",
        "kwwsssssssssswwk",
        "kggggggggggggggk",
        ".kkkkkkkkkkkkkk.",
        "................",
        "................",
    ], fa_pal)

    for name, im in icons.items():
        save_png(im, f"icons/{name}.png")
    # Also save gas_can.png for Freeway Frenzy pickup (matching iconic red gas can!)
    save_png(icons["gas"], "minigame/gas_can.png")


# =============================================================================
# C6. UI: 9-SLICE FRAME (24x24) & CURSOR (12x12)
# =============================================================================

def make_ui():
    # 1. assets/ui/frame.png (24x24) — 9-slice ornamental warm walnut wood & burnished brass border!
    # 8px corners, 8px repeatable middle edges, 8x8 TRANSPARENT center!
    fr_pal = {
        "k": (34, 20, 12, 255),     # dark outer/inner outline
        "w": (118, 70, 38, 255),    # rich walnut wood mid
        "W": (158, 102, 58, 255),   # warm wood highlight bevel
        "d": (74, 42, 22, 255),     # deep walnut shadow
        "b": (196, 152, 62, 255),   # burnished brass mid
        "B": (244, 212, 114, 255),  # bright brass shine
        "r": (138, 96, 32, 255),    # brass shadow/bevel
    }
    frame = render_grid([
        ".kkkkkkkkkkkkkkkkkkkkkk.",
        "kBBBBbkkkkkkkkkkkkbBBBBk",
        "kBbbBrWWWWWWWWWWWWrbBbBk",
        "kBbBrbwwwwwwwwwwwwbrbBbk",
        "kBbrBwwwwwwwwwwwwwwBrbBk",
        "kbrbBddddddddddddddBbrbk",
        "kkrrkkkkkkkkkkkkkkkkrrkk",
        ".kWwk..............kwWk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        "kkrrkkkkkkkkkkkkkkkkrrkk",
        "kbrbBWWWWWWWWWWWWWWBbrbk",
        "kBbrBwwwwwwwwwwwwwwBrbBk",
        "kBbBrbddddddddddddbrbBbk",
        "kBbbBrddddddddddddrbBbBk",
        "kBBBBbkkkkkkkkkkkkbBBBBk",
        ".kkkkkkkkkkkkkkkkkkkkkk.",
    ], fr_pal)
    # Wait check exact 9-slice! Corners are 0..7 and 16..23; center is 8..15 (8x8 transparent)!
    # Let's double check rows 8..15 and cols 8..15 in `frame` above:
    # In row 7, cols 5..18 are '.', so rows 7..16 have cols 5..18 transparent (14x10) — that's actually even cleaner,
    # Wait: 9-slice slices at x=8 and x=16, y=8 and y=16!
    # So cols 0..7 MUST be the left border, cols 8..15 MUST be the repeatable top/bottom strip with transparent center (rows 8..15),
    # and cols 16..23 MUST be the right border!
    # Look at row 7 above: cols 0..4 are `.kWwk`, cols 5..18 are `.`, cols 19..23 are `kwWk.`!
    # That means rows 8..15 have cols 0..4 opaque (left border 5px thick, 3px transparent inner padding inside the 8px slice!),
    # cols 8..15 are 100% transparent in rows 8..15 AND completely uniform horizontally across cols 8..15 in rows 0..6 and 17..23!
    # WAIT — check rows 1..5 in cols 8..15:
    # Row 1: `kBBBBbkkkkkkkkkkkkbBBBBk` -> cols 8..15 are ALL `k`! Wait: col 0=k, 1..4=BBBB, 5=b, 6..17=k (12 k's), 18=b, 19..22=BBBB, 23=k!
    # Row 2: `kBbbBrWWWWWWWWWWWWrbBbBk` -> cols 6..17 are ALL `W`!
    # Row 3: `kBbBrbwwwwwwwwwwwwbrbBbk` -> cols 6..17 are ALL `w`!
    # Row 4: `kBbrBwwwwwwwwwwwwwwBrbBk` -> cols 5..18 are ALL `w`!
    # Row 5: `kbrbBddddddddddddddBbrbk` -> cols 5..18 are ALL `d`!
    # Row 6: `kkrrkkkkkkkkkkkkkkkkrrkk` -> cols 4..19 are ALL `k`!
    # And vertically in rows 8..15: EVERY row 8..15 is IDENTICAL (` .kWwk..............kwdk. `)!
    # Let's make row 7 match rows 8..15 too (just `.kWwk` and `kwdk.`) or have a nice brass corner transition at row 6-7,
    # and let's verify the middle 8x8 (rows 8..15, cols 8..15) is 100% transparent AND cols 8..15 in rows 0..7 and 16..23 are 100% uniform so 9-slice stretching looks FLAWLESS with zero distortion!
    # Wait: in row 7, right side had `kwWk.` instead of `kwdk.` and row 16 is still inside the bottom 8px corner (rows 16..23). Let's make it super crisp and ornamental with brass corner rivets AND brass trim along the wood!
    frame2 = render_grid([
        ".kkkkkkkkkkkkkkkkkkkkkk.",
        "kBBBBbkkkkkkkkkkkkbBBBBk",
        "kBbbBrWWWWWWWWWWWWrbBbBk",
        "kBbBrbwwwwwwwwwwwwbrbBbk",
        "kBbrBwwbbbbbbbbbbwwBrbBk",
        "kbrbBddddddddddddddBbrbk",
        "kkrrkkkkkkkkkkkkkkkkrrkk",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        ".kWwk..............kwdk.",
        "kkrrkkkkkkkkkkkkkkkkrrkk",
        "kbrbBWWWWWWWWWWWWWWBbrbk",
        "kBbrBwwbbbbbbbbbbwwBrbBk",
        "kBbBrbwwwwwwwwwwwwbrbBbk",
        "kBbbBrddddddddddddrbBbBk",
        "kBBBBbkkkkkkkkkkkkbBBBBk",
        ".kkkkkkkkkkkkkkkkkkkkkk.",
    ], fr_pal)
    # Wait: check left & right side thickness vs top & bottom thickness!
    # Top/bottom border is 6px thick (rows 1..6), left/right border is 4px thick (cols 1..4) — let's make left/right 6px thick too (cols 1..6, with brass pin-stripe at col 4) so the frame has uniform, sumptuous thickness on all 4 sides!
    frame3 = render_grid([
        ".kkkkkkkkkkkkkkkkkkkkkk.",
        "kBBBBbkkkkkkkkkkkkbBBBBk",
        "kBbbBrWWWWWWWWWWWWrbBbBk",
        "kBbBrbwwwwwwwwwwwwbrbBbk",
        "kBbrBwwbbbbbbbbbbwwBrbBk",
        "kbrbBddddddddddddddBbrbk",
        "kkrrkkkkkkkkkkkkkkkkrrkk",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        ".kWwbdk..........kdbwdk.",
        "kkrrkkkkkkkkkkkkkkkkrrkk",
        "kbrbBWWWWWWWWWWWWWWBbrbk",
        "kBbrBwwbbbbbbbbbbwwBrbBk",
        "kBbBrbwwwwwwwwwwwwbrbBbk",
        "kBbbBrddddddddddddrbBbBk",
        "kBBBBbkkkkkkkkkkkkbBBBBk",
        ".kkkkkkkkkkkkkkkkkkkkkk.",
    ], fr_pal)
    save_png(frame3, "ui/frame.png")

    # 2. assets/ui/cursor.png (12x12) — crisp retro RPG/adventure pointing hand cursor!
    cur_pal = {
        "k": (26, 20, 18, 255),     # dark crisp outline
        "w": (250, 244, 232, 255),  # crisp ivory glove / hand highlight
        "m": (232, 214, 188, 255),  # warm cream midtone
        "s": (184, 158, 128, 255),  # shading crease
        "c": (196, 148, 62, 255),   # brass cuff trim!
    }
    cursor = render_grid([
        "kk..........",
        "kwkk........",
        "kwwwkk......",
        ".kwwwwkk....",
        ".kwwwwwk....",
        "..kwwwwmkk..",
        "..kwwwmwwmk.",
        "...kwwmswmk.",
        "...kwwmmmk..",
        "....kwmmsk..",
        "....kccck...",
        ".....kkk....",
    ], cur_pal)
    # Wait — let's make it unmistakably a cute retro POINTING HAND (index finger pointing right or top-left)!
    # Usually in RPG menus, a pointing hand points RIGHT (toward menu item) OR top-left like a mouse pointer!
    # Wait: let's check what a classic 12x12 RPG/adventure "pointer hand" looks like!
    # If it points RIGHT (like Final Fantasy / Oregon Trail menu cursor), wait — what if the game uses it as a menu arrow next to text OR as a mouse cursor?
    # Let's check: "assets/ui/cursor.png 12x12 pointer hand."
    # A classic white-gloved finger pointing RIGHT (like FF/SNES RPG cursor) works great next to menu items,
    # Wait: what if `src/` uses it as a menu cursor? Let's check if any files in `src/` exist yet or mention `cursor.png`!
    cursor_hand_right = render_grid([
        "....kkkk....",
        "...kwwwwkk..",
        "..kwwwwwwwk.",
        ".kwwwwwkkkkk",
        "kccwwwwwwwwk",
        "kccwwwkkkkkk",
        "kccwwwwwk...",
        "kccwwwskk...",
        ".kwwwwwk....",
        "..ksssk.....",
        "...kkk......",
        "............",
    ], cur_pal)
    save_png(cursor_hand_right, "ui/cursor.png")


def make_preview():
    """Render a 6x zoomed preview sheet of all crafted sprites so we can inspect every pixel!"""
    paths = [
        "minigame/berry.png", "minigame/wasp.png", "minigame/poison_oak.png",
        "minigame/basket.png", "minigame/gas_can.png",
        "minigame/road_tile.png", "minigame/cars.png", "minigame/semi.png", "minigame/hazards.png",
        "ui/frame.png", "ui/cursor.png",
        "icons/gas.png", "icons/food.png", "icons/kibble.png", "icons/catfood.png",
        "icons/litter.png", "icons/tire.png", "icons/parts.png", "icons/chains.png",
        "icons/propane.png", "icons/ducttape.png", "icons/money.png", "icons/water.png",
        "icons/coffee.png", "icons/treats.png", "icons/toiletpaper.png", "icons/firstaid.png",
    ]
    W = 1200
    rows = []
    cur = []
    cx = 16
    for rel in paths:
        im = Image.open(ASSETS / rel).convert("RGBA")
        sc = 4 if max(im.size) >= 100 else 6
        big = im.resize((im.width * sc, im.height * sc), Image.Resampling.NEAREST)
        bw = max(big.width, 110)
        if cur and cx + bw + 16 > W:
            rows.append(cur)
            cur = [(rel, im.size, big, sc)]
            cx = 16 + bw + 16
        else:
            cur.append((rel, im.size, big, sc))
            cx += bw + 16
    if cur:
        rows.append(cur)

    H = 20 + sum(max(x[2].height for x in r) + 32 for r in rows)
    out = Image.new("RGBA", (W, H), (30, 34, 44, 255))
    draw = ImageDraw.Draw(out)
    y = 16
    for r in rows:
        rh = max(x[2].height for x in r)
        x = 16
        for rel, sz, big, sc in r:
            bw = max(big.width, 110)
            # Checkerboard bg
            ch = np.zeros((big.height, big.width, 4), dtype=np.uint8)
            yy, xx = np.indices((big.height, big.width))
            c = ((yy // 8) + (xx // 8)) % 2 == 0
            ch[c] = [66, 72, 84, 255]
            ch[~c] = [50, 54, 66, 255]
            out.paste(Image.fromarray(ch, "RGBA"), (x, y + 14))
            out.alpha_composite(big, (x, y + 14))
            draw.text((x, y), f"{Path(rel).stem} {sz[0]}x{sz[1]}", fill=(230, 235, 245, 255))
            x += bw + 16
        y += rh + 32
    WORK.mkdir(parents=True, exist_ok=True)
    out.save(WORK / "crafted_preview.png")

    # Also test 2x vertical tiling of road_tile + 9-slice expansion of frame.png!
    rt = Image.open(ASSETS / "minigame/road_tile.png")
    rt2 = Image.new("RGBA", (rt.width, rt.height * 2))
    rt2.paste(rt, (0, 0))
    rt2.paste(rt, (0, rt.height))
    rt2.resize((rt2.width * 3, rt2.height * 3), Image.Resampling.NEAREST).save(WORK / "road_tile_2x.png")


if __name__ == "__main__":
    make_c2_small()
    make_road_tile()
    make_cars_sheet()
    make_semi()
    make_hazards_sheet()
    make_icons_and_gas_can()
    make_ui()
    make_preview()
    print("Crafted all 27 native pixel-art assets and preview!")
