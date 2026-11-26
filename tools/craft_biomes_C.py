#!/usr/bin/env python3
"""Hand-crafted retro VGA pixel-art generator for the 3 remaining seamless _near biome layers:
- assets/biomes/valley_near.png (480x70)
- assets/biomes/forest_near.png (480x70)
- assets/biomes/oregon_coast_near.png (480x70)
Every drawing helper wraps modulo W=480 so horizontal tiling is 100% mathematically seamless!
"""

import math
from pathlib import Path
import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS = REPO_ROOT / "assets" / "biomes"


class WrapCanvas:
    """RGBA pixel canvas with automatic horizontal wraparound (x % W)."""

    def __init__(self, w: int = 480, h: int = 70):
        self.w = w
        self.h = h
        self.arr = np.zeros((h, w, 4), dtype=np.uint8)

    def px(self, x: int, y: int, col: tuple[int, int, int, int]):
        if 0 <= y < self.h:
            self.arr[y, x % self.w] = col

    def rect(self, x0: int, y0: int, x1: int, y1: int, col: tuple[int, int, int, int]):
        for y in range(max(0, y0), min(self.h, y1 + 1)):
            for x in range(x0, x1 + 1):
                self.arr[y, x % self.w] = col

    def line(self, x0: int, y0: int, x1: int, y1: int, col: tuple[int, int, int, int]):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(steps + 1):
            t = i / steps
            x = int(round(x0 + (x1 - x0) * t))
            y = int(round(y0 + (y1 - y0) * t))
            self.px(x, y, col)

    def blob(self, cx: int, cy: int, rx: float, ry: float, col: tuple[int, int, int, int],
             rng: np.random.Generator | None = None, rough: float = 0.12):
        for y in range(int(cy - ry - 2), int(cy + ry + 3)):
            if not (0 <= y < self.h):
                continue
            for x in range(int(cx - rx - 2), int(cx + rx + 3)):
                dx = (x - cx) / max(rx, 0.5)
                dy = (y - cy) / max(ry, 0.5)
                d = dx * dx + dy * dy
                jitter = (rng.uniform(-rough, rough) if rng is not None else 0.0)
                if d <= 1.0 + jitter:
                    self.arr[y, x % self.w] = col

    def outline(self, col: tuple[int, int, int, int], max_y: int = 66):
        """Add a crisp 1px dark silhouette outline around opaque regions (top/sides only, not below bottom)."""
        mask = self.arr[:, :, 3] > 127
        h, w = mask.shape
        out = self.arr.copy()
        for y in range(min(h, max_y)):
            for x in range(w):
                if not mask[y, x]:
                    # Check 4-neighbors with horizontal wrap!
                    if (
                        (y > 0 and mask[y - 1, x])
                        or (y < h - 1 and mask[y + 1, x])
                        or mask[y, (x - 1) % w]
                        or mask[y, (x + 1) % w]
                    ):
                        out[y, x] = col
        self.arr = out

    def to_image(self) -> Image.Image:
        return Image.fromarray(self.arr, "RGBA")


def draw_leaf_cluster(c: WrapCanvas, cx: int, cy: int, rx: float, ry: float,
                      cols: tuple, rng: np.random.Generator):
    """Draw a rich 4-tone shaded pixel-art foliage clump (deep shadow -> dark -> mid -> sunlit hi)."""
    c_ol, c_d, c_m, c_l, c_h = cols
    # Silhouette base (dark shadow)
    c.blob(cx, cy + 1, rx, ry, c_d, rng, 0.18)
    # Midtone lobes shifted slightly up-left
    for dx, dy, sr in [(-rx * 0.35, -ry * 0.15, 0.65), (rx * 0.32, -ry * 0.05, 0.62), (0, -ry * 0.3, 0.68)]:
        c.blob(int(cx + dx), int(cy + dy), rx * sr, ry * sr, c_m, rng, 0.22)
    # Lit upper-left leaf clusters
    for dx, dy, sr in [(-rx * 0.35, -ry * 0.35, 0.44), (rx * 0.12, -ry * 0.42, 0.42)]:
        c.blob(int(cx + dx), int(cy + dy), rx * sr, ry * sr, c_l, rng, 0.25)
    # Tiny crisp specular leaf dabs
    for _ in range(int(rx * ry * 0.12)):
        px = int(cx + rng.uniform(-rx * 0.6, rx * 0.35))
        py = int(cy + rng.uniform(-ry * 0.75, -ry * 0.1))
        if 0 <= py < c.h and c.arr[py, px % c.w, 3] > 127:
            c.px(px, py, c_h)


# =============================================================================
# 1. VALLEY_NEAR (480x70) — Central Valley orchards, fence, fruit stand, windmill
# =============================================================================

def make_valley_near():
    rng = np.random.default_rng(101)
    c = WrapCanvas(480, 70)

    # Cohesive warm sun-baked Central Valley VGA palette (~26 colors)
    ol     = (26, 22, 18, 255)
    dirt_d = (122, 92, 54, 255)
    dirt_m = (164, 128, 76, 255)
    dirt_l = (202, 168, 108, 255)
    straw  = (224, 194, 118, 255)
    grs_d  = (78, 96, 38, 255)
    grs_m  = (118, 138, 52, 255)
    grs_l  = (166, 178, 74, 255)
    # Orchard trees (deep almond/citrus green)
    tr_d   = (34, 68, 30, 255)
    tr_m   = (58, 108, 42, 255)
    tr_l   = (98, 152, 58, 255)
    tr_h   = (148, 192, 86, 255)
    bark_d = (68, 44, 26, 255)
    bark_m = (106, 72, 42, 255)
    wood_d = (92, 62, 36, 255)
    wood_m = (138, 98, 58, 255)
    wood_l = (182, 138, 88, 255)
    red_d  = (146, 36, 30, 255)
    red_m  = (204, 58, 44, 255)
    cream  = (236, 228, 206, 255)
    tin_d  = (116, 126, 138, 255)
    tin_m  = (168, 178, 190, 255)
    tin_h  = (216, 224, 232, 255)
    citrus = (242, 154, 38, 255)

    # 1. Background distant orchard row hedge behind fence (low, leaves center open!)
    for tx in [18, 48, 78, 108, 350, 382, 414, 446]:
        # Trunk
        c.rect(tx - 2, 40, tx + 2, 58, bark_d)
        c.rect(tx - 1, 40, tx, 58, bark_m)
        # Lush almond/citrus canopy
        draw_leaf_cluster(c, tx, 30 + (tx % 5) - 2, 17, 13, (ol, tr_d, tr_m, tr_l, tr_h), rng)
        # Scattered ripe oranges/citrus flecks on alternating trees!
        if tx in (48, 108, 382, 446):
            for _ in range(7):
                ox = tx + int(rng.integers(-11, 12))
                oy = 28 + int(rng.integers(-7, 7))
                if 0 <= oy < 70 and c.arr[oy, ox % 480, 3] > 127:
                    c.px(ox, oy, citrus)

    # 2. Classic tall wooden-lattice farm windmill / water pump (x=286, standing tall in open vista!)
    wx = 288
    # Tower A-frame legs
    c.line(wx - 9, 58, wx - 2, 18, wood_d)
    c.line(wx - 8, 58, wx - 1, 18, wood_m)
    c.line(wx + 9, 58, wx + 2, 18, wood_d)
    c.line(wx + 8, 58, wx + 1, 18, wood_l)
    # Cross braces
    for by, hw in [(26, 3), (34, 4), (42, 6), (50, 7)]:
        c.line(wx - hw, by, wx + hw, by, wood_d)
        c.line(wx - hw, by, wx + hw, by + 7, wood_d)
        c.line(wx + hw, by, wx - hw, by + 7, wood_m)
    # Platform & wooden water tank barrel beside windmill
    c.rect(wx - 4, 17, wx + 4, 19, wood_l)
    # Windmill turbine wheel (metal blades)
    wcx, wcy = wx, 13
    for ang_deg in range(0, 360, 30):
        ang = math.radians(ang_deg)
        x2 = int(round(wcx + math.cos(ang) * 9))
        y2 = int(round(wcy + math.sin(ang) * 9))
        c.line(wcx, wcy, x2, y2, tin_m if ang_deg % 60 == 0 else tin_h)
    c.blob(wcx, wcy, 2.2, 2.2, red_m)
    # Tail vane sticking right
    c.line(wcx + 2, wcy, wcx + 13, wcy, tin_d)
    c.rect(wcx + 10, wcy - 3, wcx + 15, wcy + 1, red_m)
    c.rect(wcx + 10, wcy - 3, wcx + 15, wcy - 3, red_d)

    # 3. Charming rustic roadside wooden fruit stand (x=176..226)
    sx0, sx1 = 176, 224
    # Back shadowed interior
    c.rect(sx0 + 3, 39, sx1 - 3, 57, (42, 28, 18, 255))
    # Wooden support posts
    c.rect(sx0 + 2, 37, sx0 + 4, 58, wood_m)
    c.rect(sx1 - 4, 37, sx1 - 2, 58, wood_d)
    # Counter & fruit crates!
    c.rect(sx0 + 1, 47, sx1 - 1, 58, wood_m)
    c.rect(sx0 + 1, 47, sx1 - 1, 48, wood_l)
    for px_line in range(sx0 + 6, sx1, 6):
        c.line(px_line, 49, px_line, 58, wood_d)
    # Crates of oranges, melons, apples on counter
    for cx_b, col_b in [(184, citrus), (194, red_m), (204, grs_l), (214, citrus)]:
        c.rect(cx_b - 3, 44, cx_b + 3, 46, col_b)
        c.px(cx_b - 1, 44, straw)
        c.px(cx_b + 1, 45, col_b)
    # Sloped corrugated tin roof + red/cream striped awning!
    for y in range(30, 38):
        inset = max(0, (36 - y) // 2)
        for x in range(sx0 - 2 + inset, sx1 + 3 - inset):
            c.px(x, y, tin_h if x % 4 == 0 else (tin_d if x % 4 == 3 else tin_m))
    # Striped awning scallops
    for x in range(sx0 - 1, sx1 + 2):
        col_aw = red_m if ((x - sx0) // 4) % 2 == 0 else cream
        c.rect(x, 38, x, 41, col_aw)
        c.px(x, 42, red_d if col_aw == red_m else dirt_l)

    # 4. Silver aluminum irrigation pipe along shoulder (x=124..170 and x=232..276)
    for seg_x0, seg_x1 in [(122, 168), (232, 274)]:
        c.rect(seg_x0, 52, seg_x1, 54, tin_m)
        c.rect(seg_x0, 52, seg_x1, 52, tin_h)
        c.rect(seg_x0, 54, seg_x1, 54, tin_d)
        # Pipe couplings & upright sprinkler risers
        for rx in range(seg_x0 + 8, seg_x1, 16):
            c.rect(rx - 1, 51, rx + 1, 55, tin_d)
            c.line(rx, 46, rx, 51, tin_h)
            c.rect(rx - 1, 45, rx + 1, 46, red_m)

    # 5. Weathered wooden ranch/farm fence running continuously (wraps seamlessly at 480!)
    # Two rails + posts every 20px (480 / 20 = 24 exact intervals!)
    for y_rail in (49, 54):
        c.rect(0, y_rail, 479, y_rail, wood_l)
        c.rect(0, y_rail + 1, 479, y_rail + 1, wood_d)
    for post_x in range(0, 480, 20):
        # Leave gap in front of fruit stand!
        if 172 <= post_x <= 228:
            continue
        c.rect(post_x, 46, post_x + 1, 59, wood_m)
        c.rect(post_x + 2, 46, post_x + 2, 59, wood_d)
        c.px(post_x, 46, wood_l)

    # 6. Continuous dusty golden-grass Central Valley road shoulder (y=57..69, wraps seamlessly!)
    for x in range(480):
        gy = 57 + int(round(math.sin(x * 2 * math.pi / 120) * 1.3 + math.cos(x * 2 * math.pi / 48) * 0.8))
        for y in range(gy, 70):
            if y < gy + 3:
                col = grs_l if (x + y) % 5 == 0 else (grs_m if rng.random() < 0.6 else straw)
            elif y < 64:
                col = dirt_l if rng.random() < 0.35 else (dirt_m if rng.random() < 0.78 else dirt_d)
            else:
                col = dirt_d if rng.random() < 0.45 else dirt_m
            c.px(x, y, col)
        # Dry grass / golden weed tufts sticking up along verge
        if rng.random() < 0.22:
            th = int(rng.integers(2, 6))
            for dy in range(th):
                c.px(x, gy - dy, straw if dy > 1 else grs_d)

    # Low sage/weed shrubs along fence base
    for bx in [10, 88, 134, 248, 326, 428]:
        draw_leaf_cluster(c, bx, 56, 9, 5, (ol, grs_d, grs_m, grs_l, straw), rng)

    # Crisp 1px dark outline above ground
    c.outline(ol, max_y=64)
    im = c.to_image()
    im.save(ASSETS / "valley_near.png")
    print("Crafted biomes/valley_near.png")


# =============================================================================
# 2. FOREST_NEAR (480x70) — NorCal ponderosa pines, redwoods, ferns, mossy rocks
# =============================================================================

def draw_conifer(c: WrapCanvas, cx: int, base_y: int, height: int, half_w: int,
                 cols: tuple, bark: tuple, rng: np.random.Generator, lean: float = 0.0):
    """Draw a detailed layered pixel-art Pacific Northwest conifer (pine/fir/spruce)."""
    c_d, c_m, c_l, c_h = cols
    b_d, b_m, b_l = bark

    # Trunk
    tw = max(2, half_w // 5)
    top_y = base_y - height
    for y in range(top_y + height // 4, base_y + 1):
        lx = int(round(cx + lean * (base_y - y) / max(height, 1)))
        for dx in range(-tw, tw + 1):
            col = b_l if dx == -tw else (b_d if dx >= tw - 1 else b_m)
            c.px(lx + dx, y, col)

    # Tiered boughs from bottom up to spire tip
    tiers = max(5, height // 6)
    for t in range(tiers):
        frac = t / max(tiers - 1, 1)  # 0 at bottom, 1 at top
        ty = int(base_y - 7 - frac * (height - 9))
        tw_tier = max(2, int(round(half_w * (1.0 - frac * 0.88))))
        lx = int(round(cx + lean * (base_y - ty) / max(height, 1)))

        # Drooping layered bough silhouette
        for dy in range(-2, 5):
            y = ty + dy
            if not (0 <= y < c.h):
                continue
            span = int(tw_tier * (0.45 + 0.55 * max(0, (dy + 2) / 5.5)))
            for dx in range(-span, span + 1):
                # Jagged needle tips
                if abs(dx) >= span - 1 and (dx + dy + t) % 2 == 0:
                    continue
                # Lighting: sunlit upper-left tips, deep shadow underneath right
                if dy <= 0 and dx <= span * 0.25:
                    col = c_h if (dy == -2 or (dx < -span * 0.3 and rng.random() < 0.55)) else c_l
                elif dy >= 3 or dx > span * 0.45:
                    col = c_d
                else:
                    col = c_m if rng.random() < 0.72 else c_l
                c.px(lx + dx, y, col)
    # Sharp top spire tip
    tip_x = int(round(cx + lean))
    for dy in range(0, 4):
        c.px(tip_x, top_y + dy, c_h if dy < 2 else c_l)


def make_forest_near():
    rng = np.random.default_rng(202)
    c = WrapCanvas(480, 70)

    ol     = (14, 22, 18, 255)
    # Pine foliage ramp (deep cool NorCal pine + emerald)
    p_d    = (18, 44, 30, 255)
    p_m    = (32, 74, 44, 255)
    p_l    = (56, 114, 58, 255)
    p_h    = (98, 156, 74, 255)
    # Darker background firs for depth!
    bg_d   = (16, 36, 32, 255)
    bg_m   = (26, 58, 46, 255)
    bg_l   = (42, 86, 60, 255)
    bg_h   = (68, 118, 76, 255)
    # Cinnamon redwood/ponderosa bark
    bk_d   = (54, 30, 20, 255)
    bk_m   = (94, 52, 32, 255)
    bk_l   = (134, 78, 46, 255)
    # Ferns & moss
    fn_d   = (34, 78, 32, 255)
    fn_m   = (66, 134, 48, 255)
    fn_l   = (122, 184, 72, 255)
    # Granite boulders
    rk_d   = (64, 70, 76, 255)
    rk_m   = (106, 114, 122, 255)
    rk_l   = (156, 164, 172, 255)
    # Pine needle earth
    er_d   = (48, 34, 22, 255)
    er_m   = (78, 56, 36, 255)
    er_l   = (112, 82, 52, 255)

    # 1. Back-row slightly muted conifers framing left (0..165) & right (315..480),
    # leaving center (170..310) open so Mt Shasta towers majestically behind!
    for cx, h, hw in [
        (12, 52, 16), (48, 58, 18), (92, 48, 15), (138, 44, 14),
        (332, 46, 14), (376, 56, 18), (424, 50, 16), (464, 55, 17),
    ]:
        draw_conifer(c, cx, 61, h, hw, (bg_d, bg_m, bg_l, bg_h), (bk_d, bk_m, bk_l), rng)

    # 2. Foreground hero ponderosa pines & tall redwood trunks (with rich warm bark!)
    for cx, h, hw in [
        (28, 64, 19), (72, 62, 17), (118, 54, 16), (156, 38, 13),
        (316, 36, 12), (354, 62, 18), (402, 65, 20), (446, 58, 17),
    ]:
        draw_conifer(c, cx, 63, h, hw, (p_d, p_m, p_l, p_h), (bk_d, bk_m, bk_l), rng)

    # 3. Fallen mossy redwood log in the center clearing (x=214..266, low so Shasta stays clear!)
    for x in range(214, 266):
        ly = 56 + int(round(math.sin((x - 214) * 0.08) * 1.0))
        c.px(x, ly - 1, fn_m if x % 3 != 0 else fn_l)  # lush moss top!
        c.px(x, ly, bk_l if x % 4 != 0 else fn_d)
        c.px(x, ly + 1, bk_m)
        c.px(x, ly + 2, bk_m if x % 3 != 0 else bk_d)
        c.px(x, ly + 3, bk_d)
    # Cut log end ring
    c.blob(214, 57, 2.5, 2.5, er_l)
    c.px(214, 57, bk_d)

    # 4. Mossy granite boulders scattered along forest shoulder
    for rx, ry, rrx, rry in [(178, 58, 9, 5), (288, 59, 10, 6), (62, 60, 8, 5), (390, 59, 9, 5)]:
        c.blob(rx, ry, rrx, rry, rk_d, rng, 0.15)
        c.blob(rx - 2, ry - 1, rrx * 0.72, rry * 0.72, rk_m, rng, 0.15)
        c.blob(rx - 3, ry - 2, rrx * 0.42, rry * 0.42, rk_l, rng, 0.15)
        # Moss cap on boulder
        c.blob(rx - 1, ry - rry + 1, rrx * 0.55, 1.8, fn_m, rng, 0.2)

    # 5. Sword-fern bursts along the whole forest floor!
    for fx in range(4, 480, 18):
        fy = 59 + (fx % 3)
        for ang_d in (-140, -110, -70, -40, -155, -25):
            ang = math.radians(ang_d)
            flen = 6 + (fx % 4)
            x2 = int(round(fx + math.cos(ang) * flen))
            y2 = int(round(fy + math.sin(ang) * flen))
            c.line(fx, fy, x2, y2, fn_m if abs(ang_d + 90) < 40 else fn_d)
            c.px(x2, y2, fn_l)

    # 6. Continuous mossy pine-needle & dark forest-earth shoulder (y=60..69)
    for x in range(480):
        gy = 59 + int(round(math.sin(x * 2 * math.pi / 96) * 1.2))
        for y in range(gy, 70):
            if y < gy + 3:
                col = fn_m if rng.random() < 0.35 else (fn_d if rng.random() < 0.65 else p_d)
            elif y < 65:
                col = er_l if rng.random() < 0.25 else (er_m if rng.random() < 0.7 else er_d)
            else:
                col = er_d if rng.random() < 0.55 else er_m
            c.px(x, y, col)

    c.outline(ol, max_y=64)
    im = c.to_image()
    im.save(ASSETS / "forest_near.png")
    print("Crafted biomes/forest_near.png")


# =============================================================================
# 3. OREGON_COAST_NEAR (480x70) — Wind-swept Sitka spruce, basalt rocks,
#    driftwood, Hwy 101 wooden guardrail, coastal ferns
# =============================================================================

def make_oregon_coast_near():
    rng = np.random.default_rng(303)
    c = WrapCanvas(480, 70)

    ol     = (16, 20, 24, 255)
    # Sitka spruce (cool misty Pacific blue-emerald!)
    sp_d   = (20, 46, 42, 255)
    sp_m   = (36, 78, 64, 255)
    sp_l   = (62, 118, 86, 255)
    sp_h   = (104, 158, 108, 255)
    # Bark
    bk_d   = (48, 38, 34, 255)
    bk_m   = (82, 64, 54, 255)
    bk_l   = (114, 92, 76, 255)
    # Wet dark basalt cliffs & rocks
    bs_d   = (34, 38, 46, 255)
    bs_m   = (58, 66, 78, 255)
    bs_l   = (92, 102, 116, 255)
    bs_h   = (132, 144, 158, 255)
    # Bleached silver driftwood
    dw_d   = (112, 112, 108, 255)
    dw_m   = (158, 158, 150, 255)
    dw_l   = (204, 202, 192, 255)
    # Coastal moss/ferns/salal
    ms_d   = (36, 76, 38, 255)
    ms_m   = (72, 128, 56, 255)
    ms_l   = (124, 178, 76, 255)
    # Weathered Hwy 101 wooden guardrail
    gd_d   = (72, 56, 42, 255)
    gd_m   = (114, 92, 70, 255)
    gd_l   = (158, 134, 106, 255)
    amber  = (238, 186, 52, 255)  # reflector dot on guardrail!

    # 1. Wind-swept Sitka spruce trees leaning gracefully RIGHT from ocean breeze!
    # Clustered on left (18..112) and right (360..456), leaving huge open ocean window (125..345)!
    for cx, h, hw, lean in [
        (26, 58, 17, 10.0), (68, 64, 19, 12.0), (104, 44, 13, 8.0),
        (372, 48, 14, 9.0), (412, 62, 18, 12.0), (452, 54, 16, 10.0),
    ]:
        draw_conifer(c, cx, 60, h, hw, (sp_d, sp_m, sp_l, sp_h), (bk_d, bk_m, bk_l), rng, lean=lean)

    # 2. Highway 101 weathered timber guardrail across the scenic cliff overlook (x=148..296)
    # Posts
    for px in range(152, 296, 18):
        c.rect(px, 47, px + 2, 60, gd_m)
        c.rect(px + 2, 47, px + 2, 60, gd_d)
        c.px(px, 47, gd_l)
        # Yellow roadside reflector button on every other post!
        if (px - 152) % 36 == 0:
            c.px(px + 1, 50, amber)
    # Thick horizontal timber beam
    c.rect(148, 49, 296, 52, gd_m)
    c.rect(148, 49, 296, 49, gd_l)
    c.rect(148, 52, 296, 52, gd_d)

    # 3. Jagged dark wet basalt boulders & coastal outcrops
    for rx, ry, rrx, rry in [
        (124, 57, 14, 9), (140, 59, 10, 6), (314, 56, 16, 10),
        (338, 58, 12, 7), (468, 58, 13, 8), (8, 59, 10, 6),
    ]:
        c.blob(rx, ry, rrx, rry, bs_d, rng, 0.22)
        c.blob(rx - 2, ry - 2, rrx * 0.72, rry * 0.72, bs_m, rng, 0.22)
        c.blob(rx - 4, ry - 3, rrx * 0.42, rry * 0.40, bs_l, rng, 0.22)
        # Wet highlight & bright coastal moss patch
        c.px(rx - 4, ry - 4, bs_h)
        c.blob(rx + 1, ry - rry + 2, rrx * 0.4, 2.0, ms_m, rng, 0.2)

    # 4. Bleached silver driftwood logs tucked beside rocks (x=298..348 and x=80..118)
    for x0, x1, y0 in [(82, 116, 58), (274, 308, 59)]:
        for x in range(x0, x1):
            yy = y0 + int(round(math.sin((x - x0) * 0.14) * 1.1))
            c.px(x, yy, dw_l)
            c.px(x, yy + 1, dw_m)
            c.px(x, yy + 2, dw_d)
        # Forked gnarled branch stub
        c.line(x0 + 6, y0, x0 + 2, y0 - 5, dw_l)
        c.line(x0 + 7, y0, x0 + 3, y0 - 4, dw_d)

    # 5. Coastal salal shrubs & feathery fern clusters
    for bx in [44, 132, 224, 352, 434]:
        draw_leaf_cluster(c, bx, 57, 10, 6, (ol, sp_d, ms_d, ms_m, ms_l), rng)

    # 6. Continuous wet rocky cliff-edge grass & basalt shoulder (y=59..69)
    for x in range(480):
        gy = 59 + int(round(math.sin(x * 2 * math.pi / 80) * 1.3 + math.cos(x * 2 * math.pi / 40) * 0.7))
        for y in range(gy, 70):
            if y < gy + 3:
                col = ms_l if rng.random() < 0.22 else (ms_m if rng.random() < 0.6 else ms_d)
            elif y < 65:
                col = bs_l if rng.random() < 0.18 else (bs_m if rng.random() < 0.55 else bs_d)
            else:
                col = bs_d if rng.random() < 0.7 else bs_m
            c.px(x, y, col)
        # Coastal grass blades
        if rng.random() < 0.24:
            for dy in range(int(rng.integers(2, 5))):
                c.px(x, gy - dy, ms_l if dy > 1 else ms_d)

    c.outline(ol, max_y=64)
    im = c.to_image()
    im.save(ASSETS / "oregon_coast_near.png")
    print("Crafted biomes/oregon_coast_near.png")


if __name__ == "__main__":
    make_valley_near()
    make_forest_near()
    make_oregon_coast_near()
    print("All 3 crafted _near biomes complete!")
