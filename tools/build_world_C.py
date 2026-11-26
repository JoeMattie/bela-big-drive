#!/usr/bin/env python3
"""Batch processor & verifier for all Section C art (biomes, minigames, icons, UI).
Handles raw image curation, surgical seamless-tiling fixes, bramble outline cleanup,
bramble_ripe berry stamping, full contract verification, and 3x contact sheet generation.
"""

import math
import shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

from pixelize_C import (
    REPO_ROOT,
    WORK_DIR,
    chroma_key_magenta,
    downscale_rgba_clean,
    dp_quilt_horizontal,
    clean_stray_specks,
    ensure_bottom_solid,
    process_biome,
    process_opaque_scene,
    process_sprite,
    make_biome_preview,
    verify_file,
    build_contact_sheet,
    quantize_rgba,
)

BRAIN_DIR = Path("/Users/joe/.gemini/antigravity-cli/brain/48dae3c4-cf72-46c3-ab6f-7e1ea433408d")
RAW_DIR = WORK_DIR / "raw"
ASSETS = REPO_ROOT / "assets"

BIOMES = ["coast", "city", "pass", "valley", "forest", "oregon", "oregon_coast", "portland"]
CRAFTED_NEAR = {"valley", "forest", "oregon_coast"}


def get_raw(prefix: str, pattern: str | None = None) -> Path | None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    if pattern:
        matches = sorted(BRAIN_DIR.glob(pattern), key=lambda x: x.stat().st_mtime)
        if matches:
            dst = RAW_DIR / f"{prefix}.jpg"
            shutil.copy2(matches[-1], dst)
            return dst
    matches = sorted(BRAIN_DIR.glob(f"{prefix}*.jpg"), key=lambda x: x.stat().st_mtime)
    if not matches:
        p = RAW_DIR / f"{prefix}.jpg"
        return p if p.exists() else None
    chosen = matches[-1]
    dst = RAW_DIR / f"{prefix}.jpg"
    shutil.copy2(chosen, dst)
    return dst


def process_oregon_coast_far(raw_path: Path, out_path: Path) -> None:
    """Process oregon_coast_far so the right headland slopes organically down into the
    Pacific Ocean horizon before x=480, creating a 100% seamless wrap with open ocean at x=0!
    """
    im = Image.open(raw_path).convert("RGBA")
    keyed = chroma_key_magenta(im, tol=84.0, flood_only=True)
    arr = np.array(keyed)
    h, w, _ = arr.shape
    # Trim tiny side borders
    arr = arr[:, int(w * 0.01):int(w * 0.99), :]

    row_cov = (arr[:, :, 3] > 127).mean(axis=1)
    content_rows = np.where(row_cov > 0.015)[0]
    y_top = max(0, int(content_rows[0]) - 2)
    y_bot = min(arr.shape[0], int(content_rows[-1]) + 1)
    cropped = Image.fromarray(arr[y_top:y_bot, :, :], "RGBA")

    target_w, target_h = 480, 110
    top_margin = 14
    work_h = target_h - top_margin
    scaled = downscale_rgba_clean(cropped, target_w, work_h)
    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    canvas.paste(scaled, (0, top_margin))

    a = np.array(canvas, dtype=np.uint8)
    # Find the calm ocean horizon y on the left edge (x=0..40)
    left_alpha = a[:, 0:40, 3] > 127
    horizon_ys = [int(np.where(left_alpha[:, x])[0][0]) for x in range(40) if left_alpha[:, x].any()]
    ocean_y = int(np.median(horizon_ys))

    # Build a clean ocean reference column strip from x=4..44 (calm misty ocean bands)
    ocean_ref = a[:, 4:44, :].copy()

    # Smoothly taper the right headland (x = 408..479) down into a natural sloping coastal cape
    # that reaches ocean_y cleanly by x = 468, leaving x = 468..479 as pure matching open ocean!
    taper_start = 405
    taper_end = 466
    rng = np.random.default_rng(77)
    for x in range(taper_start, target_w):
        # Reference calm ocean column
        ref_x = (x - taper_start) % ocean_ref.shape[1]
        if x >= taper_end:
            # Pure open ocean matching left edge!
            a[:, x, :] = ocean_ref[:, ref_x, :]
        else:
            # Smooth S-curve coastal bluff slope descending from headland top down to ocean_y
            t = (x - taper_start) / float(taper_end - taper_start)
            smooth_t = t * t * (3 - 2 * t)
            # Current top of headland at column x
            ys = np.where(a[:, x, 3] > 127)[0]
            cur_top = int(ys[0]) if len(ys) > 0 else ocean_y
            # Target cliff silhouette y (with tiny rocky crag variation)
            crag = int(round(math.sin(x * 0.45) * 1.4)) if t < 0.85 else 0
            new_top = int(round(cur_top + (ocean_y - cur_top) * smooth_t)) + crag
            new_top = min(ocean_y, max(cur_top, new_top))

            # Clear sky above new_top
            a[:new_top, x, :] = [0, 0, 0, 0]
            # Below ocean_y, blend smoothly toward open ocean as t -> 1
            if t > 0.45:
                blend_start = int(ocean_y + (target_h - ocean_y) * (1.0 - (t - 0.45) / 0.55))
                for y in range(max(ocean_y, blend_start), target_h):
                    # Crisp pixel dithering transition (no alpha blur!)
                    if ((x + y) % 2 == 0 and t > 0.65) or t > 0.82:
                        a[y, x, :] = ocean_ref[y, ref_x, :]
            # Subtle white sea-foam pixels right along the cape base at ocean_y + 12..18
            if 0.65 < t < 0.92 and rng.random() < 0.4:
                fy = min(target_h - 4, ocean_y + int(16 * (1.0 - (t - 0.65) / 0.3)))
                a[fy, x, :] = [188, 206, 214, 255]

    out_im = clean_stray_specks(Image.fromarray(a, "RGBA"), min_component=4)
    out_im = ensure_bottom_solid(out_im)
    final = quantize_rgba(out_im, max_colors=36, opaque=False)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(out_path)
    print(f"Processed biomes/oregon_coast_far.png (sloped headland wrap)")


def process_custom_crop_biome(
    raw_path: Path,
    out_path: Path,
    target_w: int,
    target_h: int,
    left_pct: float,
    right_pct: float,
    max_colors: int = 36,
    overlap: int = 56,
    top_margin: int = 8,
) -> None:
    """Process a biome with custom asymmetric left/right crop percentages before DP tiling."""
    im = Image.open(raw_path).convert("RGBA")
    keyed = chroma_key_magenta(im, tol=84.0, flood_only=True)
    arr = np.array(keyed)
    h, w, _ = arr.shape
    x0 = int(w * left_pct)
    x1 = int(w * (1.0 - right_pct))
    arr = arr[:, x0:x1, :]

    row_cov = (arr[:, :, 3] > 127).mean(axis=1)
    content_rows = np.where(row_cov > 0.015)[0]
    y_top = max(0, int(content_rows[0]) - 2)
    y_bot = min(arr.shape[0], int(content_rows[-1]) + 1)
    cropped = Image.fromarray(arr[y_top:y_bot, :, :], "RGBA")

    work_h = target_h - top_margin
    scaled = downscale_rgba_clean(cropped, target_w + overlap, work_h)
    canvas = Image.new("RGBA", (target_w + overlap, target_h), (0, 0, 0, 0))
    canvas.paste(scaled, (0, top_margin))

    tiled = dp_quilt_horizontal(canvas, target_w)
    tiled = clean_stray_specks(tiled, min_component=4)
    tiled = ensure_bottom_solid(tiled)
    final = quantize_rgba(tiled, max_colors=max_colors, opaque=False)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(out_path)


def clean_bramble_and_make_ripe(bramble_raw: Path) -> None:
    """Process bramble.png with zero dark-purple edge tint, then stamp ripe blackberries
    onto an exact copy to create bramble_ripe.png!
    """
    im = process_sprite(bramble_raw, ASSETS / "minigame/bramble.png", 48, 40, max_colors=18, tol=86.0, pad=1)
    arr = np.array(im, dtype=np.uint8)
    mask = arr[:, :, 3] == 255
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    # Replace any residual dark purplish outline pixels (from magenta-green downscale mix)
    # with crisp deep forest-green outline (16, 36, 18)!
    purplish = mask & (r > g + 4) & (b > g + 4) & ((r + b) < 190)
    arr[purplish, :3] = [18, 38, 20]
    # Also clean any slightly brownish-purple border specks touching transparent
    clean_bramble = quantize_rgba(Image.fromarray(arr, "RGBA"), max_colors=18, opaque=False)
    clean_bramble.save(ASSETS / "minigame/bramble.png")

    # Now build bramble_ripe.png directly from clean_bramble!
    arr2 = np.array(clean_bramble, dtype=np.uint8)
    mask2 = arr2[:, :, 3] == 255
    h, w, _ = arr2.shape

    c_out = (22, 12, 34, 255)
    c_drk = (48, 22, 74, 255)
    c_mid = (84, 38, 122, 255)
    c_hi  = (196, 156, 232, 255)

    centers = [
        (11, 14), (18, 10), (26, 9), (34, 13),
        (9, 22), (16, 19), (23, 17), (31, 18), (38, 21),
        (14, 27), (22, 25), (29, 26), (35, 28),
        (20, 31), (27, 30),
    ]
    out = arr2.copy()
    for cx, cy in centers:
        if 3 <= cx < w - 3 and 3 <= cy < h - 3:
            if mask2[cy - 2:cy + 3, cx - 2:cx + 3].mean() >= 0.85:
                stamp = [
                    (0, -1, c_out), (1, -1, c_out),
                    (-1, 0, c_out), (0, 0, c_hi),  (1, 0, c_mid), (2, 0, c_out),
                    (-1, 1, c_out), (0, 1, c_mid), (1, 1, c_drk), (2, 1, c_out),
                    (0, 2, c_out),  (1, 2, c_out),
                ]
                for dx, dy, col in stamp:
                    if mask2[cy + dy, cx + dx]:
                        out[cy + dy, cx + dx] = col

    ripe = quantize_rgba(Image.fromarray(out, "RGBA"), max_colors=24, opaque=False)
    ripe.save(ASSETS / "minigame/bramble_ripe.png")
    print("Cleaned minigame/bramble.png & generated bramble_ripe.png")


def run():
    # 1. Re-process the 3 _far biomes with surgical seam fixes!
    v_raw = get_raw("valley_far_v3", "valley_far_v3*.jpg")
    if v_raw:
        process_custom_crop_biome(
            v_raw, ASSETS / "biomes/valley_far.png",
            480, 110, left_pct=0.09, right_pct=0.09, max_colors=34, overlap=56, top_margin=16,
        )
        print("Re-processed biomes/valley_far.png (clean horizontal fields from v3)")

    oc_raw = get_raw("oregon_coast_far_v3", "oregon_coast_far_v3*.jpg")
    if oc_raw:
        process_oregon_coast_far(oc_raw, ASSETS / "biomes/oregon_coast_far.png")

    p_raw = get_raw("portland_far", "portland_far*.jpg")
    if p_raw:
        process_custom_crop_biome(
            p_raw, ASSETS / "biomes/portland_far.png",
            480, 110, left_pct=0.01, right_pct=0.09, max_colors=36, overlap=52, top_margin=6,
        )
        print("Re-processed biomes/portland_far.png (trimmed right edge skyscraper)")

    # 2. Clean bramble purple outline + regenerate bramble_ripe!
    br_raw = get_raw("bramble", "bramble_*.jpg")
    if br_raw:
        clean_bramble_and_make_ripe(br_raw)

    # 3. Rebuild previews!
    make_biome_preview(BIOMES, WORK_DIR / "biomes_2x_preview.png")

    b1 = Image.open(ASSETS / "minigame/bramble.png").resize((192, 160), Image.Resampling.NEAREST)
    b2 = Image.open(ASSETS / "minigame/bramble_ripe.png").resize((192, 160), Image.Resampling.NEAREST)
    br_strip = Image.new("RGBA", (440, 180), (60, 80, 56, 255))
    br_strip.alpha_composite(b1, (16, 10))
    br_strip.alpha_composite(b2, (228, 10))
    br_strip.save(WORK_DIR / "bramble_preview.png")

    # 4. Complete Section C contract list (all 47 assets!)
    contract = []
    for b in BIOMES:
        contract.append((ASSETS / f"biomes/{b}_far.png", 480, 110, False, 48))
        contract.append((ASSETS / f"biomes/{b}_near.png", 480, 70, False, 48))
    contract += [
        (ASSETS / "minigame/forage_bg.png", 480, 300, True, 48),
        (ASSETS / "minigame/bramble.png", 48, 40, False, 24),
        (ASSETS / "minigame/bramble_ripe.png", 48, 40, False, 24),
        (ASSETS / "minigame/berry.png", 8, 8, False, 24),
        (ASSETS / "minigame/wasp.png", 32, 16, False, 24),
        (ASSETS / "minigame/poison_oak.png", 24, 24, False, 24),
        (ASSETS / "minigame/basket.png", 16, 16, False, 24),
        (ASSETS / "minigame/road_tile.png", 160, 64, True, 48),
        (ASSETS / "minigame/cars.png", 144, 44, False, 48),
        (ASSETS / "minigame/semi.png", 32, 112, False, 24),
        (ASSETS / "minigame/hazards.png", 144, 24, False, 48),
        (ASSETS / "minigame/gas_can.png", 16, 16, False, 24),
        (ASSETS / "minigame/reststop_bg.png", 480, 300, True, 48),
        (ASSETS / "ui/frame.png", 24, 24, False, 24),
        (ASSETS / "ui/cursor.png", 12, 12, False, 24),
    ]
    for ic in [
        "gas", "food", "kibble", "catfood", "litter", "tire", "parts", "chains",
        "propane", "ducttape", "money", "water", "coffee", "treats", "toiletpaper", "firstaid",
    ]:
        contract.append((ASSETS / f"icons/{ic}.png", 16, 16, False, 24))

    print("\n=== FULL SECTION C VERIFICATION (47 ASSETS) ===")
    ok = 0
    for p, w, h, opq, mc in contract:
        errs = verify_file(p, w, h, opq, mc)
        im = Image.open(p) if p.exists() else None
        arr = np.array(im) if im else None
        ncols = len(np.unique(arr[arr[:, :, 3] == 255, :3].reshape(-1, 3), axis=0)) if arr is not None else 0
        status = "OK" if not errs else "FAIL: " + "; ".join(errs)
        if not errs:
            ok += 1
        print(f"  {str(p.relative_to(REPO_ROOT)):42s} {w:3d}x{h:<3d} colors={ncols:2d}/{mc:2d}  {status}")
    print(f"\nTOTAL PASSED: {ok}/{len(contract)}")

    # 5. Build official 3x contact sheet at .art-work/art-world/contact_sheet.png!
    build_contact_sheet([c[0] for c in contract], WORK_DIR / "contact_sheet.png", scale=3)
    print(f"Saved contact sheet: {WORK_DIR / 'contact_sheet.png'}")


if __name__ == "__main__":
    run()
