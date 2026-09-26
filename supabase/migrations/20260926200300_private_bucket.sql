-- Client galleries and scouting photos live in a private bucket. The edge
-- function uploads with the service role and hands out short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-private-0951c59e', 'studio-private-0951c59e', false, 104857600,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;
