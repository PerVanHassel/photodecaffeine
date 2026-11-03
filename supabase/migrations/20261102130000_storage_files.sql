-- The admin's Bestanden page: every stored file, as one value, so the API's limit
-- on rows can never cut the list short. Only the edge function calls this, and it
-- decides per file who may see what.
create function public.storage_files() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'bucket', bucket_id,
    'path', name,
    'size', coalesce((metadata->>'size')::bigint, 0),
    'type', coalesce(metadata->>'mimetype', ''),
    'updatedAt', coalesce(updated_at, created_at)
  )), '[]'::jsonb)
  from storage.objects
$$;
revoke execute on function public.storage_files() from public, anon, authenticated;
