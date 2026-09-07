"""Tests for the publish step.

The URL rewriting is the risky part — a wrong swap leaves a broken image on a
live page — so that is where most of these sit. The uploads themselves need a
real service key and are not exercised.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dedupe_storage import StorageObject  # noqa: E402
from publish_web_images import (  # noqa: E402
    Job,
    build_jobs,
    build_parser,
    main,
    public_url,
    remaining_references,
    rewrite_value,
    url_mapping,
)

BASE = "https://x.supabase.co"
BUCKET = "photos"


def obj(name: str, size: int = 100, created: str = "2026-01-01T00:00:00Z") -> StorageObject:
    return StorageObject(name=name, size=size, created_at=created)


def url(name: str) -> str:
    return public_url(BASE, BUCKET, name)


# --- urls ------------------------------------------------------------------


def test_public_url_matches_what_supabase_serves():
    assert url("1-a.jpg") == f"{BASE}/storage/v1/object/public/{BUCKET}/1-a.jpg"


def test_public_url_tolerates_a_trailing_slash():
    assert public_url(BASE + "/", BUCKET, "a.jpg") == url("a.jpg")


# --- choosing what to convert ---------------------------------------------


def test_only_photos_the_site_uses_are_converted():
    objects = [obj("1000000000000-a.jpg"), obj("1000000000001-b.jpg")]
    jobs = build_jobs(objects, {"1000000000000-a.jpg"})
    assert [j.source.name for j in jobs] == ["1000000000000-a.jpg"]


def test_nothing_in_use_means_nothing_to_do():
    assert build_jobs([obj("1000000000000-a.jpg")], set()) == []


def test_identical_copies_become_one_job_with_aliases():
    names = {"1000000000000-a.jpg", "1000000000001-a.jpg"}
    jobs = build_jobs([obj(n) for n in sorted(names)], names)
    assert len(jobs) == 1
    assert set(jobs[0].names) == names


def test_copies_of_a_different_size_stay_separate():
    objects = [obj("1000000000000-a.jpg", 100), obj("1000000000001-a.jpg", 200)]
    names = {o.name for o in objects}
    assert len(build_jobs(objects, names)) == 2


def test_each_job_gets_its_own_slug():
    objects = [obj("1000000000000-a.jpg", 100), obj("1000000000001-a.jpg", 200)]
    slugs = [j.slug for j in build_jobs(objects, {o.name for o in objects})]
    assert len(set(slugs)) == 2


def test_a_slug_clash_is_broken_up():
    # Both names slug to the same stem; the second must not reuse it.
    objects = [obj("1000000000000-a!.jpg", 100), obj("1000000000000-a_.jpg", 200)]
    slugs = sorted(j.slug for j in build_jobs(objects, {o.name for o in objects}))
    assert slugs == ["1000000000000-a", "1000000000000-a-2"]


def test_the_slug_carries_the_upload_stamp():
    assert Job(source=obj("1712345678901-DSC_0155.JPG")).slug == "1712345678901-dsc-0155"


# --- rewriting stored values ----------------------------------------------


def test_a_url_inside_an_object_is_swapped():
    value = {"coverUrl": url("1-a.jpg")}
    assert rewrite_value(value, {url("1-a.jpg"): "NEW"}) == {"coverUrl": "NEW"}


def test_every_url_in_a_gallery_is_swapped():
    value = {"galleryUrls": [url("1-a.jpg"), url("2-b.jpg")]}
    mapping = {url("1-a.jpg"): "A", url("2-b.jpg"): "B"}
    assert rewrite_value(value, mapping) == {"galleryUrls": ["A", "B"]}


def test_a_value_stored_as_json_text_stays_json_text():
    value = json.dumps({"coverUrl": url("1-a.jpg")})
    result = rewrite_value(value, {url("1-a.jpg"): "NEW"})
    assert isinstance(result, str)
    assert json.loads(result) == {"coverUrl": "NEW"}


def test_untouched_values_come_back_unchanged():
    value = {"title": "Ferrari", "published": True, "count": 3}
    assert rewrite_value(value, {url("1-a.jpg"): "NEW"}) == value


def test_the_rest_of_the_record_survives_a_swap():
    value = {"title": "Ferrari", "coverUrl": url("1-a.jpg"), "featured": True}
    result = rewrite_value(value, {url("1-a.jpg"): "NEW"})
    assert result["title"] == "Ferrari" and result["featured"] is True


def test_a_url_that_only_starts_with_another_is_left_alone():
    mapping = {url("1-a.jpg"): "SHORT"}
    value = {"coverUrl": url("1-a.jpg.bak")}
    assert rewrite_value(value, mapping) == value


def test_a_url_with_something_appended_is_not_half_rewritten():
    mapping = {url("1-a.jpg"): "NEW"}
    result = rewrite_value({"coverUrl": url("1-a.jpg") + "?t=1"}, mapping)
    assert result["coverUrl"] == url("1-a.jpg") + "?t=1"


def test_a_url_nested_two_levels_deep_in_text_is_swapped():
    inner = json.dumps({"galleryUrls": [url("1-a.jpg")]})
    result = rewrite_value(json.dumps({"payload": inner}), {url("1-a.jpg"): "NEW"})
    assert json.loads(json.loads(result)["payload"])["galleryUrls"] == ["NEW"]


def test_numbers_and_booleans_pass_through():
    value = {"n": 3, "ok": True, "nothing": None}
    assert rewrite_value(value, {url("1-a.jpg"): "NEW"}) == value


# --- the mapping and the check --------------------------------------------


def test_mapping_covers_every_alias_of_a_job():
    names = {"1000000000000-a.jpg", "1000000000001-a.jpg"}
    jobs = build_jobs([obj(n) for n in sorted(names)], names)
    mapping = url_mapping(jobs, {jobs[0].slug: "NEW"}, BASE, BUCKET)
    assert set(mapping) == {url(n) for n in names}
    assert set(mapping.values()) == {"NEW"}


def test_a_job_that_produced_nothing_is_left_out_of_the_mapping():
    jobs = build_jobs([obj("1000000000000-a.jpg")], {"1000000000000-a.jpg"})
    assert url_mapping(jobs, {}, BASE, BUCKET) == {}


def test_remaining_references_spots_a_row_that_was_missed():
    rows = [{"key": "portfolio:article:1", "value": {"coverUrl": url("1-a.jpg")}}]
    assert remaining_references(rows, {url("1-a.jpg"): "NEW"}) == ["portfolio:article:1"]


def test_remaining_references_is_empty_after_a_clean_rewrite():
    rows = [{"key": "k", "value": {"coverUrl": "NEW"}}]
    assert remaining_references(rows, {url("1-a.jpg"): "NEW"}) == []


# --- the safety catches ----------------------------------------------------


def test_apply_without_a_work_dir_is_refused(monkeypatch, capsys):
    monkeypatch.setenv("SUPABASE_URL", BASE)
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "key")
    assert main(["--bucket", BUCKET, "--apply"]) == 2
    assert "work-dir" in capsys.readouterr().err


def test_missing_credentials_are_refused(monkeypatch, capsys):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    assert main(["--bucket", BUCKET]) == 2
    assert "SUPABASE_URL" in capsys.readouterr().err


def test_an_out_of_range_quality_is_refused(capsys):
    assert main(["--bucket", BUCKET, "--quality", "0"]) == 2
    assert "quality" in capsys.readouterr().err


def test_apply_defaults_to_off():
    assert build_parser().parse_args(["--bucket", BUCKET]).apply is False


def test_originals_are_kept_unless_asked():
    assert build_parser().parse_args(["--bucket", BUCKET]).delete_originals is False


def test_bucket_is_required():
    with pytest.raises(SystemExit):
        build_parser().parse_args([])
