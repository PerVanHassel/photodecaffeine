"""Tests for the image optimiser.

Real images are generated on the fly, so the assertions are about actual
encoded output: dimensions, aspect ratio, formats written, and the markup.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from optimize_images import (  # noqa: E402
    alt_from_slug,
    build_manifest,
    build_parser,
    find_sources,
    main,
    picture_markup,
    render,
    slugify,
    target_widths,
)


@pytest.fixture
def photo(tmp_path: Path):
    """A landscape source image of a given size."""

    def make(width: int = 4000, height: int = 3000, name: str = "DSC0155.JPG") -> Path:
        path = tmp_path / name
        # Smooth tonal variation, like a real photograph. A flat colour would
        # encode to the same size at every quality, and pixel noise would
        # compress unlike anything a camera produces — both make the size
        # assertions meaningless. Painted small and scaled up, which is
        # instant compared with a per-pixel loop over millions of pixels.
        seed = Image.new("RGB", (64, 48))
        seed.putdata(
            [
                ((x * 4) % 256, (y * 5 + x) % 256, (x * y) % 256)
                for y in range(48)
                for x in range(64)
            ]
        )
        seed.resize((width, height), Image.BICUBIC).save(path, "JPEG", quality=95)
        return path

    return make


# --- slug and alt ----------------------------------------------------------


def test_slugify_lowercases_and_hyphenates():
    assert slugify("DSC 0155 Final.JPG") == "dsc-0155-final"


def test_slugify_collapses_runs_of_separators():
    assert slugify("a___b---c.jpg") == "a-b-c"


def test_slugify_strips_leading_and_trailing_separators():
    assert slugify("--roffa--.jpg") == "roffa"


def test_slugify_falls_back_when_nothing_survives():
    assert slugify("!!!.jpg") == "image"


def test_alt_reads_as_a_sentence():
    assert alt_from_slug("roffa-motion-winter") == "Roffa motion winter"


def test_alt_has_a_fallback():
    assert alt_from_slug("") == "Foto"


# --- width selection -------------------------------------------------------


def test_widths_narrower_than_the_source_are_kept():
    assert target_widths(4000, [3840, 2560, 1280]) == [3840, 2560, 1280]


def test_widths_wider_than_the_source_are_dropped():
    assert target_widths(2000, [3840, 2560, 1280]) == [1280]


def test_a_width_equal_to_the_source_is_kept():
    assert target_widths(2560, [3840, 2560]) == [2560]


def test_source_width_is_used_when_every_request_is_too_wide():
    assert target_widths(800, [3840, 2560, 1280]) == [800]


def test_widths_are_deduplicated_and_ordered():
    assert target_widths(4000, [1280, 3840, 1280]) == [3840, 1280]


def test_non_positive_widths_are_ignored():
    assert target_widths(4000, [0, -100, 1280]) == [1280]


# --- rendering -------------------------------------------------------------


def test_render_writes_webp_and_jpeg_for_each_width(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[2560, 1280])
    names = sorted(v.path.name for v in result.variants)
    assert names == [
        "dsc0155-1280.jpg",
        "dsc0155-1280.webp",
        "dsc0155-2560.jpg",
        "dsc0155-2560.webp",
    ]


def test_render_files_actually_exist(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[1280])
    assert all(v.path.exists() and v.path.stat().st_size > 0 for v in result.variants)


def test_render_hits_the_requested_width(photo, tmp_path):
    render(photo(4000, 3000), tmp_path / "out", widths=[1280])
    with Image.open(tmp_path / "out" / "dsc0155-1280.jpg") as img:
        assert img.width == 1280


def test_render_keeps_the_aspect_ratio(photo, tmp_path):
    render(photo(4000, 3000), tmp_path / "out", widths=[1280])
    with Image.open(tmp_path / "out" / "dsc0155-1280.jpg") as img:
        assert img.size == (1280, 960)


def test_render_handles_portrait_sources(photo, tmp_path):
    render(photo(3000, 4000), tmp_path / "out", widths=[1500])
    with Image.open(tmp_path / "out" / "dsc0155-1500.jpg") as img:
        assert img.size == (1500, 2000)


def test_render_never_upscales(photo, tmp_path):
    result = render(photo(1000, 750), tmp_path / "out", widths=[3840, 2560, 1280])
    assert result.widths == [1000]


def test_render_records_the_source_size(photo, tmp_path):
    result = render(photo(4000, 3000), tmp_path / "out", widths=[1280])
    assert (result.source_width, result.source_height) == (4000, 3000)


def test_render_reuses_existing_files_unless_forced(photo, tmp_path):
    source, out = photo(), tmp_path / "out"
    render(source, out, widths=[1280])
    target = out / "dsc0155-1280.jpg"
    target.write_bytes(b"stale")
    render(source, out, widths=[1280])
    assert target.read_bytes() == b"stale"


def test_force_re_encodes(photo, tmp_path):
    source, out = photo(), tmp_path / "out"
    render(source, out, widths=[1280])
    target = out / "dsc0155-1280.jpg"
    target.write_bytes(b"stale")
    render(source, out, widths=[1280], force=True)
    assert target.read_bytes() != b"stale"


def test_lower_quality_makes_smaller_files(photo, tmp_path):
    big = render(photo(), tmp_path / "hi", widths=[1280], quality=95)
    small = render(photo(), tmp_path / "lo", widths=[1280], quality=40)
    hi = next(v for v in big.variants if v.fmt == "jpeg")
    lo = next(v for v in small.variants if v.fmt == "jpeg")
    assert lo.bytes < hi.bytes


def test_webp_is_smaller_than_jpeg_at_the_same_width(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[1280])
    webp = next(v for v in result.variants if v.fmt == "webp")
    jpeg = next(v for v in result.variants if v.fmt == "jpeg")
    assert webp.bytes <= jpeg.bytes


def test_output_is_rgb_even_from_a_grayscale_source(tmp_path):
    source = tmp_path / "grey.jpg"
    Image.new("L", (2000, 1500), 128).save(source, "JPEG")
    render(source, tmp_path / "out", widths=[1280])
    with Image.open(tmp_path / "out" / "grey-1280.jpg") as img:
        assert img.mode == "RGB"


def test_png_with_transparency_is_flattened_to_jpeg(tmp_path):
    source = tmp_path / "logo.png"
    Image.new("RGBA", (2000, 1500), (10, 20, 30, 128)).save(source, "PNG")
    result = render(source, tmp_path / "out", widths=[1280])
    assert (tmp_path / "out" / "logo-1280.jpg").exists()
    assert len(result.variants) == 2


# --- markup and manifest ---------------------------------------------------


def test_markup_lists_every_width_in_both_formats(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[2560, 1280])
    html = picture_markup(result, "/images", "100vw")
    for width in (2560, 1280):
        assert f"/images/dsc0155-{width}.webp {width}w" in html
        assert f"/images/dsc0155-{width}.jpg {width}w" in html


def test_markup_falls_back_to_the_largest_jpeg(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[2560, 1280])
    assert 'src="/images/dsc0155-2560.jpg"' in picture_markup(result, "/images", "100vw")


def test_markup_carries_the_sizes_attribute(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[1280])
    assert 'sizes="33vw"' in picture_markup(result, "/images", "33vw")


def test_markup_is_lazy_and_async(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[1280])
    html = picture_markup(result, "/images", "100vw")
    assert 'loading="lazy"' in html and 'decoding="async"' in html


def test_markup_tolerates_a_trailing_slash_on_the_base_url(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[1280])
    assert "//dsc0155" not in picture_markup(result, "/images/", "100vw")


def test_manifest_describes_every_variant(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[2560, 1280])
    manifest = build_manifest([result], "/images", "100vw")
    assert manifest["image_count"] == 1
    assert len(manifest["images"][0]["variants"]) == 4


def test_manifest_variants_are_widest_first(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[1280, 2560])
    manifest = build_manifest([result], "/images", "100vw")
    widths = [v["width"] for v in manifest["images"][0]["variants"]]
    assert widths == sorted(widths, reverse=True)


def test_manifest_is_serialisable(photo, tmp_path):
    result = render(photo(), tmp_path / "out", widths=[1280])
    json.dumps(build_manifest([result], "/images", "100vw"))


# --- discovery and the CLI -------------------------------------------------


def test_find_sources_picks_up_images_and_ignores_the_rest(tmp_path):
    Image.new("RGB", (10, 10)).save(tmp_path / "a.jpg")
    (tmp_path / "notes.txt").write_text("x")
    assert [p.name for p in find_sources(tmp_path)] == ["a.jpg"]


def test_find_sources_recurses(tmp_path):
    nested = tmp_path / "2026" / "shoot"
    nested.mkdir(parents=True)
    Image.new("RGB", (10, 10)).save(nested / "b.jpg")
    assert [p.name for p in find_sources(tmp_path)] == ["b.jpg"]


def test_main_writes_the_manifest_and_snippets(photo, tmp_path):
    source_dir = photo().parent
    out = tmp_path / "web"
    assert main(["-i", str(source_dir), "-o", str(out), "--widths", "1280"]) == 0
    assert (out / "manifest.json").exists()
    assert (out / "srcset-snippets.html").exists()


def test_main_rejects_a_missing_input_directory(tmp_path, capsys):
    assert main(["-i", str(tmp_path / "nope"), "-o", str(tmp_path / "out")]) == 2
    assert "bestaat niet" in capsys.readouterr().err


def test_main_rejects_an_out_of_range_quality(photo, tmp_path, capsys):
    source_dir = photo().parent
    code = main(["-i", str(source_dir), "-o", str(tmp_path / "o"), "--quality", "200"])
    assert code == 2
    assert "quality" in capsys.readouterr().err


def test_main_reports_an_empty_input_directory(tmp_path, capsys):
    empty = tmp_path / "empty"
    empty.mkdir()
    assert main(["-i", str(empty), "-o", str(tmp_path / "out")]) == 1
    assert "Geen afbeeldingen" in capsys.readouterr().err


def test_main_skips_a_corrupt_file_and_keeps_going(photo, tmp_path):
    source_dir = photo().parent
    (source_dir / "broken.jpg").write_bytes(b"not an image")
    out = tmp_path / "web"
    assert main(["-i", str(source_dir), "-o", str(out), "--widths", "1280"]) == 0
    manifest = json.loads((out / "manifest.json").read_text())
    assert manifest["image_count"] == 1


def test_input_and_output_are_required():
    with pytest.raises(SystemExit):
        build_parser().parse_args([])


def test_render_can_be_given_its_own_slug(photo, tmp_path):
    # publish_web_images needs unique names across a batch, so it overrides.
    result = render(photo(), tmp_path / "out", widths=[1280], slug="klant-01")
    assert [v.path.name for v in result.variants] == ["klant-01-1280.webp", "klant-01-1280.jpg"]
