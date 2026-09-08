#!/usr/bin/env python3
"""Delete bucket objects that nothing on the site links to.

After the photos were republished at web size, the camera originals sat in
the bucket with nothing pointing at them. This removes exactly that: every
object whose name appears nowhere in the key-value table.

Two things are never touched. Anything the site references, obviously — the
same lookup the de-duplicator uses, and a run that finds no references at all
refuses to continue rather than treating the whole bucket as dead. And
anything under a protected prefix (``web/`` by default), because the smaller
and WebP variants are deliberately kept for a later ``<picture>`` upgrade even
though no page links them yet.

Nothing is deleted without ``--apply``, and the full list is written to the
manifest before the first delete call.

Usage::

    export SUPABASE_URL=https://<ref>.supabase.co
    export SUPABASE_SERVICE_KEY=<service_role key>

    python prune_unused.py --bucket portfolio-images-0951c59e
    python prune_unused.py --bucket portfolio-images-0951c59e --apply
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Iterable, Sequence

from dedupe_storage import (
    DEFAULT_KV_TABLE,
    StorageBlocked,
    StorageClient,
    StorageObject,
    megabytes,
)

DEFAULT_PROTECT = ("web/",)
DEFAULT_MANIFEST = "prune-manifest.json"


def plan(
    objects: Iterable[StorageObject],
    in_use: Iterable[str],
    *,
    protect: Sequence[str] = DEFAULT_PROTECT,
) -> dict[str, Any]:
    """Split the bucket into what goes and what stays, and say why."""
    objects = list(objects)
    in_use = set(in_use)
    delete: list[dict[str, Any]] = []
    kept_in_use = 0
    kept_protected = 0

    for obj in sorted(objects, key=lambda o: o.name):
        if obj.name in in_use:
            kept_in_use += 1
            continue
        if any(obj.name.startswith(prefix) for prefix in protect):
            kept_protected += 1
            continue
        delete.append({"name": obj.name, "size": obj.size})

    total = sum(o.size for o in objects)
    freed = sum(item["size"] for item in delete)
    return {
        "bucket": None,
        "protected_prefixes": list(protect),
        "totals": {
            "objects": len(objects),
            "in_use": kept_in_use,
            "protected": kept_protected,
            "to_delete": len(delete),
            "bytes_before": total,
            "bytes_freed": freed,
            "bytes_after": total - freed,
        },
        "delete": delete,
    }


def report(manifest: dict[str, Any]) -> str:
    t = manifest["totals"]
    return "\n".join([
        f"Objecten          {t['objects']}, {megabytes(t['bytes_before'])}",
        f"In gebruik        {t['in_use']} (blijven)",
        f"Beschermd         {t['protected']} onder {', '.join(manifest['protected_prefixes'])} (blijven)",
        f"Te verwijderen    {t['to_delete']}, {megabytes(t['bytes_freed'])}",
        f"Daarna            {megabytes(t['bytes_after'])}",
    ])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Delete bucket objects nothing links to.",
    )
    parser.add_argument("--bucket", required=True, help="Bucket to prune.")
    parser.add_argument(
        "--apply", action="store_true", help="Actually delete. Without this nothing goes."
    )
    parser.add_argument(
        "--protect",
        nargs="*",
        default=list(DEFAULT_PROTECT),
        help="Name prefixes to keep even when unreferenced (default: web/).",
    )
    parser.add_argument("--kv-table", default=DEFAULT_KV_TABLE, help="Table with the site data.")
    parser.add_argument(
        "--manifest", type=Path, default=Path(DEFAULT_MANIFEST),
        help=f"Where the list is written (default: {DEFAULT_MANIFEST}).",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("Zet SUPABASE_URL en SUPABASE_SERVICE_KEY in je omgeving.", file=sys.stderr)
        return 2

    client = StorageClient(url, key)
    try:
        objects = client.list_objects(args.bucket)
        in_use = client.in_use_names(args.bucket, args.kv_table)
    except StorageBlocked as err:
        print(err, file=sys.stderr)
        return 3

    if not objects:
        print(f"Geen bestanden gevonden in {args.bucket}.")
        return 0
    if not in_use:
        print(
            "Geweigerd: geen enkele foto gevonden als 'in gebruik'. Dan zou dit "
            "de hele bucket leegmaken. Controleer --kv-table.",
            file=sys.stderr,
        )
        return 2

    manifest = plan(objects, in_use, protect=args.protect)
    manifest["bucket"] = args.bucket
    args.manifest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(report(manifest))
    print(f"\nLijst geschreven naar {args.manifest}")

    names = [item["name"] for item in manifest["delete"]]
    if not args.apply:
        print("Droogtest — er is niets verwijderd. Voeg --apply toe om door te zetten.")
        return 0
    if not names:
        print("Niets te verwijderen.")
        return 0

    print(f"\n{len(names)} bestanden verwijderen…")
    for start in range(0, len(names), 50):
        client.delete(args.bucket, names[start : start + 50])
    print(f"Klaar. {megabytes(manifest['totals']['bytes_freed'])} vrijgemaakt.")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
