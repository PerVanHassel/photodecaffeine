-- "Wacht op jou" in the admin listens for changes instead of waiting for a
-- reload. Messages were already published for the portal; enquiries and
-- quotes join them. Row-level security still decides who hears what: only
-- admins can read these tables.
alter publication supabase_realtime add table public.inquiries, public.quotes;

-- A reply from the studio marks the client's earlier messages in that project
-- as read (routes/projects.ts). Messages from before the move to Postgres never
-- went through that, so the ones that were answered long ago still counted as
-- waiting. Same rule, applied once to what is already there.
update public.messages m
set read_at = now()
where m.sender_role = 'client'
  and m.read_at is null
  and exists (
    select 1 from public.messages r
    where r.project_id = m.project_id and r.sender_role = 'pdc' and r.created_at > m.created_at
  );
