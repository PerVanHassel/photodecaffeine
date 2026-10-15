-- A smaller copy of each gallery photo with the studio's watermark, made in
-- the admin's browser on upload. Shown to clients instead of the original
-- while a project is set to watermarked downloads and not yet delivered.
alter table public.gallery_images add column if not exists preview_path text not null default '';
