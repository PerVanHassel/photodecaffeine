"""Tests for the pruner.

The whole risk here is deleting one file too many, so these are mostly about
what survives: anything referenced, and anything under a protected prefix.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dedupe_storage import StorageObject  # noqa: E402
from prune_unused import build_parser, main, plan, report  # noqa: E402


def obj(name: str, size: int = 100) -> StorageObject:
    return StorageObject(name=name, size=size, created_at="2026-01-01T00:00:00Z")


def test_an_unreferenced_object_goes():
    result = plan([obj("1-a.jpg")], {"1-b.jpg"})
    assert [d["name"] for d in result["delete"]] == ["1-a.jpg"]


def test_a_referenced_object_stays():
    result = plan([obj("1-a.jpg")], {"1-a.jpg"})
    assert result["delete"] == []
    assert result["totals"]["in_use"] == 1


def test_the_protected_prefix_stays_even_when_unreferenced():
    result = plan([obj("web/a-1280.jpg")], {"web/a-2560.jpg"})
    assert result["delete"] == []
    assert result["totals"]["protected"] == 1


def test_a_referenced_file_under_the_prefix_counts_as_in_use():
    result = plan([obj("web/a-2560.jpg")], {"web/a-2560.jpg"})
    assert result["totals"]["in_use"] == 1
    assert result["totals"]["protected"] == 0


def test_protection_can_be_turned_off():
    result = plan([obj("web/a-1280.jpg")], {"other.jpg"}, protect=[])
    assert [d["name"] for d in result["delete"]] == ["web/a-1280.jpg"]


def test_several_prefixes_are_honoured():
    objects = [obj("web/a.jpg"), obj("thumbs/b.jpg"), obj("c.jpg")]
    result = plan(objects, {"other.jpg"}, protect=["web/", "thumbs/"])
    assert [d["name"] for d in result["delete"]] == ["c.jpg"]


def test_a_prefix_only_matches_at_the_start():
    result = plan([obj("photos/web/a.jpg")], {"other.jpg"})
    assert [d["name"] for d in result["delete"]] == ["photos/web/a.jpg"]


def test_totals_add_up():
    objects = [obj("keep.jpg", 100), obj("go.jpg", 250), obj("web/x.jpg", 50)]
    totals = plan(objects, {"keep.jpg"})["totals"]
    assert totals["bytes_before"] == 400
    assert totals["bytes_freed"] == 250
    assert totals["bytes_after"] == 150
    assert totals["to_delete"] == 1


def test_the_delete_list_is_ordered_by_name():
    result = plan([obj("z.jpg"), obj("a.jpg")], {"other.jpg"})
    assert [d["name"] for d in result["delete"]] == ["a.jpg", "z.jpg"]


def test_an_empty_bucket_plans_nothing():
    assert plan([], {"a.jpg"})["delete"] == []


def test_report_names_what_stays_and_what_goes():
    text = report(plan([obj("go.jpg", 1048576), obj("keep.jpg")], {"keep.jpg"}))
    assert "Te verwijderen" in text and "In gebruik" in text and "1.0 MB" in text


def test_report_names_the_protected_prefix():
    assert "web/" in report(plan([obj("web/a.jpg")], {"b.jpg"}))


# --- the safety catches ----------------------------------------------------


def test_missing_credentials_are_refused(monkeypatch, capsys):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    assert main(["--bucket", "b"]) == 2
    assert "SUPABASE_URL" in capsys.readouterr().err


def test_apply_defaults_to_off():
    assert build_parser().parse_args(["--bucket", "b"]).apply is False


def test_web_is_protected_by_default():
    assert build_parser().parse_args(["--bucket", "b"]).protect == ["web/"]


def test_bucket_is_required():
    with pytest.raises(SystemExit):
        build_parser().parse_args([])
