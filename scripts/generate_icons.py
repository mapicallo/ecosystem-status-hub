#!/usr/bin/env python3
"""Generate simple PNG toolbar icons (requires Pillow)."""

from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as e:
    raise SystemExit("Install Pillow: pip install pillow") from e

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "icons"
BG = (14, 21, 32, 255)
ACCENT = (61, 217, 192, 255)
GLOW = (61, 217, 192, 90)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = max(1, size // 10)
    d.rounded_rectangle(
        [pad, pad, size - pad - 1, size - pad - 1],
        radius=max(2, size // 6),
        fill=BG,
        outline=ACCENT,
        width=max(1, size // 16),
    )
    # Hub "nodes" — three small circles
    for i, (fx, fy) in enumerate([(0.32, 0.38), (0.68, 0.42), (0.5, 0.65)]):
        cx = int(size * fx)
        cy = int(size * fy)
        r = max(2, size // 14)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ACCENT if i == 0 else GLOW)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for s in (16, 32, 48, 128):
        im = draw_icon(s)
        im.save(OUT / f"icon-{s}.png", "PNG")
    print(f"Wrote icons to {OUT}")


if __name__ == "__main__":
    main()
