-- Run this once in the Supabase SQL Editor.
-- It creates the private bucket and access policies required by Project Files.

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update set public = false;

drop policy if exists "project members can list files" on storage.objects;
drop policy if exists "project members can upload files" on storage.objects;
drop policy if exists "file owners can update files" on storage.objects;
drop policy if exists "file owners can delete files" on storage.objects;

create policy "project members can list files" on storage.objects
for select using (
  bucket_id = 'project-files'
  and (
    public.is_project_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    or public.is_project_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

create policy "project members can upload files" on storage.objects
for insert with check (
  bucket_id = 'project-files'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (
    public.is_project_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    or public.is_project_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

create policy "file owners can update files" on storage.objects
for update using (
  bucket_id = 'project-files' and owner_id = auth.uid()
) with check (
  bucket_id = 'project-files' and owner_id = auth.uid()
);

create policy "file owners can delete files" on storage.objects
for delete using (
  bucket_id = 'project-files' and owner_id = auth.uid()
);
