-- Run this once in the Supabase SQL Editor after schema.sql.
-- It removes recursive RLS checks and backfills users created before the trigger existed.

create or replace function public.is_project_owner(project_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where id = project_uuid and owner_id = user_uuid
  );
$$;

create or replace function public.is_project_member(project_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = project_uuid and user_id = user_uuid
  );
$$;

drop policy if exists "own or joined projects" on public.projects;
drop policy if exists "see own memberships" on public.project_members;
drop policy if exists "project notes readable by members" on public.notes;
drop policy if exists "teachers manage notes" on public.notes;
drop policy if exists "project owners manage notes" on public.notes;
drop policy if exists "project teachers create notes" on public.notes;
drop policy if exists "profiles visible to project members" on public.profiles;
drop policy if exists "project tasks readable by members" on public.tasks;
drop policy if exists "users create own tasks" on public.tasks;
drop policy if exists "users update own tasks" on public.tasks;
drop policy if exists "users delete own tasks" on public.tasks;
drop policy if exists "own tasks" on public.tasks;

create policy "own or joined projects" on public.projects
for select using (
  owner_id = auth.uid() or public.is_project_member(id, auth.uid())
);

create policy "see own memberships" on public.project_members
for select using (
  user_id = auth.uid() or public.is_project_owner(project_id, auth.uid())
);

create policy "project notes readable by members" on public.notes
for select using (
  public.is_project_owner(project_id, auth.uid())
  or public.is_project_member(project_id, auth.uid())
);

create policy "project owners manage notes" on public.notes
for all using (
  public.is_project_owner(project_id, auth.uid())
) with check (
  author_id = auth.uid() and public.is_project_owner(project_id, auth.uid())
);
create policy "project teachers create notes" on public.notes
for insert with check (
  author_id = auth.uid()
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  and (public.is_project_owner(project_id, auth.uid()) or public.is_project_member(project_id, auth.uid()))
);

create or replace function public.can_view_project_profile(profile_uuid uuid, viewer_uuid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select profile_uuid = viewer_uuid or exists (select 1 from public.projects project where project.owner_id = profile_uuid and (project.owner_id = viewer_uuid or public.is_project_member(project.id, viewer_uuid))) or exists (
    select 1 from public.project_members member
    where member.user_id = profile_uuid
      and (public.is_project_owner(member.project_id, viewer_uuid) or public.is_project_member(member.project_id, viewer_uuid))
  );
$$;

create policy "profiles visible to project members" on public.profiles
for select using (public.can_view_project_profile(id, auth.uid()));

create policy "project tasks readable by members" on public.tasks
for select using (user_id = auth.uid() or public.is_project_owner(project_id, auth.uid()) or public.is_project_member(project_id, auth.uid()));
create policy "users create own tasks" on public.tasks
for insert with check (user_id = auth.uid());
create policy "users update own tasks" on public.tasks
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own tasks" on public.tasks
for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

drop policy if exists "project members can list files" on storage.objects;
drop policy if exists "project members can upload files" on storage.objects;
drop policy if exists "file owners can update files" on storage.objects;
drop policy if exists "file owners can delete files" on storage.objects;
create policy "project members can list files" on storage.objects for select using (bucket_id = 'project-files' and (public.is_project_owner(((storage.foldername(name))[1])::uuid, auth.uid()) or public.is_project_member(((storage.foldername(name))[1])::uuid, auth.uid())));
create policy "project members can upload files" on storage.objects for insert with check (bucket_id = 'project-files' and (storage.foldername(name))[2] = auth.uid()::text and (public.is_project_owner(((storage.foldername(name))[1])::uuid, auth.uid()) or public.is_project_member(((storage.foldername(name))[1])::uuid, auth.uid())));
create policy "file owners can update files" on storage.objects for update using (bucket_id = 'project-files' and owner_id = auth.uid()) with check (bucket_id = 'project-files' and owner_id = auth.uid());
create policy "file owners can delete files" on storage.objects for delete using (bucket_id = 'project-files' and owner_id = auth.uid());

insert into public.profiles (id, full_name, email, role)
select id, coalesce(raw_user_meta_data->>'full_name', 'Tiny Wins user'), email, 'student'::public.user_role
from auth.users
where not exists (
  select 1 from public.profiles where profiles.id = auth.users.id
);

insert into public.categories (user_id, name, color)
select profiles.id, defaults.name, defaults.color
from public.profiles
cross join (values
  ('Personal', '#8b5cf6'),
  ('Study', '#22d3ee'),
  ('Work', '#f59e0b'),
  ('Health', '#34d399'),
  ('Important', '#fb7185')
) as defaults(name, color)
where not exists (
  select 1 from public.categories
  where categories.user_id = profiles.id and categories.name = defaults.name
);
