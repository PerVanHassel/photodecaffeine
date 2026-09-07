"""Tests for the storage de-duplicator.

Everything here is pure logic: grouping, recency, the size guard and the
manifest. The Supabase calls themselves are not exercised — they need a real
service key, and mocking the HTTP layer would only assert that the mock works.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dedupe_storage import (  # noqa: E402
    Group,
    StorageObject,
    build_parser,
    group_objects,
    main,
    megabytes,
    parse_objects,
    plan,
    report,
)


def obj(name: str, size: int = 100, created: str = "2026-01-01T00:00:00Z") -> StorageObject:
    return StorageObject(name=name, size=size, created_at=created)


# --- basename and timestamp ------------------------------------------------


def test_basename_strips_upload_timestamp():
    assert obj("1712345678901-dsc0155.jpg").basename == "dsc0155.jpg"


def test_basename_left_alone_without_a_timestamp():
    assert obj("dsc0155.jpg").basename == "dsc0155.jpg"


def test_basename_keeps_short_leading_numbers():
    # A year prefix is part of the photographer's own name, not an upload stamp.
    assert obj("2024-portret.jpg").basename == "2024-portret.jpg"


def test_stamp_is_parsed_when_present():
    assert obj("1712345678901-a.jpg").stamp == 1712345678901


def test_stamp_is_zero_without_a_prefix():
    assert obj("a.jpg").stamp == 0


def test_basename_survives_hyphens_in_the_original_name():
    assert obj("1712345678901-roffa-motion-01.jpg").basename == "roffa-motion-01.jpg"


# --- parsing the list response --------------------------------------------


def test_parse_objects_reads_name_and_size():
    parsed = parse_objects(
        [{"name": "a.jpg", "metadata": {"size": 42}, "created_at": "2026-01-01T00:00:00Z"}]
    )
    assert parsed == [StorageObject("a.jpg", 42, "2026-01-01T00:00:00Z")]


def test_parse_objects_skips_folders_without_metadata():
    assert parse_objects([{"name": "subfolder", "metadata": None}]) == []


def test_parse_objects_skips_the_empty_folder_placeholder():
    payload = [{"name": ".emptyFolderPlaceholder", "metadata": {"size": 0}}]
    assert parse_objects(payload) == []


def test_parse_objects_falls_back_to_updated_at():
    parsed = parse_objects(
        [{"name": "a.jpg", "metadata": {"size": 1}, "updated_at": "2026-02-02T00:00:00Z"}]
    )
    assert parsed[0].created_at == "2026-02-02T00:00:00Z"


# --- grouping --------------------------------------------------------------


def test_group_objects_collects_copies_under_one_basename():
    groups = group_objects(
        [obj("1000000000000-a.jpg"), obj("1000000000001-a.jpg"), obj("b.jpg")]
    )
    by_name = {g.basename: g for g in groups}
    assert len(by_name["a.jpg"].objects) == 2
    assert len(by_name["b.jpg"].objects) == 1


def test_group_objects_is_sorted_by_basename():
    groups = group_objects([obj("z.jpg"), obj("a.jpg")])
    assert [g.basename for g in groups] == ["a.jpg", "z.jpg"]


def test_newest_uses_created_at():
    group = Group(
        "a.jpg",
        [obj("1000000000000-a.jpg", created="2026-01-01T00:00:00Z"),
         obj("1000000000001-a.jpg", created="2026-06-01T00:00:00Z")],
    )
    assert group.newest.name == "1000000000001-a.jpg"


def test_newest_falls_back_to_the_name_stamp_on_a_tie():
    same = "2026-01-01T00:00:00Z"
    group = Group(
        "a.jpg",
        [obj("1000000000005-a.jpg", created=same), obj("1000000000009-a.jpg", created=same)],
    )
    assert group.newest.name == "1000000000009-a.jpg"


def test_sizes_match_detects_equal_copies():
    assert Group("a", [obj("1-a", 10), obj("2-a", 10)]).sizes_match


def test_sizes_match_detects_a_re_edit():
    assert not Group("a", [obj("1-a", 10), obj("2-a", 20)]).sizes_match


def test_largest_picks_the_biggest_copy():
    group = Group("a", [obj("1000000000000-a", 10), obj("1000000000001-a", 30)])
    assert group.largest.size == 30


# --- planning --------------------------------------------------------------


def test_plan_keeps_a_lone_object():
    result = plan([obj("a.jpg")])
    assert result["delete"] == []
    assert result["keep"] == ["a.jpg"]


def test_plan_deletes_the_older_of_two_identical_copies():
    older = obj("1000000000000-a.jpg", 100, "2026-01-01T00:00:00Z")
    newer = obj("1000000000001-a.jpg", 100, "2026-06-01T00:00:00Z")
    result = plan([older, newer])
    assert [d["name"] for d in result["delete"]] == ["1000000000000-a.jpg"]
    assert result["keep"] == ["1000000000001-a.jpg"]


def test_plan_skips_groups_whose_copies_differ_in_size():
    result = plan([obj("1000000000000-a.jpg", 100), obj("1000000000001-a.jpg", 200)])
    assert result["delete"] == []
    assert len(result["skipped"]) == 1
    assert result["skipped"][0]["basename"] == "a.jpg"


def test_skipped_group_reports_what_it_holds():
    result = plan([obj("1000000000000-a.jpg", 100), obj("1000000000001-a.jpg", 250)])
    assert result["skipped"][0]["reclaimable_bytes"] == 100


def test_skipped_copies_are_all_kept():
    result = plan([obj("1000000000000-a.jpg", 100), obj("1000000000001-a.jpg", 200)])
    assert sorted(result["keep"]) == ["1000000000000-a.jpg", "1000000000001-a.jpg"]


def test_include_size_mismatch_collapses_and_keeps_the_largest():
    result = plan(
        [obj("1000000000000-a.jpg", 100), obj("1000000000001-a.jpg", 250)],
        include_size_mismatch=True,
    )
    assert result["keep"] == ["1000000000001-a.jpg"]
    assert [d["name"] for d in result["delete"]] == ["1000000000000-a.jpg"]
    assert result["skipped"] == []


def test_plan_totals_add_up():
    result = plan(
        [obj("1000000000000-a.jpg", 100), obj("1000000000001-a.jpg", 100), obj("b.jpg", 50)]
    )
    totals = result["totals"]
    assert totals["bytes_before"] == 250
    assert totals["bytes_freed"] == 100
    assert totals["bytes_after"] == 150


def test_plan_counts_unique_names_and_duplicate_groups():
    result = plan([obj("1000000000000-a.jpg"), obj("1000000000001-a.jpg"), obj("b.jpg")])
    assert result["totals"]["unique_names"] == 2
    assert result["totals"]["groups_with_duplicates"] == 1


def test_plan_handles_three_copies():
    objects = [obj(f"100000000000{i}-a.jpg", 10, f"2026-0{i + 1}-01T00:00:00Z") for i in range(3)]
    result = plan(objects)
    assert len(result["delete"]) == 2
    assert result["keep"] == ["1000000000002-a.jpg"]


def test_plan_on_an_empty_bucket():
    result = plan([])
    assert result["delete"] == [] and result["keep"] == [] and result["skipped"] == []


def test_plan_never_deletes_everything_in_a_group():
    objects = [obj(f"100000000000{i}-a.jpg", 10) for i in range(4)]
    result = plan(objects)
    deleted = {d["name"] for d in result["delete"]}
    assert len(deleted) == 3
    assert set(result["keep"]) - deleted == set(result["keep"])


def test_plan_is_serialisable_as_json():
    json.dumps(plan([obj("1000000000000-a.jpg", 1), obj("1000000000001-a.jpg", 2)]))


# --- reporting -------------------------------------------------------------


def test_megabytes_formats_one_decimal():
    assert megabytes(1572864) == "1.5 MB"


def test_report_mentions_the_totals():
    manifest = plan([obj("1000000000000-a.jpg", 1048576), obj("1000000000001-a.jpg", 1048576)])
    manifest["totals"]["objects"] = 2
    text = report(manifest)
    assert "1.0 MB" in text and "Te verwijderen" in text


def test_report_mentions_skipped_groups():
    manifest = plan([obj("1000000000000-a.jpg", 100), obj("1000000000001-a.jpg", 200)])
    manifest["totals"]["objects"] = 2
    assert "Overgeslagen" in report(manifest)


# --- the safety catches ----------------------------------------------------


def test_apply_without_a_download_dir_is_refused(monkeypatch, capsys):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "key")
    assert main(["--bucket", "b", "--apply"]) == 2
    assert "download-dir" in capsys.readouterr().err


def test_missing_credentials_are_refused(monkeypatch, capsys):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    assert main(["--bucket", "b"]) == 2
    assert "SUPABASE_URL" in capsys.readouterr().err


def test_bucket_is_required():
    with pytest.raises(SystemExit):
        build_parser().parse_args([])


def test_apply_defaults_to_off():
    assert build_parser().parse_args(["--bucket", "b"]).apply is False
