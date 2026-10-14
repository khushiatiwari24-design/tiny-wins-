-- Tiny Wins: Cross-User Project & Class Joining RLS Fix
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Ensure projects table allows authenticated users to look up projects by join_code or membership
drop policy if exists "own or joined projects" on public.projects;
drop policy if exists "allow join code lookup" on public.projects;
drop policy if exists "projects join lookup" on public.projects;

create policy "projects join lookup" on public.projects
for select using (
  owner_id = auth.uid()
  or public.is_project_member(id, auth.uid())
  or join_code is not null
);

-- 2. Ensure project_members table allows authenticated users to insert themselves when joining
drop policy if exists "students join" on public.project_members;
drop policy if exists "members join project" on public.project_members;

create policy "members join project" on public.project_members
for insert with check (
  user_id = auth.uid()
);

-- Ensure members can see memberships of projects they are in
drop policy if exists "see own memberships" on public.project_members;
create policy "see own memberships" on public.project_members
for select using (
  user_id = auth.uid() or public.is_project_owner(project_id, auth.uid()) or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id and pm.user_id = auth.uid()
  )
);

-- 3. Dedicated security-definer RPC function for atomic, reliable class/project joining
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

  normalized_code := upper(trim(code_input));

  if normalized_code = '' then
    return json_build_object('success', false, 'message', 'Please enter a valid join code.');
  end if;

  -- Match exact join_code, case-insensitive, stripped hyphen, or uuid
  select id, title, owner_id into target_project
  from public.projects
  where upper(trim(join_code)) = normalized_code
     or replace(upper(trim(join_code)), '-', '') = replace(normalized_code, '-', '')
     or id::text = trim(code_input)
  limit 1;

  if target_project.id is null then
    return json_build_object('success', false, 'message', 'That join code was not found. Please double-check the code.');
  end if;

  if target_project.owner_id = current_uid then
    return json_build_object(
      'success', true,
      'message', 'You are the creator of this project!',
      'project_id', target_project.id,
      'title', target_project.title
    );
  end if;

  -- Insert into project_members
  insert into public.project_members (project_id, user_id, role)
  values (target_project.id, current_uid, 'student')
  on conflict (project_id, user_id) do nothing;

  return json_build_object(
    'success', true,
    'message', 'Successfully joined ' || target_project.title || '!',
    'project_id', target_project.id,
    'title', target_project.title
  );
end;
$$;

grant execute on function public.join_project_by_code(text) to authenticated;
