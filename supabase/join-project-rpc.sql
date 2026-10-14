-- Tiny Wins: Project Join RPC & RLS Fix
-- Run this in the Supabase SQL Editor to allow members to join projects via join code.

-- 1. Create secure join_project_by_code function
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
    return json_build_object('success', false, 'message', 'You must be signed in to join a project.');
  end if;

  normalized_code := upper(trim(code_input));

  if normalized_code = '' then
    return json_build_object('success', false, 'message', 'Please enter a valid join code.');
  end if;

  -- Match exact join_code, case-insensitive, or stripped hyphen match
  select id, title, owner_id into target_project
  from public.projects
  where upper(trim(join_code)) = normalized_code
     or replace(upper(trim(join_code)), '-', '') = replace(normalized_code, '-', '')
     or id::text = trim(code_input)
  limit 1;

  if target_project.id is null then
    return json_build_object('success', false, 'message', 'That join code was not found. Please verify the code.');
  end if;

  if target_project.owner_id = current_uid then
    return json_build_object('success', true, 'message', 'You are already the owner of this project!', 'project_id', target_project.id, 'title', target_project.title);
  end if;

  -- Insert into project_members
  insert into public.project_members (project_id, user_id, role)
  values (target_project.id, current_uid, 'student')
  on conflict (project_id, user_id) do nothing;

  return json_build_object('success', true, 'message', 'Successfully joined ' || target_project.title || '!', 'project_id', target_project.id, 'title', target_project.title);
end;
$$;

grant execute on function public.join_project_by_code(text) to authenticated;

-- 2. Update projects table RLS to also allow looking up projects by join_code
drop policy if exists "own or joined projects" on public.projects;
create policy "own or joined projects" on public.projects
for select using (
  owner_id = auth.uid()
  or public.is_project_member(id, auth.uid())
  or join_code is not null
);
