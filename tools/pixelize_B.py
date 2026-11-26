#!/usr/bin/env python3
"""Pixel-art post-processor, validator, and contact-sheet builder for Section B scenes."""

import argparse
import glob
import os
import sys
from PIL import Image, ImageDraw, ImageEnhance, ImageOps


def crop_to_aspect(im: Image.Image, target_w: int, target_h: int, valign: float = 0.5, halign: float = 0.5) -> Image.Image:
    """Crop image to exact target aspect ratio without stretching."""
    src_w, src_h = im.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    if abs(src_ratio - target_ratio) < 1e-4:
        return im

    if src_ratio > target_ratio:
        # Too wide: crop width
        new_w = int(round(src_h * target_ratio))
        left = int(round((src_w - new_w) * halign))
        return im.crop((left, 0, left + new_w, src_h))
    else:
        # Too tall: crop height
        new_h = int(round(src_w / target_ratio))
        top = int(round((src_h - new_h) * valign))
        return im.crop((0, top, src_w, top + new_h))


def pixelize_scene(
    src_path: str,
    out_path: str,
    width: int = 480,
    height: int = 200,
    colors: int = 44,
    valign: float = 0.5,
    halign: float = 0.5,
    resample: str = "box",
    quant_method: str = "mediancut",
    sharpen: float = 1.15,
    contrast: float = 1.05,
    saturation: float = 1.08,
) -> dict:
    """Convert raw generated artwork into crisp opaque RGBA pixel art at exact native size."""
    im = ImageOps.exif_transpose(Image.open(src_path)).convert("RGB")
    im = crop_to_aspect(im, width, height, valign=valign, halign=halign)

    resample_map = {
        "nearest": Image.Resampling.NEAREST,
        "box": Image.Resampling.BOX,
        "bilinear": Image.Resampling.BILINEAR,
        "lanczos": Image.Resampling.LANCZOS,
    }
    im = im.resize((width, height), resample=resample_map[resample])

    if saturation != 1.0:
        im = ImageEnhance.Color(im).enhance(saturation)
    if contrast != 1.0:
        im = ImageEnhance.Contrast(im).enhance(contrast)
    if sharpen != 1.0:
        im = ImageEnhance.Sharpness(im).enhance(sharpen)

    q_map = {
        "mediancut": Image.Quantize.MEDIANCUT,
        "maxcoverage": Image.Quantize.MAXCOVERAGE,
        "fastoctree": Image.Quantize.FASTOCTREE,
    }
    colors = min(max(2, colors), 48)
    quantized = im.quantize(colors=colors, method=q_map[quant_method], dither=Image.Dither.NONE)
    out = quantized.convert("RGBA")

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    out.save(out_path, format="PNG", optimize=True)

    return verify_scene(out_path, expected_size=(width, height), max_colors=48)


def verify_scene(path: str, expected_size=None, max_colors: int = 48) -> dict:
    """Verify size, RGBA format, opacity, and palette size."""
    im = Image.open(path)
    rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A")
    amin, amax = alpha.getextrema()
    unique_colors = len(rgba.getcolors(maxcolors=100000) or [])
    ok = True
    errors = []
    if im.mode != "RGBA":
        ok = False
        errors.append(f"mode={im.mode} (expected RGBA)")
    if expected_size and im.size != expected_size:
        ok = False
        errors.append(f"size={im.size} (expected {expected_size})")
    if amin != 255 or amax != 255:
        ok = False
        errors.append(f"alpha={amin}..{amax} (expected 255)")
    if unique_colors > max_colors:
        ok = False
        errors.append(f"colors={unique_colors} (> {max_colors})")
    return {
        "path": path,
        "size": im.size,
        "mode": im.mode,
        "colors": unique_colors,
        "alpha": (amin, amax),
        "ok": ok,
        "errors": errors,
    }


def build_contact_sheet(paths, out_path: str, scale: int = 3, cols: int = 4):
    """Build a nearest-neighbor scaled contact sheet grid with labels."""
    items = []
    for p in paths:
        im = Image.open(p).convert("RGBA")
        w, h = im.size
        scaled = im.resize((w * scale, h * scale), resample=Image.Resampling.NEAREST)
        items.append((os.path.basename(p), im.size, scaled))

    if not items:
        raise ValueError("No images found for contact sheet")

    pad = 16
    label_h = 28
    cell_w = max(it[2].width for it in items) + pad * 2
    cell_h = max(it[2].height for it in items) + label_h + pad * 2
    rows = (len(items) + cols - 1) // cols

    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), (24, 24, 30))
    draw = ImageDraw.Draw(sheet)

    for idx, (name, orig_size, scaled) in enumerate(items):
        r, c = divmod(idx, cols)
        x0 = c * cell_w + pad
        y0 = r * cell_h + pad
        draw.text((x0, y0), f"{name} ({orig_size[0]}x{orig_size[1]})", fill=(240, 240, 210))
        sheet.paste(scaled.convert("RGB"), (x0, y0 + label_h))

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    sheet.save(out_path, format="PNG")
    print(f"Saved contact sheet: {out_path} ({sheet.size[0]}x{sheet.size[1]}, {len(items)} items, {scale}x)")


def main():
    parser = argparse.ArgumentParser(description="Pixelize and verify Section B scenes.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_one = sub.add_parser("pixelize", help="Pixelize one raw image into a scene PNG.")
    p_one.add_argument("src")
    p_one.add_argument("out")
    p_one.add_argument("--width", type=int, default=480)
    p_one.add_argument("--height", type=int, default=200)
    p_one.add_argument("--colors", type=int, default=44)
    p_one.add_argument("--valign", type=float, default=0.5)
    p_one.add_argument("--halign", type=float, default=0.5)
    p_one.add_argument("--resample", choices=["nearest", "box", "bilinear", "lanczos"], default="box")
    p_one.add_argument("--quant", choices=["mediancut", "maxcoverage", "fastoctree"], default="mediancut")
    p_one.add_argument("--sharpen", type=float, default=1.15)
    p_one.add_argument("--contrast", type=float, default=1.05)
    p_one.add_argument("--saturation", type=float, default=1.08)

    p_sheet = sub.add_parser("sheet", help="Build a scaled contact sheet.")
    p_sheet.add_argument("out")
    p_sheet.add_argument("inputs", nargs="+")
    p_sheet.add_argument("--scale", type=int, default=3)
    p_sheet.add_argument("--cols", type=int, default=3)

    p_verify = sub.add_parser("verify", help="Verify scene PNGs.")
    p_verify.add_argument("inputs", nargs="+")

    args = parser.parse_args()
    if args.cmd == "pixelize":
        info = pixelize_scene(
            args.src,
            args.out,
            width=args.width,
            height=args.height,
            colors=args.colors,
            valign=args.valign,
            halign=args.halign,
            resample=args.resample,
            quant_method=args.quant,
            sharpen=args.sharpen,
            contrast=args.contrast,
            saturation=args.saturation,
        )
        status = "OK" if info["ok"] else f"FAIL: {info['errors']}"
        print(f"{info['path']}: {info['size'][0]}x{info['size'][1]} {info['mode']} colors={info['colors']} alpha={info['alpha']} [{status}]")
        if not info["ok"]:
            sys.exit(1)
    elif args.cmd == "sheet":
        paths = []
        for pat in args.inputs:
            matched = sorted(glob.glob(pat))
            paths.extend(matched if matched else [pat])
        build_contact_sheet(paths, args.out, scale=args.scale, cols=args.cols)
    elif args.cmd == "verify":
        paths = []
        for pat in args.inputs:
            matched = sorted(glob.glob(pat))
            paths.extend(matched if matched else [pat])
        all_ok = True
        for p in paths:
            exp = (480, 300) if os.path.basename(p) == "title.png" else (480, 200)
            info = verify_scene(p, expected_size=exp)
            status = "OK" if info["ok"] else f"FAIL: {info['errors']}"
            print(f"{os.path.basename(p):28s} {info['size'][0]}x{info['size'][1]} {info['mode']} colors={info['colors']:2d} [{status}]")
            if not info["ok"]:
                all_ok = False
        sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
