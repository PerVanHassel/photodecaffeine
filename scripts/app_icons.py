"""
Every app icon and favicon, drawn from the PDC mark the designer supplied
(src/imports/pdc-mark.svg): cream on the dark brown of the brand's own icon.

    uv run --with resvg-py --with pillow python scripts/app_icons.py

Writes the admin app's PWA icons (public/icons), the site's favicon and
apple-touch-icon, and the Expo app's icons (mobile/assets).
"""

import io
import re
from pathlib import Path

import resvg_py
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "src/imports/pdc-mark.svg"

CREAM = "#fffbe0"
BROWN = "#3e250a"

# The visible mark (P to C, top to bottom) in the source file's units.
MARK_X, MARK_Y, MARK_W, MARK_H = 37.45, 93.18, 209.45, 97.08


def mark_shapes() -> str:
    """The mark as plain shapes; the aperture blades are clipped to the D's counter."""
    paths = re.findall(r'<path class="(st\d)" d="([^"]+)"/>', SOURCE.read_text(encoding="utf-8"))
    # Illustrator's export order: the counter (clip path), eight blades, the C
    # twice, the P twice (the even-odd one first), the D, then a hidden layer.
    classes = [cls for cls, _ in paths]
    assert classes[:14] == ["st0"] + ["st2"] * 10 + ["st1", "st2", "st2"], f"unexpected layout: {classes}"
    clip, blades = paths[0][1], [d for _, d in paths[1:9]]
    c, p, d = paths[9][1], paths[11][1], paths[13][1]
    blade_paths = "".join(f'<path d="{b}"/>' for b in blades)
    return (
        f'<clipPath id="counter"><path d="{clip}"/></clipPath>'
        f'<g clip-path="url(#counter)">{blade_paths}</g>'
        f'<path d="{c}"/><path fill-rule="evenodd" d="{p}"/><path d="{d}"/>'
    )


def icon_svg(mark: float, background: str | None = None, radius: float = 0) -> str:
    """A 100 x 100 icon with the mark `mark` of the width wide, centred."""
    k = mark * 100 / MARK_W
    tx = (100 - MARK_W * k) / 2 - MARK_X * k
    ty = (100 - MARK_H * k) / 2 - MARK_Y * k
    tile = f'<rect width="100" height="100" rx="{radius:g}" fill="{background}"/>' if background else ""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        f'{tile}<g fill="{CREAM}" transform="matrix({k:.5f} 0 0 {k:.5f} {tx:.3f} {ty:.3f})">{mark_shapes()}</g></svg>'
    )


def render(svg: str, size: int) -> Image.Image:
    png = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size)
    return Image.open(io.BytesIO(bytes(png))).convert("RGBA")


def save(image: Image.Image, relative: str) -> None:
    path = ROOT / relative
    image.save(path, optimize=True)
    print(f"{relative}  {image.width}x{image.height}  {path.stat().st_size // 1024} KB")


def main() -> None:
    # App icons fill the square; iOS and Android round the corners themselves.
    # At 59% wide the mark also stays inside the maskable safe zone.
    tile = icon_svg(0.59, BROWN)
    for relative, size in [
        ("public/icons/icon-1024.png", 1024),
        ("public/icons/icon-512.png", 512),
        ("public/icons/icon-192.png", 192),
        ("public/icons/icon-180.png", 180),
        ("public/apple-touch-icon.png", 180),
        ("mobile/assets/icon.png", 1024),
        ("mobile/assets/favicon.png", 192),
    ]:
        save(render(tile, size), relative)

    # Android shows only the middle two thirds of an adaptive icon's foreground
    # (the background colour is in mobile/app.json), so the mark is drawn smaller.
    save(render(icon_svg(0.39), 1024), "mobile/assets/adaptive-icon.png")
    save(render(icon_svg(0.6), 512), "mobile/assets/splash-icon.png")

    # Browser tabs: a rounded tile with a bigger mark, so it still reads at 16 px.
    favicon = icon_svg(0.86, BROWN, radius=19)
    (ROOT / "public/favicon.svg").write_text(favicon + "\n", encoding="utf-8")
    print("public/favicon.svg")
    sizes = [render(favicon, s) for s in (16, 32, 48)]
    sizes[-1].save(ROOT / "public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=sizes[:-1])
    print("public/favicon.ico  16, 32, 48")


if __name__ == "__main__":
    main()
