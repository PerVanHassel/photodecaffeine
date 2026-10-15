-- The pixel size of each gallery photo or video, measured in the admin's
-- browser on upload (or later, for older photos). The client gallery lays
-- photos out by their shape before they have loaded. 0 means not known yet.
alter table public.gallery_images add column if not exists width integer not null default 0;
alter table public.gallery_images add column if not exists height integer not null default 0;
