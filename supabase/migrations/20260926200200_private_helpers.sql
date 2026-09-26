-- my_project_ids() only ever returns the caller's own project ids, but a
-- SECURITY DEFINER function in public is also reachable as /rest/v1/rpc/...
-- Keep it in a schema the API does not expose.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.my_project_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select pc.project_id
  from public.project_clients pc
  join public.clients c on c.id = pc.client_id
  where c.user_id = auth.uid()
$$;
revoke all on function private.my_project_ids() from public, anon;
grant execute on function private.my_project_ids() to authenticated;

drop policy "clients read own messages" on public.messages;
create policy "clients read own messages" on public.messages for select to authenticated
  using (project_id in (select private.my_project_ids()));

drop function public.my_project_ids();

-- Only the edge function (service role) hands out document numbers.
revoke execute on function public.next_document_number(text) from public, anon, authenticated;
