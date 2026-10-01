#!/usr/bin/env python3
"""Build the web versions of the photos and logo the public site imports.

The originals in src/imports are camera files — up to 9 MB and 20,000 px wide
for the logo — and were shipped to every visitor as they were. This writes
right-sized WebP copies to src/assets/web, which is what the components import.
Run it again after replacing an original:

    uv run --with pillow python scripts/site_images.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "imports"
OUT = ROOT / "src" / "assets" / "web"

# The logo is 20834 x 8335; Pillow's bomb guard is meant for untrusted input.
Image.MAX_IMAGE_PIXELS = None

# source file -> (output name, widths). Widths cover the largest rendered size
# at 2x density; a source is never scaled up.
PHOTOS = {
    "IMG_0114_TIF.jpg": ("per", (1600,)),
    "IMG_0115_TIF.jpg": ("ryan", (1000,)),
    "IMG_9694.jpg": ("majd", (800, 1365)),
    "_DSC0893.jpg": ("automotive-hero", (1000, 1920)),
    "_MAJ2869_1_.jpeg": ("hero-frame", (800,)),
    "webContent/shared124.jpeg": ("darkroom", (1200,)),
}


def save_webp(img: Image.Image, path: Path, quality: int) -> None:
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"{path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for source, (name, widths) in PHOTOS.items():
        with Image.open(SRC / source) as original:
            img = ImageOps.exif_transpose(original).convert("RGB")
            for width in widths:
                w = min(width, img.width)
                resized = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
                save_webp(resized, OUT / f"{name}-{w}.webp", quality=80)


if __name__ == "__main__":
    main()
