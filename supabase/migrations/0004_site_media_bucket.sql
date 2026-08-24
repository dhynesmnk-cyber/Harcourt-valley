-- Public Storage bucket for admin-uploaded photos — product/catalogue shots
-- and the replaceable stock photography used across the public pages. Public
-- read (so the storefront can actually show them) and signed-in-admin-only
-- write, same shape as every other table's RLS in this project.

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public reads site media" on storage.objects;
create policy "public reads site media" on storage.objects
  for select to public using (bucket_id = 'site-media');

drop policy if exists "admins manage site media" on storage.objects;
create policy "admins manage site media" on storage.objects
  for all to authenticated using (bucket_id = 'site-media') with check (bucket_id = 'site-media');
