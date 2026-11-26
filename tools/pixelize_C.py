#!/usr/bin/env python3
"""Pixel-art post-processing, seamless tiling, verification, and contact sheet tool
for Bela's Big Drive (Section C: Biomes, Minigames, Icons, UI).
"""

import argparse
import os
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent
WORK_DIR = REPO_ROOT / ".art-work" / "art-world"


def detect_sky_color(arr: np.ndarray) -> np.ndarray:
    """Sample top border pixels to detect actual generated chroma-key sky color."""
    top = arr[0:6, :, :3].reshape(-1, 3).astype(np.float32)
    # Prefer pixels close to magenta (255, 0, 255)
    mag = np.array([255.0, 0.0, 255.0])
    dists = np.linalg.norm(top - mag, axis=1)
    close = top[dists < 110]
    if len(close) > 20:
        return np.median(close, axis=0)
    # Fallback: median of top row
    return np.median(arr[0:2, :, :3].reshape(-1, 3), axis=0)


def chroma_key_magenta(img: Image.Image, tol: float = 85.0, flood_only: bool = False) -> Image.Image:
    """Remove solid magenta background cleanly via flood-fill + interior pure-magenta cleanup.
    Returns RGBA image with alpha strictly 0 or 255.
    """
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.uint8)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3].astype(np.float32)

    sky = detect_sky_color(arr)
    mag = np.array([255.0, 0.0, 255.0], dtype=np.float32)

    dist_sky = np.linalg.norm(rgb - sky, axis=2)
    dist_mag = np.linalg.norm(rgb - mag, axis=2)
    # Also detect pinkish/magenta tint where R and B are much higher than G
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    is_magenta_hue = (r > 150) & (b > 150) & (g < 120) & ((r + b) * 0.5 - g > 70)

    candidate = (dist_sky < tol) | (dist_mag < tol) | is_magenta_hue

    if flood_only:
        # Flood fill from top border and top-half side borders
        bg = np.zeros((h, w), dtype=bool)
        stack = []
        for x in range(w):
            if candidate[0, x]:
                bg[0, x] = True
                stack.append((0, x))
        for y in range(h // 2):
            if candidate[y, 0] and not bg[y, 0]:
                bg[y, 0] = True
                stack.append((y, 0))
            if candidate[y, w - 1] and not bg[y, w - 1]:
                bg[y, w - 1] = True
                stack.append((y, w - 1))
        while stack:
            cy, cx = stack.pop()
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and candidate[ny, nx]:
                    bg[ny, nx] = True
                    stack.append((ny, nx))
        # Also punch out obvious pure-magenta interior holes (between tree limbs, bridge trusses)
        strict_mag = (dist_mag < 55) | ((r > 205) & (b > 205) & (g < 65))
        bg |= strict_mag
    else:
        bg = candidate

    # 1-pass magenta fringe erosion on boundary pixels touching bg
    padded = np.pad(bg, 1, mode="constant", constant_values=False)
    touches_bg = (
        padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:]
    )
    fringe = (~bg) & touches_bg & (
        (dist_sky < tol * 1.45) | (dist_mag < tol * 1.45) | ((r > 130) & (b > 130) & (g < 140) & ((r + b) * 0.5 - g > 45))
    )
    bg |= fringe

    out = arr.copy()
    out[bg, 3] = 0
    out[~bg, 3] = 255
    out[bg, :3] = 0
    return Image.fromarray(out, "RGBA")


def bleed_opaque_edges(arr: np.ndarray, iterations: int = 8) -> np.ndarray:
    """Bleed RGB values from opaque pixels into adjacent transparent pixels so
    BOX downscaling never blends black/magenta into silhouette edges.
    """
    rgb = arr[:, :, :3].copy()
    valid = arr[:, :, 3] > 127
    for _ in range(iterations):
        if valid.all():
            break
        # Average valid 4-neighbors into invalid pixels
        acc = np.zeros_like(rgb, dtype=np.float32)
        cnt = np.zeros(valid.shape, dtype=np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            s_valid = np.zeros_like(valid)
            s_rgb = np.zeros_like(rgb, dtype=np.float32)
            y0_s, y1_s = max(0, -dy), valid.shape[0] - max(0, dy)
            x0_s, x1_s = max(0, -dx), valid.shape[1] - max(0, dx)
            y0_d, y1_d = max(0, dy), valid.shape[0] - max(0, -dy)
            x0_d, x1_d = max(0, dx), valid.shape[1] - max(0, -dx)
            s_valid[y0_d:y1_d, x0_d:x1_d] = valid[y0_s:y1_s, x0_s:x1_s]
            s_rgb[y0_d:y1_d, x0_d:x1_d] = rgb[y0_s:y1_s, x0_s:x1_s]
            acc += s_rgb * s_valid[:, :, None]
            cnt += s_valid
        fill = (~valid) & (cnt > 0)
        if not fill.any():
            break
        rgb[fill] = np.clip(acc[fill] / cnt[fill, None], 0, 255).astype(np.uint8)
        valid |= fill
    out = arr.copy()
    out[:, :, :3] = rgb
    return out


def downscale_rgba_clean(img: Image.Image, target_w: int, target_h: int, alpha_thresh: int = 120) -> Image.Image:
    """Downscale RGBA image to exact pixel-art dimensions without edge halos."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    bled = bleed_opaque_edges(arr, iterations=12)
    rgb_im = Image.fromarray(bled[:, :, :3], "RGB").resize((target_w, target_h), Image.Resampling.BOX)
    alpha_im = Image.fromarray(arr[:, :, 3], "L").resize((target_w, target_h), Image.Resampling.BOX)

    rgb_arr = np.array(rgb_im, dtype=np.uint8)
    a_arr = np.array(alpha_im, dtype=np.uint8)
    mask = a_arr >= alpha_thresh

    out = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    out[:, :, :3] = rgb_arr
    out[:, :, 3] = np.where(mask, 255, 0)
    out[~mask, :3] = 0
    return Image.fromarray(out, "RGBA")


def quantize_rgba(img: Image.Image, max_colors: int = 32, opaque: bool = False) -> Image.Image:
    """Quantize opaque pixels cleanly to <= max_colors with MEDIANCUT, no dither."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    if opaque:
        rgb_im = Image.fromarray(arr[:, :, :3], "RGB")
        q = rgb_im.quantize(colors=max_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        out_rgb = np.array(q.convert("RGB"), dtype=np.uint8)
        out = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
        out[:, :, :3] = out_rgb
        out[:, :, 3] = 255
        return Image.fromarray(out, "RGBA")

    mask = arr[:, :, 3] > 127
    if not mask.any():
        return Image.fromarray(np.zeros_like(arr), "RGBA")

    # Pack only opaque pixels into a 1D strip to build an exact palette without transparent pollution
    opaque_pixels = arr[mask, :3]
    n = len(opaque_pixels)
    strip = Image.fromarray(opaque_pixels.reshape(1, n, 3), "RGB")
    q_strip = strip.quantize(colors=max_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q_rgb = np.array(q_strip.convert("RGB"), dtype=np.uint8).reshape(n, 3)

    out = np.zeros_like(arr)
    out[mask, :3] = q_rgb
    out[mask, 3] = 255
    return Image.fromarray(out, "RGBA")


def dp_quilt_horizontal(rgba: Image.Image, target_w: int) -> Image.Image:
    """Given an RGBA image wider than target_w (W = target_w + overlap),
    quilt the right overlap onto the left overlap using minimum-error DP seam
    so the resulting image of width target_w tiles seamlessly horizontally.
    """
    arr = np.array(rgba.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    ov = w - target_w
    if ov < 8:
        raise ValueError(f"Need overlap >= 8px, got {ov} (w={w}, target_w={target_w})")

    left = arr[:, :ov, :].astype(np.float32)
    right = arr[:, target_w:, :].astype(np.float32)

    # Cost matrix: color difference + strong alpha mismatch penalty
    rgb_diff = np.linalg.norm(left[:, :, :3] - right[:, :, :3], axis=2)
    alpha_diff = np.abs(left[:, :, 3] - right[:, :, 3]) * 3.0
    # Slight preference to stay away from extreme edges of overlap
    x_coord = np.linspace(-1.0, 1.0, ov)[None, :]
    center_bias = (x_coord ** 2) * 12.0
    cost = rgb_diff + alpha_diff + center_bias

    # DP shortest path top-to-bottom
    dp = np.zeros_like(cost)
    back = np.zeros((h, ov), dtype=np.int32)
    dp[0] = cost[0]
    for y in range(1, h):
        for x in range(ov):
            x0 = max(0, x - 1)
            x1 = min(ov, x + 2)
            sub = dp[y - 1, x0:x1]
            best_rel = int(np.argmin(sub))
            dp[y, x] = cost[y, x] + sub[best_rel]
            back[y, x] = x0 + best_rel

    seam = np.zeros(h, dtype=np.int32)
    seam[h - 1] = int(np.argmin(dp[h - 1]))
    for y in range(h - 2, -1, -1):
        seam[y] = back[y + 1, seam[y + 1]]

    # Construct tiled strip:
    # For x in [0, ov): take right[:, x] for x < seam[y], left[:, x] for x >= seam[y]
    # For x in [ov, target_w): take arr[:, x]
    # Wait: check wrap boundary!
    # At x = 0: if seam[y] > 0, pixel 0 comes from right[:, 0] == arr[:, target_w],
    # which is immediately to the right of arr[:, target_w - 1] (the last pixel of output)!
    # So x=target_w-1 seamlessly flows into x=0!
    out = np.zeros((h, target_w, 4), dtype=np.uint8)
    out[:, ov:target_w, :] = arr[:, ov:target_w, :]
    for y in range(h):
        sx = seam[y]
        if sx > 0:
            out[y, :sx, :] = arr[y, target_w:target_w + sx, :]
        out[y, sx:ov, :] = arr[y, sx:ov, :]

    # Shift horizontally by target_w // 2 so any tiny residual isn't sitting at x=0 during debugging,
    # Wait: actually keeping the stitch at x ~ ov/2 means x=0 and x=target_w-1 are ALREADY continuous from source!
    return Image.fromarray(out, "RGBA")


def clean_stray_specks(img: Image.Image, min_component: int = 4) -> Image.Image:
    """Remove tiny isolated opaque specks floating in transparent sky."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    mask = arr[:, :, 3] > 127
    h, w = mask.shape
    visited = np.zeros_like(mask)
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not visited[y, x]:
                comp = []
                stack = [(y, x)]
                visited[y, x] = True
                while stack:
                    cy, cx = stack.pop()
                    comp.append((cy, cx))
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            stack.append((ny, nx))
                if len(comp) < min_component:
                    for cy, cx in comp:
                        arr[cy, cx] = [0, 0, 0, 0]
    return Image.fromarray(arr, "RGBA")


def ensure_bottom_solid(img: Image.Image, fill_rows: int = 3) -> Image.Image:
    """Ensure the bottom rows of a biome layer have solid ground (no accidental transparent gaps at bottom)."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    for x in range(w):
        # Find lowest opaque pixel in column
        ys = np.where(arr[:, x, 3] > 127)[0]
        if len(ys) > 0:
            last_y = ys[-1]
            if last_y < h - 1:
                arr[last_y + 1:, x, :3] = arr[last_y, x, :3]
                arr[last_y + 1:, x, 3] = 255
        else:
            # Fill from nearest opaque neighbor
            arr[h - fill_rows:, x] = [60, 70, 50, 255]
    return Image.fromarray(arr, "RGBA")


def process_biome(
    raw_path: Path,
    out_path: Path,
    target_w: int,
    target_h: int,
    max_colors: int = 36,
    overlap: int = 56,
    tol: float = 82.0,
    top_margin: int = 8,
    crop_bottom_pct: float = 0.0,
    trim_sides_pct: float = 0.02,
) -> Image.Image:
    """Full pipeline: raw image -> magenta chroma key -> crop silhouette -> downscale to
    (target_w + overlap, target_h) -> DP horizontal tile quilt -> quantize -> save.
    """
    im = Image.open(raw_path).convert("RGBA")
    keyed = chroma_key_magenta(im, tol=tol, flood_only=True)
    arr = np.array(keyed)
    h, w, _ = arr.shape

    # Trim small side margin if generator drew borders
    x0 = int(w * trim_sides_pct)
    x1 = int(w * (1.0 - trim_sides_pct))
    y1_cut = int(h * (1.0 - crop_bottom_pct))
    arr = arr[:y1_cut, x0:x1, :]

    # Find vertical content bounds (ignore rows with < 2% opaque pixels at top)
    row_cov = (arr[:, :, 3] > 127).mean(axis=1)
    content_rows = np.where(row_cov > 0.015)[0]
    if len(content_rows) == 0:
        raise RuntimeError(f"No opaque content found in {raw_path} after chroma key!")
    y_top = max(0, int(content_rows[0]) - 2)
    y_bot = min(arr.shape[0], int(content_rows[-1]) + 1)

    cropped = Image.fromarray(arr[y_top:y_bot, :, :], "RGBA")

    # Downscale to (target_w + overlap, target_h - top_margin), then pad transparent top_margin
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
    return final


def process_opaque_scene(
    raw_path: Path,
    out_path: Path,
    target_w: int,
    target_h: int,
    max_colors: int = 44,
) -> Image.Image:
    """Process an opaque background (e.g., 480x300 minigame map)."""
    im = Image.open(raw_path).convert("RGB")
    # Center-crop to exact target aspect ratio
    sw, sh = im.size
    target_ratio = target_w / target_h
    src_ratio = sw / sh
    if src_ratio > target_ratio:
        new_w = int(round(sh * target_ratio))
        left = (sw - new_w) // 2
        im = im.crop((left, 0, left + new_w, sh))
    else:
        new_h = int(round(sw / target_ratio))
        top = (sh - new_h) // 2
        im = im.crop((0, top, sw, top + new_h))

    small = im.resize((target_w, target_h), Image.Resampling.BOX)
    final = quantize_rgba(small.convert("RGBA"), max_colors=max_colors, opaque=True)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(out_path)
    return final


def process_sprite(
    raw_path: Path,
    out_path: Path,
    target_w: int,
    target_h: int,
    max_colors: int = 20,
    tol: float = 82.0,
    pad: int = 1,
) -> Image.Image:
    """Process a single transparent sprite on magenta background."""
    im = Image.open(raw_path).convert("RGBA")
    keyed = chroma_key_magenta(im, tol=tol, flood_only=True)
    arr = np.array(keyed)
    ys, xs = np.where(arr[:, :, 3] > 127)
    if len(xs) == 0:
        raise RuntimeError(f"Empty sprite after chroma key: {raw_path}")
    crop = keyed.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    # Preserve aspect ratio inside (target_w - 2*pad, target_h - 2*pad)
    cw, ch = crop.size
    avail_w = max(1, target_w - 2 * pad)
    avail_h = max(1, target_h - 2 * pad)
    scale = min(avail_w / cw, avail_h / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    scaled = downscale_rgba_clean(crop, nw, nh)

    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    ox = (target_w - nw) // 2
    oy = target_h - nh - pad
    canvas.paste(scaled, (ox, oy))
    canvas = clean_stray_specks(canvas, min_component=2)
    final = quantize_rgba(canvas, max_colors=max_colors, opaque=False)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(out_path)
    return final


def make_biome_preview(biome_names: list[str], out_path: Path) -> None:
    """Render all biomes tiled 2x horizontally (960px wide) over a gradient sky
    so we can visually inspect silhouettes, seams, and far+near layering!
    """
    row_h = 140
    w = 960
    h = len(biome_names) * row_h + 20
    canvas = Image.new("RGBA", (w, h), (20, 24, 34, 255))
    draw = ImageDraw.Draw(canvas)

    for idx, name in enumerate(biome_names):
        y0 = idx * row_h + 10
        # Draw soft sky band behind biome
        for dy in range(125):
            t = dy / 125.0
            r = int(110 + 115 * t)
            g = int(155 + 75 * t)
            b = int(215 + 25 * t)
            draw.line([(0, y0 + dy), (w - 1, y0 + dy)], fill=(r, g, b, 255))

        far_p = REPO_ROOT / "assets" / "biomes" / f"{name}_far.png"
        near_p = REPO_ROOT / "assets" / "biomes" / f"{name}_near.png"
        if far_p.exists():
            far = Image.open(far_p).convert("RGBA")
            canvas.alpha_composite(far, (0, y0 + 15))
            canvas.alpha_composite(far, (480, y0 + 15))
        if near_p.exists():
            near = Image.open(near_p).convert("RGBA")
            canvas.alpha_composite(near, (0, y0 + 55))
            canvas.alpha_composite(near, (480, y0 + 55))

        # Red tick above seam at x=480
        draw.rectangle([479, y0, 481, y0 + 8], fill=(255, 40, 40, 255))
        draw.rectangle([4, y0 + 2, 160, y0 + 15], fill=(0, 0, 0, 180))
        draw.text((8, y0 + 3), f"{name} (2x tiled, seam @480)", fill=(255, 255, 255, 255))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)


def verify_file(path: Path, exp_w: int, exp_h: int, opaque: bool, max_colors: int) -> list[str]:
    """Verify exact contract rules on a PNG asset."""
    errs = []
    if not path.exists():
        return [f"MISSING: {path}"]
    im = Image.open(path)
    if im.mode != "RGBA":
        errs.append(f"mode={im.mode} (expected RGBA)")
        im = im.convert("RGBA")
    if im.size != (exp_w, exp_h):
        errs.append(f"size={im.size} (expected {(exp_w, exp_h)})")

    arr = np.array(im)
    alphas = set(np.unique(arr[:, :, 3]).tolist())
    if opaque:
        if alphas != {255}:
            errs.append(f"opaque asset has non-255 alpha: {sorted(alphas)[:5]}")
    else:
        bad_a = alphas - {0, 255}
        if bad_a:
            errs.append(f"semi-transparent pixels found: {sorted(bad_a)[:5]}")

    opaque_mask = arr[:, :, 3] == 255
    if opaque_mask.any():
        px = arr[opaque_mask, :3]
        uniq = np.unique(px.reshape(-1, 3), axis=0)
        if len(uniq) > max_colors:
            errs.append(f"colors={len(uniq)} > {max_colors}")
        # Check for magenta fringe
        r, g, b = px[:, 0].astype(int), px[:, 1].astype(int), px[:, 2].astype(int)
        mag_cnt = int(np.sum((r > 220) & (b > 220) & (g < 40)))
        if mag_cnt > 0:
            errs.append(f"magenta fringe pixels={mag_cnt}")
    else:
        errs.append("completely transparent!")
    return errs


def build_contact_sheet(asset_paths: list[Path], out_path: Path, scale: int = 3) -> None:
    """Build a crisp nearest-neighbor contact sheet at `scale`x showing every Section C asset."""
    pad = 16
    label_h = 18
    max_row_w = 1520

    # Checkerboard helper for transparent assets
    def draw_checker(canvas: Image.Image, x0: int, y0: int, w: int, h: int, sq: int = 6):
        ch = Image.new("RGBA", (w, h))
        arr = np.zeros((h, w, 4), dtype=np.uint8)
        yy, xx = np.indices((h, w))
        c = ((yy // sq) + (xx // sq)) % 2 == 0
        arr[c] = [56, 60, 72, 255]
        arr[~c] = [42, 46, 56, 255]
        canvas.paste(Image.fromarray(arr, "RGBA"), (x0, y0))

    items = []
    for p in asset_paths:
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA")
        # Biomes and 480x300 scenes: scale 2x if huge so contact sheet stays readable, or exact 3x!
        # Spec says: "assets scaled 3x on a grid" -> let's honor 3x!
        s = scale
        sw, sh = im.size[0] * s, im.size[1] * s
        scaled = im.resize((sw, sh), Image.Resampling.NEAREST)
        rel = str(p.relative_to(REPO_ROOT / "assets"))
        items.append((rel, im.size, scaled))

    # Flow layout
    rows = []
    cur_row = []
    cur_w = pad
    for item in items:
        _, _, sc = item
        box_w = max(sc.width, 140)
        if cur_row and cur_w + box_w + pad > max_row_w:
            rows.append(cur_row)
            cur_row = [item]
            cur_w = pad + box_w + pad
        else:
            cur_row.append(item)
            cur_w += box_w + pad
    if cur_row:
        rows.append(cur_row)

    total_h = pad + 32
    for row in rows:
        rh = max(it[2].height for it in row) + label_h + pad
        total_h += rh

    sheet = Image.new("RGBA", (max_row_w, total_h), (24, 27, 34, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 10), "BELA'S BIG DRIVE — Section C Contact Sheet (3x nearest-neighbor)", fill=(240, 220, 160, 255))

    y = pad + 32
    for row in rows:
        rh = max(it[2].height for it in row)
        x = pad
        for rel, orig_sz, sc in row:
            box_w = max(sc.width, 140)
            draw.text((x, y), f"{rel} ({orig_sz[0]}x{orig_sz[1]})", fill=(210, 220, 235, 255))
            draw_checker(sheet, x, y + label_h, sc.width, sc.height)
            sheet.alpha_composite(sc, (x, y + label_h))
            draw.rectangle([x - 1, y + label_h - 1, x + sc.width, y + label_h + sc.height], outline=(90, 96, 112, 255))
            x += box_w + pad
        y += rh + label_h + pad

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


if __name__ == "__main__":
    print("pixelize_C.py helper loaded successfully.")
