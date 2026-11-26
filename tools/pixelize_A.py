#!/usr/bin/env python3
"""Pixel-art post-processing utility for Section A (Characters & vehicles) of Bela's Big Drive.

Pipeline:
1. Edge-connected flood-fill chroma-key removal of #FF00FF magenta (plus optional enclosed magenta holes),
   so warm pink details (e.g. Bela's nose/ears, Muskrat's nose, human skin) are never eaten.
2. Defringe / despill semi-magenta border pixels at high resolution before downscaling.
3. Crop to tight foreground bounding box with optional aspect/bottom alignment.
4. Foreground-only area downscale to exact target pixel dimensions (zero magenta bleeding!).
5. Crisp binary alpha (0 or 255 only) + orphan pixel cleanup.
6. MEDIANCUT color quantization to <= N colors (default 20-24) with no dithering.
7. Verification helper and contact sheet builder.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw


def is_magenta_mask(rgb: np.ndarray, strict: bool = False) -> np.ndarray:
    """Return boolean mask of magenta-like background pixels (H, W)."""
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    if strict:
        # Pure/strong magenta
        return (r > 180) & (b > 180) & (g < 90) & (np.abs(r - b) < 70)
    # Broader magenta (catches anti-aliased / compressed edges around #FF00FF)
    return (
        (r > 130)
        & (b > 130)
        & (g < 130)
        & ((r - g) > 45)
        & ((b - g) > 45)
        & (np.abs(r - b) < 95)
    )


def remove_magenta_bg(
    img: Image.Image,
    remove_interior_holes: bool = True,
    erode_fringe: int = 1,
) -> Image.Image:
    """Remove solid magenta background using edge-connected flood-fill + fringe cleanup."""
    rgba = np.array(img.convert("RGBA"))
    rgb = rgba[:, :, :3]
    h, w = rgb.shape[:2]

    broad = is_magenta_mask(rgb, strict=False)
    strict = is_magenta_mask(rgb, strict=True)

    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    # Seed flood-fill from image border pixels that look magenta
    for x in range(w):
        if broad[0, x] and not bg[0, x]:
            bg[0, x] = True
            q.append((0, x))
        if broad[h - 1, x] and not bg[h - 1, x]:
            bg[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if broad[y, 0] and not bg[y, 0]:
            bg[y, 0] = True
            q.append((y, 0))
        if broad[y, w - 1] and not bg[y, w - 1]:
            bg[y, w - 1] = True
            q.append((y, w - 1))

    # Also seed from any strongly magenta interior pixels if requested (e.g. between legs/arms)
    if remove_interior_holes:
        ys, xs = np.where(strict & ~bg)
        for y, x in zip(ys.tolist(), xs.tolist()):
            bg[y, x] = True
            q.append((y, x))

    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and broad[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    # Optionally erode 1-2px of magenta-tinted fringe adjacent to background
    for _ in range(erode_fringe):
        padded = np.pad(bg, 1, mode="constant", constant_values=True)
        adj_bg = (
            padded[:-2, 1:-1]
            | padded[2:, 1:-1]
            | padded[1:-1, :-2]
            | padded[1:-1, 2:]
        )
        r = rgb[:, :, 0].astype(np.int16)
        g = rgb[:, :, 1].astype(np.int16)
        b = rgb[:, :, 2].astype(np.int16)
        fringe = adj_bg & ~bg & ((r - g) > 25) & ((b - g) > 25) & (r > 95) & (b > 95)
        bg |= fringe

    out = rgba.copy()
    out[bg, 3] = 0
    out[~bg, 3] = 255
    return Image.fromarray(out, "RGBA")


def crop_foreground(img: Image.Image, pad: int = 0) -> Image.Image:
    """Crop RGBA image tightly to non-transparent bounding box."""
    alpha = np.array(img.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return img
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(img.width, int(xs.max()) + 1 + pad)
    y1 = min(img.height, int(ys.max()) + 1 + pad)
    return img.crop((x0, y0, x1, y1))


def downscale_foreground_only(
    img: Image.Image,
    target_w: int,
    target_h: int,
    align: str = "center",
    margin: int = 1,
    alpha_thresh: float = 0.45,
) -> Image.Image:
    """Fit img into (target_w, target_h) preserving aspect ratio, averaging ONLY opaque foreground RGB."""
    rgba = np.array(img.convert("RGBA")).astype(np.float32)
    h, w = rgba.shape[:2]

    avail_w = max(1, target_w - 2 * margin)
    avail_h = max(1, target_h - (margin if align == "bottom" else 2 * margin))
    scale = min(avail_w / w, avail_h / h)
    new_w = max(1, min(target_w, int(round(w * scale))))
    new_h = max(1, min(target_h, int(round(h * scale))))

    # Premultiplied alpha resize with BOX filter -> exact area average of opaque pixels only!
    a = rgba[:, :, 3:4] / 255.0
    premul = np.concatenate([rgba[:, :, :3] * a, a * 255.0], axis=2)

    # Resize each channel via PIL BOX (clean area average)
    ch_out = []
    for c in range(4):
        ch_im = Image.fromarray(np.clip(premul[:, :, c], 0, 255).astype(np.uint8), "L")
        ch_rs = ch_im.resize((new_w, new_h), Image.Resampling.BOX)
        ch_out.append(np.array(ch_rs, dtype=np.float32))

    alpha_f = ch_out[3] / 255.0
    mask = alpha_f >= alpha_thresh

    out_rgb = np.zeros((new_h, new_w, 3), dtype=np.uint8)
    safe_a = np.where(alpha_f > 1e-4, alpha_f, 1.0)
    for c in range(3):
        unpremul = np.clip(ch_out[c] / safe_a, 0, 255)
        out_rgb[:, :, c] = np.where(mask, np.round(unpremul), 0).astype(np.uint8)

    out_a = np.where(mask, 255, 0).astype(np.uint8)
    small = np.dstack([out_rgb, out_a])

    # Place onto target canvas
    canvas = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    ox = (target_w - new_w) // 2
    if align == "bottom":
        oy = target_h - new_h
    elif align == "top":
        oy = margin
    else:
        oy = (target_h - new_h) // 2
    canvas[oy : oy + new_h, ox : ox + new_w] = small
    return Image.fromarray(canvas, "RGBA")


def cleanup_orphans(img: Image.Image) -> Image.Image:
    """Remove isolated 1-pixel opaque specks with zero 4-connected opaque neighbors."""
    arr = np.array(img.convert("RGBA"))
    a = arr[:, :, 3] > 0
    padded = np.pad(a, 1, mode="constant", constant_values=False)
    neighbors = (
        padded[:-2, 1:-1].astype(int)
        + padded[2:, 1:-1].astype(int)
        + padded[1:-1, :-2].astype(int)
        + padded[1:-1, 2:].astype(int)
    )
    orphans = a & (neighbors == 0)
    arr[orphans] = [0, 0, 0, 0]
    return Image.fromarray(arr, "RGBA")


def quantize_sprite(img: Image.Image, colors: int = 20) -> Image.Image:
    """Quantize opaque pixels to <= `colors` via MEDIANCUT with no dithering; preserve binary alpha."""
    arr = np.array(img.convert("RGBA"))
    mask = arr[:, :, 3] >= 128
    if not np.any(mask):
        return img

    # Build a 1D strip of opaque pixels so MEDIANCUT only allocates palette entries to foreground!
    fg_pixels = arr[mask][:, :3]
    strip = Image.fromarray(fg_pixels.reshape(1, -1, 3), "RGB")
    q_strip = strip.quantize(
        colors=colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    q_fg = np.array(q_strip).reshape(-1, 3)

    out = np.zeros_like(arr)
    out[mask, :3] = q_fg
    out[mask, 3] = 255
    return Image.fromarray(out, "RGBA")


def pixelize_sprite(
    src: str | Path | Image.Image,
    target_w: int,
    target_h: int,
    colors: int = 20,
    align: str = "center",
    margin: int = 1,
    alpha_thresh: float = 0.45,
    erode_fringe: int = 1,
    remove_interior_holes: bool = True,
) -> Image.Image:
    """Full sprite pixelization pipeline from raw magenta-bg generation."""
    img = Image.open(src) if not isinstance(src, Image.Image) else src
    img = remove_magenta_bg(
        img,
        remove_interior_holes=remove_interior_holes,
        erode_fringe=erode_fringe,
    )
    img = crop_foreground(img)
    img = downscale_foreground_only(
        img,
        target_w=target_w,
        target_h=target_h,
        align=align,
        margin=margin,
        alpha_thresh=alpha_thresh,
    )
    img = cleanup_orphans(img)
    img = quantize_sprite(img, colors=colors)
    return img


def split_horizontal_panels(
    img: Image.Image, n_panels: int, trim_frac: float = 0.02
) -> list[Image.Image]:
    """Split an image into n_panels equal-width horizontal panels."""
    w, h = img.size
    pw = w / n_panels
    panels = []
    for i in range(n_panels):
        x0 = int(round(i * pw + pw * trim_frac))
        x1 = int(round((i + 1) * pw - pw * trim_frac))
        panels.append(img.crop((x0, 0, x1, h)))
    return panels


def verify_asset(
    path: str | Path, expected_size: tuple[int, int], max_colors: int = 24
) -> dict:
    """Verify exact size, binary alpha (0/255), unique color count, and absence of magenta fringe."""
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    alpha_vals = set(np.unique(arr[:, :, 3]).tolist())
    fg = arr[arr[:, :, 3] == 255][:, :3]
    unique_colors = len(np.unique(fg, axis=0)) if len(fg) else 0
    # Check for pure/strong magenta pixels remaining in opaque area
    if len(fg):
        r, g, b = fg[:, 0].astype(int), fg[:, 1].astype(int), fg[:, 2].astype(int)
        magenta_px = int(np.sum((r > 200) & (b > 200) & (g < 70)))
    else:
        magenta_px = 0
    return {
        "path": str(path),
        "size": im.size,
        "size_ok": im.size == expected_size,
        "alpha_ok": alpha_vals.issubset({0, 255}),
        "colors": unique_colors,
        "colors_ok": unique_colors <= max_colors,
        "magenta_px": magenta_px,
        "has_transparent": 0 in alpha_vals,
    }


def make_checkerboard(w: int, h: int, tile: int = 8) -> Image.Image:
    """Create a subtle neutral grey checkerboard background to inspect transparency cleanly."""
    y, x = np.indices((h, w))
    pat = ((x // tile) + (y // tile)) % 2
    c1 = np.array([58, 62, 72], dtype=np.uint8)
    c2 = np.array([76, 81, 94], dtype=np.uint8)
    rgb = np.where(pat[:, :, None] == 0, c1, c2)
    return Image.fromarray(rgb, "RGB")


def build_contact_sheet(
    items: Iterable[tuple[str, str | Path]],
    out_path: str | Path,
    scale: int = 3,
    cols: int = 5,
    pad: int = 16,
    label_h: int = 20,
) -> Path:
    """Render a contact sheet of sprites scaled by `scale` (nearest-neighbor) on a checkerboard grid."""
    loaded = []
    for label, p in items:
        im = Image.open(p).convert("RGBA")
        scaled = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
        loaded.append((label, im.size, scaled))

    if not loaded:
        raise ValueError("No items to render")

    # Group by rows with dynamic row heights so tall sheets and tiny sprites both look neat
    rows_list = [loaded[i : i + cols] for i in range(0, len(loaded), cols)]
    col_widths = [0] * cols
    row_heights = []
    for row in rows_list:
        rh = 0
        for ci, (_, _, sc) in enumerate(row):
            col_widths[ci] = max(col_widths[ci], sc.width + pad * 2, 180)
            rh = max(rh, sc.height + label_h + pad * 2)
        row_heights.append(rh)

    total_w = sum(col_widths) + pad
    total_h = sum(row_heights) + pad
    sheet = Image.new("RGB", (total_w, total_h), (26, 28, 34))
    draw = ImageDraw.Draw(sheet)

    y_cur = pad // 2
    for row, rh in zip(rows_list, row_heights):
        x_cur = pad // 2
        for ci, (label, orig_size, sc) in enumerate(row):
            cw = col_widths[ci]
            bx = x_cur + (cw - sc.width) // 2
            by = y_cur + label_h + (rh - label_h - sc.height) // 2
            cb = make_checkerboard(sc.width, sc.height, tile=max(4, scale * 2))
            sheet.paste(cb, (bx, by))
            sheet.paste(sc, (bx, by), sc)
            draw.rectangle([bx - 1, by - 1, bx + sc.width, by + sc.height], outline=(110, 118, 134))
            draw.text((x_cur + 8, y_cur + 4), f"{label} ({orig_size[0]}x{orig_size[1]})", fill=(235, 240, 248))
            x_cur += cw
        y_cur += rh

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Pixelize a sprite from magenta-bg raw image.")
    ap.add_argument("src", help="Input image path")
    ap.add_argument("dst", help="Output PNG path")
    ap.add_argument("--width", type=int, required=True)
    ap.add_argument("--height", type=int, required=True)
    ap.add_argument("--colors", type=int, default=20)
    ap.add_argument("--align", choices=["center", "bottom", "top"], default="center")
    ap.add_argument("--margin", type=int, default=1)
    ap.add_argument("--alpha-thresh", type=float, default=0.45)
    ap.add_argument("--erode", type=int, default=1)
    args = ap.parse_args()

    out = pixelize_sprite(
        args.src,
        target_w=args.width,
        target_h=args.height,
        colors=args.colors,
        align=args.align,
        margin=args.margin,
        alpha_thresh=args.alpha_thresh,
        erode_fringe=args.erode,
    )
    Path(args.dst).parent.mkdir(parents=True, exist_ok=True)
    out.save(args.dst)
    print(verify_asset(args.dst, (args.width, args.height), max_colors=24))


if __name__ == "__main__":
    main()
