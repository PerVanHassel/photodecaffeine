-- Declaration receipts are often PDFs; they now go to the private bucket too.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff', 'video/mp4', 'video/quicktime', 'application/pdf']
where id = 'studio-private-0951c59e';
