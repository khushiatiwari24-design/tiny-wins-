-- ==============================================================================
-- Tiny Wins: Fix Shared Projects, Study Materials & Cross-Account Joining
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Ensure projects table has materials JSONB column for direct cross-account sync
alter table public.projects add column if not exists materials jsonb default '[]'::jsonb;

-- 2. Clean up existing restrictive policies
drop policy if exists "own or joined projects" on public.projects;
drop policy if exists "allow join code lookup" on public.projects;
drop policy if exists "projects join lookup" on public.projects;
drop policy if exists "teachers own projects" on public.projects;
drop policy if exists "owners manage projects" on public.projects;
drop policy if exists "owners delete projects" on public.projects;
drop policy if exists "authenticated select projects" on public.projects;
drop policy if exists "authenticated insert projects" on public.projects;
drop policy if exists "authenticated update projects" on public.projects;
drop policy if exists "authenticated delete projects" on public.projects;

-- 3. Projects RLS policies
-- SELECT: Anyone logged in can find projects by join_code, if they own it, or if they are a member
create policy "authenticated select projects" on public.projects
for select using (
  auth.role() = 'authenticated' and (
    owner_id = auth.uid()
    or join_code is not null
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = public.projects.id and pm.user_id = auth.uid()
    )
  )
);

-- INSERT: Authenticated users can create projects
create policy "authenticated insert projects" on public.projects
for insert with check (
  auth.role() = 'authenticated' and (owner_id = auth.uid() or owner_id is not null)
);

-- UPDATE: Owner or project members can update project details and materials
create policy "authenticated update projects" on public.projects
for update using (
  auth.role() = 'authenticated' and (
    owner_id = auth.uid()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = public.projects.id and pm.user_id = auth.uid()
    )
  )
);

-- DELETE: Owner can delete their project
create policy "authenticated delete projects" on public.projects
for delete using (
  auth.role() = 'authenticated' and owner_id = auth.uid()
);

-- 4. Project Members RLS policies
drop policy if exists "see own memberships" on public.project_members;
drop policy if exists "students join" on public.project_members;
drop policy if exists "members join project" on public.project_members;
drop policy if exists "authenticated select project_members" on public.project_members;
drop policy if exists "authenticated insert project_members" on public.project_members;
drop policy if exists "authenticated delete project_members" on public.project_members;

create policy "authenticated select project_members" on public.project_members
for select using (
  auth.role() = 'authenticated' and (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_members.project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id and pm.user_id = auth.uid()
    )
  )
);

create policy "authenticated insert project_members" on public.project_members
for insert with check (
  auth.role() = 'authenticated' and user_id = auth.uid()
);

create policy "authenticated delete project_members" on public.project_members
for delete using (
  auth.role() = 'authenticated' and (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_members.project_id and p.owner_id = auth.uid()
    )
  )
);

-- 5. Notes / Study Materials RLS policies
drop policy if exists "project notes readable by members" on public.notes;
drop policy if exists "teachers manage notes" on public.notes;
drop policy if exists "project owners manage notes" on public.notes;
drop policy if exists "project teachers create notes" on public.notes;
drop policy if exists "authenticated select notes" on public.notes;
drop policy if exists "authenticated insert notes" on public.notes;
drop policy if exists "authenticated update notes" on public.notes;
drop policy if exists "authenticated delete notes" on public.notes;

create policy "authenticated select notes" on public.notes
for select using (
  auth.role() = 'authenticated' and (
    author_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = notes.project_id
        and (
          p.owner_id = auth.uid()
          or p.join_code is not null
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  )
);

create policy "authenticated insert notes" on public.notes
for insert with check (
  auth.role() = 'authenticated' and (
    author_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = notes.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  )
);

create policy "authenticated update notes" on public.notes
for update using (
  auth.role() = 'authenticated' and (
    author_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = notes.project_id and p.owner_id = auth.uid()
    )
  )
);

create policy "authenticated delete notes" on public.notes
for delete using (
  auth.role() = 'authenticated' and (
    author_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = notes.project_id and p.owner_id = auth.uid()
    )
  )
);

-- 6. Storage Bucket & Policies for Project Files
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update set public = false;

drop policy if exists "project members can list files" on storage.objects;
drop policy if exists "project members can upload files" on storage.objects;
drop policy if exists "file owners can update files" on storage.objects;
drop policy if exists "file owners can delete files" on storage.objects;
drop policy if exists "authenticated select project files" on storage.objects;
drop policy if exists "authenticated insert project files" on storage.objects;
drop policy if exists "authenticated delete project files" on storage.objects;

create policy "authenticated select project files" on storage.objects
for select using (
  bucket_id = 'project-files' and auth.role() = 'authenticated'
);

create policy "authenticated insert project files" on storage.objects
for insert with check (
  bucket_id = 'project-files' and auth.role() = 'authenticated'
);

create policy "authenticated delete project files" on storage.objects
for delete using (
  bucket_id = 'project-files' and auth.role() = 'authenticated' and (
    owner_id = auth.uid() or auth.uid() is not null
  )
);

-- 7. High-Reliability Security Definer Join RPC Function
create or replace function public.join_project_by_code(code_input text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project record;
  current_uid uuid := auth.uid();
  normalized_code text;
begin
  if current_uid is null then
    return json_build_object('success', false, 'message', 'You must be signed in to join a class.');
  end if;

  normalized_code := upper(trim(replace(code_input, ' ', '')));

  if normalized_code = '' then
    return json_build_object('success', false, 'message', 'Please enter a valid join code.');
  end if;

  -- 1. Exact match or hyphen-stripped match
  select id, title, description, type, join_code, owner_id, materials into target_project
  from public.projects
  where upper(trim(join_code)) = normalized_code
     or replace(upper(trim(join_code)), '-', '') = replace(normalized_code, '-', '')
     or id::text = trim(code_input)
  limit 1;

  if target_project.id is null then
    return json_build_object(
      'success', false,
      'message', 'Join code "' || code_input || '" was not found. Please double-check the code with your teacher.'
    );
  end if;

  -- 2. If the user is the owner, return success directly
  if target_project.owner_id = current_uid then
    return json_build_object(
      'success', true,
      'message', 'You are the creator of this project!',
      'project_id', target_project.id,
      'title', target_project.title,
      'project', row_to_json(target_project)
    );
  end if;

  -- 3. Insert or maintain membership
  insert into public.project_members (project_id, user_id, role)
  values (target_project.id, current_uid, 'student')
  on conflict (project_id, user_id) do nothing;

  return json_build_object(
    'success', true,
    'message', 'Successfully joined "' || target_project.title || '"!',
    'project_id', target_project.id,
    'title', target_project.title,
    'project', row_to_json(target_project)
  );
end;
$$;

grant execute on function public.join_project_by_code(text) to authenticated;
