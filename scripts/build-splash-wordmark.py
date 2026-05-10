#!/usr/bin/env python3
"""
Build assets/splash-full.png from assets/splash-wordmark-source.png.

- Background unified to #050508 (matches app.json splash.backgroundColor)
- Scrubs bright stray pixels in bottom-right corner (e.g. sparkle)
- Composites centered on 1284×2778 portrait canvas (Expo splash target size)

Run from repo root: python3 scripts/build-splash-wordmark.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "splash-wordmark-source.png"
OUT = ASSETS / "splash-full.png"

# Must match app.json expo.splash.backgroundColor & expo-splash-screen plugin
BG = (5, 5, 8)

W = 1284
H = 2778


def normalize_background(im: Image.Image) -> Image.Image:
    """Map near-black pixels to exact splash background."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, *rest = px[x, y]
            a = rest[0] if rest else 255
            if max(r, g, b) < 22:
                px[x, y] = (*BG, a) if im.mode == "RGBA" else BG
    return im


def scrub_canvas_corner(canvas: Image.Image) -> Image.Image:
    """Remove bright specks in bottom-right of final splash (scaled sparkle/UI chrome)."""
    px = canvas.load()
    cw = min(220, W // 6)
    ch = min(220, H // 14)
    for y in range(H - ch, H):
        for x in range(W - cw, W):
            r, g, b = px[x, y][:3]
            if r + g + b > 480 and min(r, g, b) > 100 and max(r, g, b) - min(r, g, b) < 70:
                px[x, y] = BG
    return canvas


def scrub_corner_sparkle(im: Image.Image) -> Image.Image:
    """Remove small bright marks in bottom-right (camera UI sparkle, etc.)."""
    px = im.load()
    w, h = im.size
    # Only touch a corner patch — logo text should not occupy extreme bottom-right
    cw = min(120, w // 5)
    ch = min(100, h // 5)
    for y in range(h - ch, h):
        for x in range(w - cw, w):
            r, g, b, *rest = px[x, y]
            a = rest[0] if rest else 255
            # White / gray sparkle: all channels high and similar
            if r + g + b > 520 and min(r, g, b) > 110 and max(r, g, b) - min(r, g, b) < 55:
                px[x, y] = (*BG, a) if im.mode == "RGBA" else BG
    return im


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Missing {SOURCE} — add your wordmark PNG there first.")

    logo = Image.open(SOURCE).convert("RGBA")
    logo = normalize_background(logo)
    logo = scrub_corner_sparkle(logo)

    lw, lh = logo.size
    target_w = int(W * 0.88)
    scale = target_w / lw
    target_h = int(round(lh * scale))
    logo_resized = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (W, H), BG)
    ox = (W - target_w) // 2
    oy = (H - target_h) // 2
    if logo_resized.mode == "RGBA":
        canvas.paste(logo_resized, (ox, oy), logo_resized)
    else:
        canvas.paste(logo_resized, (ox, oy))

    canvas = scrub_canvas_corner(canvas)

    canvas.save(OUT, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({W}×{H}) from {SOURCE} ({lw}×{lh})")


if __name__ == "__main__":
    main()
