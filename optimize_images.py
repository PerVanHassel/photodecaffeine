#!/usr/bin/env python3
"""Turn full-size photos into web-ready variants.

For every source image this writes a WebP and a JPEG at each requested width,
plus a manifest and ready-made ``<picture>`` markup. Sources are read only —
your originals are never touched.

What it takes care of, because a browser won't:

* Never upscales. A 2000px original yields 1280px only; asking for 3840px
  would just re-encode the same pixels into a bigger, blurrier file.
* Applies the EXIF orientation, so portrait shots stop appearing sideways.
* Converts Adobe RGB (and anything else with a profile) to sRGB, so colours
  don't wash out in browsers that ignore embedded profiles.
* Drops GPS and camera metadata, keeps copyright.

Usage::

    python optimize_images.py -i ./originals -o ./web --base-url /images
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Sequence

from PIL import Image, ImageCms, ImageOps

DEFAULT_WIDTHS = (3840, 2560, 1280)
DEFAULT_QUALITY = 85
DEFAULT_SIZES = "(max-width: 800px) 100vw, 1600px"
SOURCE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}

# EXIF tag 0x8298 is Copyright; 0x8825 is the GPS IFD pointer.
EXIF_COPYRIGHT = 0x8298
EXIF_GPS_IFD = 0x8825


@dataclass
class Variant:
    """One rendered file."""

    path: Path
    width: int
    height: int
    fmt: str
    bytes: int


@dataclass
class Result:
    """Everything produced for a single source image."""

    source: Path
    slug: str
    source_width: int
    source_height: int
    variants: list[Variant] = field(default_factory=list)

    @property
    def widths(self) -> list[int]:
        return sorted({v.width for v in self.variants}, reverse=True)


def slugify(name: str) -> str:
    """A filename-safe, URL-safe stem: lowercase, hyphens, nothing exotic."""
    stem = Path(name).stem.lower()
    stem = re.sub(r"[^a-z0-9]+", "-", stem)
    stem = re.sub(r"-{2,}", "-", stem).strip("-")
    return stem or "image"


def alt_from_slug(slug: str) -> str:
    """A placeholder alt text. Meant to be replaced by a real description."""
    words = [w for w in slug.split("-") if w]
    return " ".join(words).capitalize() if words else "Foto"


def target_widths(source_width: int, widths: Iterable[int]) -> list[int]:
    """The requested widths that make sense for this image.

    Anything wider than the source is dropped. If every requested width is too
    large, the source's own width is used so there is still one variant.
    """
    usable = sorted({w for w in widths if w > 0 and w <= source_width}, reverse=True)
    return usable or [source_width]


def to_srgb(image: Image.Image) -> Image.Image:
    """Convert to sRGB, using the embedded profile when there is one."""
    profile = image.info.get("icc_profile")
    if profile:
        try:
            source = ImageCms.ImageCmsProfile(io.BytesIO(profile))
            image = ImageCms.profileToProfile(
                image, source, ImageCms.createProfile("sRGB"), outputMode="RGB"
            )
        except Exception:
            # A broken or unusual profile shouldn't cost us the whole image;
            # the pixels are very nearly sRGB in practice.
            image = image.convert("RGB")
    elif image.mode != "RGB":
        image = image.convert("RGB")
    return image


def copyright_exif(image: Image.Image) -> bytes | None:
    """The source's copyright tag on its own, with GPS and the rest removed."""
    try:
        exif = image.getexif()
    except Exception:
        return None
    note = exif.get(EXIF_COPYRIGHT)
    if not note:
        return None
    clean = Image.Exif()
    clean[EXIF_COPYRIGHT] = note
    # Belt and braces: never carry a GPS pointer into the output.
    clean.pop(EXIF_GPS_IFD, None)
    return clean.tobytes()


def load_prepared(path: Path) -> Image.Image:
    """Open an image upright, in sRGB, ready to be resized."""
    image = Image.open(path)
    image = ImageOps.exif_transpose(image)
    return to_srgb(image)


def render(
    source: Path,
    out_dir: Path,
    *,
    widths: Sequence[int] = DEFAULT_WIDTHS,
    quality: int = DEFAULT_QUALITY,
    force: bool = False,
) -> Result:
    """Write every variant for one image and describe what was written."""
    with Image.open(source) as probe:
        upright = ImageOps.exif_transpose(probe)
        source_width, source_height = upright.size
        exif = copyright_exif(probe)

    prepared = load_prepared(source)
    slug = slugify(source.name)
    result = Result(
        source=source, slug=slug, source_width=source_width, source_height=source_height
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    for width in target_widths(source_width, widths):
        height = max(1, round(source_height * width / source_width))
        resized = (
            prepared
            if (width, height) == prepared.size
            else prepared.resize((width, height), Image.LANCZOS)
        )
        for fmt, suffix in (("WEBP", ".webp"), ("JPEG", ".jpg")):
            target = out_dir / f"{slug}-{width}{suffix}"
            if target.exists() and not force:
                result.variants.append(
                    Variant(target, width, height, fmt.lower(), target.stat().st_size)
                )
                continue
            save_kwargs: dict[str, Any] = {"quality": quality}
            if fmt == "JPEG":
                save_kwargs["progressive"] = True
                save_kwargs["optimize"] = True
            if exif:
                save_kwargs["exif"] = exif
            resized.save(target, fmt, **save_kwargs)
            result.variants.append(
                Variant(target, width, height, fmt.lower(), target.stat().st_size)
            )
    prepared.close()
    return result


def picture_markup(result: Result, base_url: str, sizes: str) -> str:
    """A <picture> block: WebP first, JPEG as the fallback every browser reads."""
    base = base_url.rstrip("/")
    widths = result.widths
    webp = ",\n                  ".join(
        f"{base}/{result.slug}-{w}.webp {w}w" for w in widths
    )
    jpeg = ",\n               ".join(f"{base}/{result.slug}-{w}.jpg {w}w" for w in widths)
    largest = widths[0]
    return (
        "<picture>\n"
        '  <source type="image/webp"\n'
        f'          srcset="{webp}"\n'
        f'          sizes="{sizes}">\n'
        f'  <img src="{base}/{result.slug}-{largest}.jpg"\n'
        f'       srcset="{jpeg}"\n'
        f'       sizes="{sizes}"\n'
        f'       alt="{alt_from_slug(result.slug)}" loading="lazy" decoding="async">\n'
        "</picture>"
    )


def build_manifest(results: Sequence[Result], base_url: str, sizes: str) -> dict[str, Any]:
    base = base_url.rstrip("/")
    images = []
    for result in results:
        images.append(
            {
                "source": result.source.name,
                "slug": result.slug,
                "source_width": result.source_width,
                "source_height": result.source_height,
                "sizes": sizes,
                "variants": [
                    {
                        "url": f"{base}/{v.path.name}",
                        "file": v.path.name,
                        "width": v.width,
                        "height": v.height,
                        "format": v.fmt,
                        "bytes": v.bytes,
                    }
                    for v in sorted(result.variants, key=lambda v: (-v.width, v.fmt))
                ],
            }
        )
    return {
        "base_url": base,
        "sizes": sizes,
        "image_count": len(results),
        "output_bytes": sum(v.bytes for r in results for v in r.variants),
        "images": images,
    }


def find_sources(input_dir: Path) -> list[Path]:
    return sorted(
        p
        for p in input_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in SOURCE_SUFFIXES
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Make responsive WebP + JPEG variants from full-size photos.",
    )
    parser.add_argument("-i", "--input", required=True, type=Path, help="Source folder.")
    parser.add_argument("-o", "--output", required=True, type=Path, help="Where to write.")
    parser.add_argument(
        "--base-url",
        default="/images",
        help="URL prefix the site serves the variants from (default: /images).",
    )
    parser.add_argument(
        "--widths",
        nargs="+",
        type=int,
        default=list(DEFAULT_WIDTHS),
        help=f"Widths to render (default: {' '.join(map(str, DEFAULT_WIDTHS))}).",
    )
    parser.add_argument(
        "--quality", type=int, default=DEFAULT_QUALITY, help="Encoder quality 1-100."
    )
    parser.add_argument(
        "--sizes",
        default=DEFAULT_SIZES,
        help="The sizes attribute; describes how wide the photo sits on the page.",
    )
    parser.add_argument(
        "--force", action="store_true", help="Re-encode variants that already exist."
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if not args.input.is_dir():
        print(f"Invoermap bestaat niet: {args.input}", file=sys.stderr)
        return 2
    if not 1 <= args.quality <= 100:
        print("--quality moet tussen 1 en 100 liggen.", file=sys.stderr)
        return 2

    sources = find_sources(args.input)
    if not sources:
        print(f"Geen afbeeldingen gevonden in {args.input}.", file=sys.stderr)
        return 1

    results: list[Result] = []
    failures: list[tuple[Path, str]] = []
    for index, source in enumerate(sources, start=1):
        try:
            results.append(
                render(
                    source,
                    args.output,
                    widths=args.widths,
                    quality=args.quality,
                    force=args.force,
                )
            )
        except Exception as err:  # one unreadable file shouldn't stop the batch
            failures.append((source, str(err)))
        if index % 10 == 0 or index == len(sources):
            print(f"  {index}/{len(sources)}")

    if not results:
        print("Geen enkele afbeelding kon verwerkt worden.", file=sys.stderr)
        return 1

    manifest = build_manifest(results, args.base_url, args.sizes)
    (args.output / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    snippets = "\n\n".join(
        f"<!-- {r.source.name} -->\n{picture_markup(r, args.base_url, args.sizes)}"
        for r in results
    )
    (args.output / "srcset-snippets.html").write_text(snippets, encoding="utf-8")

    source_bytes = sum(p.stat().st_size for p in sources)
    print(
        f"\n{len(results)} afbeeldingen verwerkt.\n"
        f"Bron    {source_bytes / 1048576:.1f} MB\n"
        f"Web     {manifest['output_bytes'] / 1048576:.1f} MB\n"
        f"Geschreven naar {args.output} (manifest.json, srcset-snippets.html)"
    )
    if failures:
        print(f"\n{len(failures)} overgeslagen:", file=sys.stderr)
        for path, err in failures:
            print(f"  {path.name}: {err}", file=sys.stderr)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
