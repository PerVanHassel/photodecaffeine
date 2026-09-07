#!/usr/bin/env python3
"""Remove duplicate uploads from a Supabase storage bucket.

The admin panel names every upload ``<epoch-ms>-<original-name>``, so
re-uploading the same photo produces a second object that differs only in its
timestamp prefix. Those copies are what this script collapses: it groups
objects by the name with the prefix stripped, keeps the newest, and deletes the
rest.

Nothing is deleted unless you pass ``--apply``, and ``--apply`` is refused
without ``--download-dir`` so a local copy always exists first. Every planned
deletion is written to the manifest before anything is removed.

By default a group is only collapsed when all its copies are byte-for-byte the
same size. A differing size usually means a real re-edit rather than a repeat
upload, so those groups are skipped and listed in the manifest instead. Pass
``--include-size-mismatch`` to collapse them too, keeping the largest copy.

Usage::

    export SUPABASE_URL=https://<ref>.supabase.co
    export SUPABASE_SERVICE_KEY=<service_role key>

    python dedupe_storage.py --bucket portfolio-images-0951c59e
    python dedupe_storage.py --bucket portfolio-images-0951c59e \\
        --download-dir ./originals --apply
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Sequence

import requests

# The admin panel builds names as `${Date.now()}-${sanitizedOriginalName}`.
# Ten digits or more keeps us from stripping a leading number that is part of
# the photographer's own filename (e.g. "2024-portret.jpg").
TIMESTAMP_PREFIX = re.compile(r"^(?P<stamp>\d{10,})-(?P<rest>.+)$")

LIST_PAGE_SIZE = 100
DEFAULT_MANIFEST = "cleanup-manifest.json"


@dataclass(frozen=True)
class StorageObject:
    """One object in the bucket, reduced to the fields we sort and group on."""

    name: str
    size: int
    created_at: str

    @property
    def basename(self) -> str:
        """The name without the upload timestamp the panel prepends."""
        match = TIMESTAMP_PREFIX.match(self.name)
        return match.group("rest") if match else self.name

    @property
    def stamp(self) -> int:
        """The upload timestamp from the name, or 0 when there isn't one."""
        match = TIMESTAMP_PREFIX.match(self.name)
        return int(match.group("stamp")) if match else 0

    @property
    def sort_key(self) -> tuple[str, int]:
        """Newest last. created_at leads; the name stamp breaks ties."""
        return (self.created_at or "", self.stamp)


@dataclass
class Group:
    """Every object sharing one basename."""

    basename: str
    objects: list[StorageObject] = field(default_factory=list)

    @property
    def newest(self) -> StorageObject:
        return max(self.objects, key=lambda o: o.sort_key)

    @property
    def largest(self) -> StorageObject:
        return max(self.objects, key=lambda o: (o.size, o.sort_key))

    @property
    def sizes_match(self) -> bool:
        return len({o.size for o in self.objects}) == 1

    @property
    def total_bytes(self) -> int:
        return sum(o.size for o in self.objects)


class StorageClient:
    """The slice of the Supabase Storage REST API this script needs."""

    def __init__(self, url: str, service_key: str, *, timeout: int = 60) -> None:
        self.base = url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
            }
        )

    def list_objects(self, bucket: str) -> list[StorageObject]:
        """Every object in the bucket, paging until a short page comes back."""
        objects: list[StorageObject] = []
        offset = 0
        while True:
            response = self.session.post(
                f"{self.base}/storage/v1/object/list/{bucket}",
                json={
                    "prefix": "",
                    "limit": LIST_PAGE_SIZE,
                    "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"},
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            page = response.json()
            objects.extend(parse_objects(page))
            if len(page) < LIST_PAGE_SIZE:
                return objects
            offset += LIST_PAGE_SIZE

    def download(self, bucket: str, name: str, target: Path) -> None:
        response = self.session.get(
            f"{self.base}/storage/v1/object/{bucket}/{name}",
            timeout=self.timeout,
            stream=True,
        )
        response.raise_for_status()
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1 << 16):
                handle.write(chunk)

    def delete(self, bucket: str, names: Sequence[str]) -> None:
        if not names:
            return
        response = self.session.delete(
            f"{self.base}/storage/v1/object/{bucket}",
            json={"prefixes": list(names)},
            timeout=self.timeout,
        )
        response.raise_for_status()


def parse_objects(payload: Iterable[dict[str, Any]]) -> list[StorageObject]:
    """Turn a list response into StorageObjects, skipping folder placeholders.

    Supabase returns folders as entries with no metadata, and an empty folder
    marker named `.emptyFolderPlaceholder`; neither is a real file.
    """
    objects: list[StorageObject] = []
    for entry in payload:
        name = entry.get("name")
        metadata = entry.get("metadata")
        if not name or not metadata:
            continue
        if name.endswith(".emptyFolderPlaceholder"):
            continue
        size = metadata.get("size")
        if size is None:
            continue
        objects.append(
            StorageObject(
                name=name,
                size=int(size),
                created_at=entry.get("created_at") or entry.get("updated_at") or "",
            )
        )
    return objects


def group_objects(objects: Iterable[StorageObject]) -> list[Group]:
    """Group by basename, ordered so the report reads predictably."""
    groups: dict[str, Group] = {}
    for obj in objects:
        groups.setdefault(obj.basename, Group(obj.basename)).objects.append(obj)
    return [groups[key] for key in sorted(groups)]


def plan(
    objects: Iterable[StorageObject], *, include_size_mismatch: bool = False
) -> dict[str, Any]:
    """Decide what to delete, keep and skip — without touching anything."""
    groups = group_objects(objects)
    delete: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    keep: list[str] = []

    for group in groups:
        if len(group.objects) == 1:
            keep.append(group.objects[0].name)
            continue

        if not group.sizes_match and not include_size_mismatch:
            # Same name, different bytes: most likely a genuine re-edit, so it
            # is reported rather than resolved.
            skipped.append(
                {
                    "basename": group.basename,
                    "reason": "copies differ in size",
                    "copies": [
                        {"name": o.name, "size": o.size} for o in sorted(
                            group.objects, key=lambda o: o.sort_key
                        )
                    ],
                    "reclaimable_bytes": group.total_bytes - group.largest.size,
                }
            )
            keep.extend(o.name for o in group.objects)
            continue

        # With equal sizes "newest" is the only sensible survivor; with mixed
        # sizes the largest is, since that is the highest-quality copy.
        survivor = group.newest if group.sizes_match else group.largest
        keep.append(survivor.name)
        for obj in sorted(group.objects, key=lambda o: o.sort_key):
            if obj.name == survivor.name:
                continue
            delete.append(
                {"name": obj.name, "size": obj.size, "basename": group.basename}
            )

    total_bytes = sum(o.size for o in objects)
    freed_bytes = sum(item["size"] for item in delete)
    return {
        "bucket": None,
        "totals": {
            "objects": len(list(objects)) if isinstance(objects, list) else None,
            "unique_names": len(groups),
            "groups_with_duplicates": sum(1 for g in groups if len(g.objects) > 1),
            "bytes_before": total_bytes,
            "bytes_freed": freed_bytes,
            "bytes_after": total_bytes - freed_bytes,
        },
        "keep": sorted(keep),
        "delete": delete,
        "skipped": skipped,
    }


def megabytes(value: int) -> str:
    return f"{value / 1048576:.1f} MB"


def report(manifest: dict[str, Any]) -> str:
    totals = manifest["totals"]
    lines = [
        f"Objecten          {totals['objects']}",
        f"Unieke namen      {totals['unique_names']}",
        f"Met dubbelen      {totals['groups_with_duplicates']}",
        f"Nu                {megabytes(totals['bytes_before'])}",
        f"Te verwijderen    {len(manifest['delete'])} bestanden, {megabytes(totals['bytes_freed'])}",
        f"Daarna            {megabytes(totals['bytes_after'])}",
    ]
    if manifest["skipped"]:
        held = sum(item["reclaimable_bytes"] for item in manifest["skipped"])
        lines.append(
            f"Overgeslagen      {len(manifest['skipped'])} groepen met afwijkende grootte "
            f"({megabytes(held)} blijft liggen)"
        )
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Collapse duplicate uploads in a Supabase storage bucket.",
    )
    parser.add_argument("--bucket", required=True, help="Bucket to clean.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete. Without this nothing is removed.",
    )
    parser.add_argument(
        "--download-dir",
        type=Path,
        help="Save every object here first. Required together with --apply.",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(DEFAULT_MANIFEST),
        help=f"Where to write the plan (default: {DEFAULT_MANIFEST}).",
    )
    parser.add_argument(
        "--include-size-mismatch",
        action="store_true",
        help="Also collapse groups whose copies differ in size, keeping the largest.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.apply and not args.download_dir:
        print(
            "Geweigerd: --apply vereist --download-dir, zodat er eerst een "
            "lokale kopie is voordat er iets verdwijnt.",
            file=sys.stderr,
        )
        return 2

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print(
            "Zet SUPABASE_URL en SUPABASE_SERVICE_KEY in je omgeving.",
            file=sys.stderr,
        )
        return 2

    client = StorageClient(url, key)
    objects = client.list_objects(args.bucket)
    if not objects:
        print(f"Geen bestanden gevonden in {args.bucket}.")
        return 0

    manifest = plan(objects, include_size_mismatch=args.include_size_mismatch)
    manifest["bucket"] = args.bucket
    manifest["totals"]["objects"] = len(objects)
    args.manifest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(report(manifest))
    print(f"\nPlan geschreven naar {args.manifest}")

    if not args.apply:
        print("Droogtest — er is niets verwijderd. Voeg --apply toe om door te zetten.")
        return 0

    # Download everything, not just the doomed copies: the point is to hold a
    # complete set of originals before the bucket changes.
    print(f"\n{len(objects)} bestanden downloaden naar {args.download_dir}…")
    for index, obj in enumerate(objects, start=1):
        target = args.download_dir / obj.name
        if target.exists() and target.stat().st_size == obj.size:
            continue
        client.download(args.bucket, obj.name, target)
        if index % 25 == 0:
            print(f"  {index}/{len(objects)}")

    names = [item["name"] for item in manifest["delete"]]
    if not names:
        print("Niets te verwijderen.")
        return 0

    print(f"{len(names)} bestanden verwijderen…")
    # Delete in batches so one oversized request can't fail the whole run.
    for start in range(0, len(names), 50):
        client.delete(args.bucket, names[start : start + 50])
    print(f"Klaar. {megabytes(manifest['totals']['bytes_freed'])} vrijgemaakt.")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
