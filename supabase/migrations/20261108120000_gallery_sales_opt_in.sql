-- Selling photos is a choice per group link, and switching it on puts the
-- guests' view on watermark by itself (lib/orders.ts), whatever the client
-- sees. It used to be on for every new link but only showed while the whole
-- project was watermarked; a new link now starts with it off.
alter table public.gallery_shares alter column sales set default false;
