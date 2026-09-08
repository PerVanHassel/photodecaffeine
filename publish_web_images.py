#!/usr/bin/env python3
"""Replace the full-size photos the site serves with web-ready versions.

The portfolio links straight at the camera originals — around eight megabytes
each. That is what fills the storage quota and what every visitor downloads.
This script closes the loop between the other two tools: it takes the photos
the site actually uses, renders the variants, uploads them, and repoints the
stored URLs at the new files.

Per photo::

    download original -> render WebP + JPEG per width -> upload -> repoint URL

The URL in the key-value table is moved to the widest JPEG, so the site keeps
working with a plain <img src> and no frontend change. The WebP variants are
uploaded alongside, ready for a <picture> block later; the manifest lists them.

Photos that share a name and a size are the same shot uploaded twice, so they
are rendered once and every copy's URL points at that one result.

Nothing changes unless you pass ``--apply``, and ``--apply`` needs a
``--work-dir``: every original is downloaded there first, so there is a full
local copy before a single URL moves. The key-value rows are written to a
backup file before any of them is rewritten, and the originals are only
removed when you also pass ``--delete-originals`` — after the rewrite has been
read back and verified.

Usage::

    export SUPABASE_URL=https://<ref>.supabase.co
    export SUPABASE_SERVICE_KEY=<service_role key>

    python publish_web_images.py --bucket portfolio-images-0951c59e
    python publish_web_images.py --bucket portfolio-images-0951c59e \\
        --work-dir ./originals --limit 3 --apply
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Sequence

from dedupe_storage import (
    DEFAULT_KV_TABLE,
    StorageBlocked,
    StorageClient,
    StorageObject,
    extract_names,
    megabytes,
)
from optimize_images import DEFAULT_QUALITY, render, slugify

DEFAULT_WIDTHS = (2560, 1280)
DEFAULT_PREFIX = "web"
DEFAULT_BACKUP = "kv-backup.json"
DEFAULT_MANIFEST = "publish-manifest.json"
CONTENT_TYPES = {".webp": "image/webp", ".jpg": "image/jpeg"}


@dataclass
class Job:
    """One photo to convert, plus every stored name that points at it."""

    source: StorageObject
    # Slugged from the full object name, stamp included, so two different
    # photos do not land on the same output file. build_jobs guarantees it is
    # unique across the batch.
    slug: str = ""
    aliases: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.slug = self.slug or slugify(self.source.name)

    @property
    def names(self) -> list[str]:
        return [self.source.name, *self.aliases]


def public_url(base: str, bucket: str, name: str) -> str:
    return f"{base.rstrip('/')}/storage/v1/object/public/{bucket}/{name}"


def build_jobs(objects: Iterable[StorageObject], in_use: Iterable[str]) -> list[Job]:
    """One job per distinct photo the site uses.

    Copies sharing a basename and a byte count are the same shot uploaded
    twice; they become aliases of a single job rather than separate renders.
    """
    in_use = set(in_use)
    jobs: dict[tuple[str, int], Job] = {}
    taken: set[str] = set()
    for obj in sorted(
        (o for o in objects if o.name in in_use), key=lambda o: o.sort_key
    ):
        key = (obj.basename.lower(), obj.size)
        if key in jobs:
            jobs[key].aliases.append(obj.name)
            continue
        slug = slugify(obj.name)
        if slug in taken:
            # Two unrelated names that slug the same would otherwise share an
            # output file, and the second would silently inherit the first.
            suffix = 2
            while f"{slug}-{suffix}" in taken:
                suffix += 1
            slug = f"{slug}-{suffix}"
        taken.add(slug)
        jobs[key] = Job(source=obj, slug=slug)
    return [jobs[key] for key in sorted(jobs)]


def rewrite_value(value: Any, mapping: dict[str, str]) -> Any:
    """Swap old URLs for new ones anywhere inside a stored value.

    Whole strings are matched, never substrings: a plain text replace would
    also rewrite a longer URL that happens to start with a shorter one, and
    quietly corrupt it. Values are sometimes a JSON object and sometimes a
    JSON string holding more JSON, so nested text is decoded and re-encoded —
    whatever shape went in comes out.
    """
    if isinstance(value, str):
        if value in mapping:
            return mapping[value]
        if value.lstrip()[:1] in ("{", "["):
            try:
                inner = json.loads(value)
            except ValueError:
                return value
            return json.dumps(rewrite_value(inner, mapping))
        return value
    if isinstance(value, list):
        return [rewrite_value(item, mapping) for item in value]
    if isinstance(value, dict):
        return {k: rewrite_value(v, mapping) for k, v in value.items()}
    return value


def url_mapping(
    jobs: Sequence[Job], results: dict[str, str], base: str, bucket: str
) -> dict[str, str]:
    """Old public URL -> new public URL, for every name a job covers."""
    mapping: dict[str, str] = {}
    for job in jobs:
        new = results.get(job.slug)
        if not new:
            continue
        for name in job.names:
            mapping[public_url(base, bucket, name)] = new
    return mapping


def remaining_references(rows: Iterable[dict[str, Any]], mapping: dict[str, str]) -> list[str]:
    """Keys still carrying an old URL. Should be empty after a rewrite."""
    stale = []
    for row in rows:
        blob = json.dumps(row.get("value"))
        if any(old in blob for old in mapping):
            stale.append(row.get("key"))
    return stale


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Render, upload and link web-sized versions of the photos in use.",
    )
    parser.add_argument("--bucket", required=True, help="Bucket holding the photos.")
    parser.add_argument(
        "--apply", action="store_true", help="Actually upload and rewrite."
    )
    parser.add_argument(
        "--work-dir",
        type=Path,
        help="Where originals are downloaded and variants rendered. Needed with --apply.",
    )
    parser.add_argument(
        "--prefix",
        default=DEFAULT_PREFIX,
        help=f"Folder in the bucket for the variants (default: {DEFAULT_PREFIX}).",
    )
    parser.add_argument(
        "--widths", nargs="+", type=int, default=list(DEFAULT_WIDTHS),
        help=f"Widths to render (default: {' '.join(map(str, DEFAULT_WIDTHS))}).",
    )
    parser.add_argument(
        "--quality", type=int, default=DEFAULT_QUALITY, help="Encoder quality 1-100."
    )
    parser.add_argument(
        "--limit", type=int, help="Only do the first N photos. Good for a trial run."
    )
    parser.add_argument(
        "--delete-originals",
        action="store_true",
        help="Remove the originals once the rewrite is verified.",
    )
    parser.add_argument("--kv-table", default=DEFAULT_KV_TABLE, help="Table with the site data.")
    parser.add_argument(
        "--backup", type=Path, default=Path(DEFAULT_BACKUP),
        help=f"Where the untouched rows are saved (default: {DEFAULT_BACKUP}).",
    )
    parser.add_argument(
        "--manifest", type=Path, default=Path(DEFAULT_MANIFEST),
        help=f"Where the result is written (default: {DEFAULT_MANIFEST}).",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.apply and not args.work_dir:
        print(
            "Geweigerd: --apply vereist --work-dir, zodat de originelen eerst "
            "lokaal staan voordat er iets verandert.",
            file=sys.stderr,
        )
        return 2
    if not 1 <= args.quality <= 100:
        print("--quality moet tussen 1 en 100 liggen.", file=sys.stderr)
        return 2

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("Zet SUPABASE_URL en SUPABASE_SERVICE_KEY in je omgeving.", file=sys.stderr)
        return 2

    client = StorageClient(url, key)
    try:
        objects = client.list_objects(args.bucket)
    except StorageBlocked as err:
        print(err, file=sys.stderr)
        return 3
    in_use = client.in_use_names(args.bucket, args.kv_table)
    if not in_use:
        print(
            "Geweigerd: geen enkele foto gevonden als 'in gebruik'. Controleer "
            "--kv-table; doorgaan zou niets opleveren.",
            file=sys.stderr,
        )
        return 2

    jobs = build_jobs(objects, in_use)
    if args.limit:
        jobs = jobs[: args.limit]
    if not jobs:
        print("Niets te doen.")
        return 0

    before = sum(o.size for o in objects)
    covered = sum(job.source.size for job in jobs)
    print(
        f"Bucket            {len(objects)} bestanden, {megabytes(before)}\n"
        f"In gebruik        {len(in_use)} namen\n"
        f"Om te verkleinen  {len(jobs)} foto's, {megabytes(covered)}\n"
        f"Varianten         {', '.join(f'{w}px' for w in args.widths)} in WebP en JPEG"
    )

    if not args.apply:
        print(
            "\nDroogtest — er is niets geüpload of gewijzigd. "
            "Voeg --work-dir en --apply toe om door te zetten."
        )
        return 0

    originals = args.work_dir / "originals"
    variants_dir = args.work_dir / "variants"
    results: dict[str, str] = {}
    rendered: list[dict[str, Any]] = []
    base_prefix = args.prefix.strip("/")

    print(f"\n{len(jobs)} foto's verwerken…")
    for index, job in enumerate(jobs, start=1):
        local = originals / job.source.name
        if not (local.exists() and local.stat().st_size == job.source.size):
            client.download(args.bucket, job.source.name, local)

        result = render(
            local,
            variants_dir,
            widths=args.widths,
            quality=args.quality,
            slug=job.slug,
        )
        widest_jpeg = None
        for variant in sorted(result.variants, key=lambda v: -v.width):
            name = f"{base_prefix}/{variant.path.name}" if base_prefix else variant.path.name
            client.upload(
                args.bucket, name, variant.path, CONTENT_TYPES[variant.path.suffix]
            )
            if variant.fmt == "jpeg" and widest_jpeg is None:
                widest_jpeg = public_url(url, args.bucket, name)

        if widest_jpeg is None:
            print(f"  overgeslagen (geen JPEG): {job.source.name}", file=sys.stderr)
            continue
        results[job.slug] = widest_jpeg
        rendered.append(
            {
                "original": job.source.name,
                "also_used_as": job.aliases,
                "original_bytes": job.source.size,
                "url": widest_jpeg,
                "variants": [
                    {
                        "file": f"{base_prefix}/{v.path.name}" if base_prefix else v.path.name,
                        "width": v.width,
                        "format": v.fmt,
                        "bytes": v.bytes,
                    }
                    for v in sorted(result.variants, key=lambda v: (-v.width, v.fmt))
                ],
            }
        )
        if index % 10 == 0 or index == len(jobs):
            print(f"  {index}/{len(jobs)}")

    mapping = url_mapping(jobs, results, url, args.bucket)
    rows = client.kv_rows(args.kv_table)
    args.backup.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"\n{len(rows)} rijen veiliggesteld in {args.backup}")

    changed = 0
    for row in rows:
        updated = rewrite_value(row["value"], mapping)
        if updated == row["value"]:
            continue
        client.kv_set(row["key"], updated, args.kv_table)
        changed += 1
    print(f"{changed} rijen bijgewerkt")

    stale = remaining_references(client.kv_rows(args.kv_table), mapping)
    if stale:
        print(
            f"Let op: {len(stale)} rijen wijzen nog naar een oude foto "
            f"({', '.join(stale[:5])}). Er is niets verwijderd.",
            file=sys.stderr,
        )

    new_bytes = sum(v["bytes"] for item in rendered for v in item["variants"])
    manifest = {
        "bucket": args.bucket,
        "prefix": base_prefix,
        "widths": args.widths,
        "quality": args.quality,
        "photos": len(rendered),
        "original_bytes": sum(item["original_bytes"] for item in rendered),
        "web_bytes": new_bytes,
        "rows_updated": changed,
        "rows_still_stale": stale,
        "originals_deleted": [],
        "images": rendered,
    }

    if args.delete_originals and not stale:
        doomed = [name for job in jobs for name in job.names if job.slug in results]
        print(f"\n{len(doomed)} originelen verwijderen…")
        for start in range(0, len(doomed), 50):
            client.delete(args.bucket, doomed[start : start + 50])
        manifest["originals_deleted"] = doomed
    elif args.delete_originals:
        print("Originelen blijven staan zolang er rijen naar wijzen.", file=sys.stderr)

    args.manifest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(
        f"\nOrigineel  {megabytes(manifest['original_bytes'])}\n"
        f"Web        {megabytes(new_bytes)}\n"
        f"Verslag    {args.manifest}"
    )
    return 1 if stale else 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
