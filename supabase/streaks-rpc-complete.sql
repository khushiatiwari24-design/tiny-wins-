-- Tiny Wins Streaks: complete RPC migration
-- Run after the existing streak tables and their required columns exist.
-- The frontend contract uses these existing columns:
-- streak_groups: id, owner_id, name, description, icon, invite_code, member_limit
-- streak_group_members: id, group_id, user_id, status, invited_at
-- streak_activity is returned by get_streak_group_details.
-- This migration is additive: it does not drop data or change RLS policies.

-- Ensure the columns used by the RPCs exist before function definitions are parsed.
alter table public.streak_groups add column if not exists description text not null default '';
alter table public.streak_groups add column if not exists icon text not null default '🔥';
alter table public.streak_groups add column if not exists daily_goal integer not null default 1;
alter table public.streak_groups add column if not exists required_members integer not null default 1;
alter table public.streak_groups add column if not exists invite_code text;
alter table public.streak_groups add column if not exists member_limit integer not null default 10;
alter table public.streak_group_members add column if not exists status text not null default 'active';
alter table public.streak_group_members add column if not exists invited_at timestamptz not null default now();

-- PostgreSQL cannot replace a function when its return type or OUT columns
-- changed between migrations. Drop only the RPC definitions before recreating them.
drop function if exists public.get_pending_streak_invites();
drop function if exists public.request_streak_join(text);
drop function if exists public.invite_streak_member(uuid, text);
drop function if exists public.respond_to_streak_invitation(uuid, boolean);
drop function if exists public.get_streak_group_details(uuid);
drop function if exists public.get_streak_group_details_v2(uuid);
drop function if exists public.remove_streak_member(uuid);
drop function if exists public.leave_streak_group(uuid);
drop function if exists public.get_my_streak_groups();
drop function if exists public.join_streak_by_code(text);

create or replace function public.streak_group_is_owner(group_uuid uuid, user_uuid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.streak_groups
    where id = group_uuid and owner_id = user_uuid
  );
$$;

create or replace function public.streak_group_is_active_member(group_uuid uuid, user_uuid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.streak_group_members
    where group_id = group_uuid
      and user_id = user_uuid
      and status in ('active', 'accepted')
  );
$$;

create or replace function public.get_pending_streak_invites()
returns table (
  membership_id uuid,
  group_id uuid,
  group_name text,
  group_description text,
  group_icon text,
  invited_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select m.id, g.id, g.name, g.description, g.icon, m.invited_at
  from public.streak_group_members m
  join public.streak_groups g on g.id = m.group_id
  where m.user_id = auth.uid()
    and m.status = 'pending'
  order by m.invited_at desc;
$$;

create or replace function public.request_streak_join(invite_code_input text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  target_group_id uuid;
  target_limit integer;
  current_count integer;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  select id, member_limit into target_group_id, target_limit
  from public.streak_groups
  where upper(invite_code) = upper(trim(invite_code_input))
  limit 1;
  if target_group_id is null then raise exception 'That invite code was not found'; end if;
  if public.streak_group_is_owner(target_group_id, auth.uid()) then raise exception 'You cannot join your own group'; end if;
  if exists (select 1 from public.streak_group_members where group_id = target_group_id and user_id = auth.uid() and status in ('active', 'accepted', 'pending')) then
    raise exception 'You already belong to this group or have a pending request';
  end if;
  select count(*) into current_count from public.streak_group_members where group_id = target_group_id and status in ('active', 'accepted', 'pending');
  if current_count >= coalesce(target_limit, 10) then raise exception 'This group has reached its member limit'; end if;
  insert into public.streak_group_members (group_id, user_id, status, invited_at) values (target_group_id, auth.uid(), 'pending', now());
  return jsonb_build_object('group_id', target_group_id);
end;
$$;

create or replace function public.get_streak_group_details(target_group_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  group_row jsonb;
  members_rows jsonb;
  activity_rows jsonb;
  task_rows jsonb;
begin
  if not (public.streak_group_is_owner(target_group_id, auth.uid()) or public.streak_group_is_active_member(target_group_id, auth.uid())) then
    raise exception 'You do not have access to this group';
  end if;
  select to_jsonb(g) into group_row from public.streak_groups g where g.id = target_group_id;
  if group_row is null then raise exception 'This group was not found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'user_id', m.user_id, 'status', m.status,
    'joined_at', m.invited_at, 'full_name', p.full_name
  )), '[]'::jsonb) into members_rows
  from public.streak_group_members m
  left join public.profiles p on p.id = m.user_id
  where m.group_id = target_group_id;
  select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) into activity_rows
  from public.streak_activity a where a.group_id = target_group_id;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into task_rows
  from public.tasks t
  where t.user_id in (
    select m.user_id
    from public.streak_group_members m
    where m.group_id = target_group_id
  );
  return jsonb_build_object(
    'group', group_row,
    'members', members_rows,
    'activities', activity_rows,
    'tasks', task_rows,
    'is_owner', public.streak_group_is_owner(target_group_id, auth.uid())
  );
end;
$$;

create or replace function public.invite_streak_member(group_uuid uuid, invitee_email text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  invitee uuid;
  invitee_name text;
  target_limit integer;
  current_count integer;
begin
  if not public.streak_group_is_owner(group_uuid, auth.uid()) then raise exception 'Only the group owner can invite members'; end if;
  select id, full_name into invitee, invitee_name from public.profiles where lower(trim(email)) = lower(trim(invitee_email)) limit 1;
  if invitee is null then raise exception 'No Tiny Wins account was found for that email address'; end if;
  if invitee = auth.uid() then raise exception 'You are already the owner of this group'; end if;
  if exists (select 1 from public.streak_group_members where group_id = group_uuid and user_id = invitee and status in ('active', 'accepted', 'pending')) then raise exception 'This user is already a member or has a pending invitation'; end if;
  select member_limit into target_limit from public.streak_groups where id = group_uuid;
  select count(*) into current_count from public.streak_group_members where group_id = group_uuid and status in ('active', 'accepted', 'pending');
  if current_count >= coalesce(target_limit, 10) then raise exception 'This group has reached its member limit'; end if;
  insert into public.streak_group_members (group_id, user_id, status, invited_at) values (group_uuid, invitee, 'pending', now());
  return jsonb_build_object('user_id', invitee, 'full_name', invitee_name);
end;
$$;

create or replace function public.respond_to_streak_invitation(membership_uuid uuid, accept_invite boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target_group_id uuid;
  target_limit integer;
  current_count integer;
begin
  select group_id into target_group_id from public.streak_group_members where id = membership_uuid and user_id = auth.uid() and status = 'pending';
  if target_group_id is null then raise exception 'This invitation is no longer available'; end if;
  if not accept_invite then delete from public.streak_group_members where id = membership_uuid and user_id = auth.uid(); return; end if;
  select member_limit into target_limit from public.streak_groups where id = target_group_id;
  select count(*) into current_count from public.streak_group_members where group_id = target_group_id and status in ('active', 'accepted');
  if current_count >= coalesce(target_limit, 10) then raise exception 'This group has reached its member limit'; end if;
  update public.streak_group_members set status = 'active' where id = membership_uuid and user_id = auth.uid();
end;
$$;

create or replace function public.remove_streak_member(membership_uuid uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from public.streak_group_members m
  where m.id = membership_uuid
    and (public.streak_group_is_owner(m.group_id, auth.uid()) or m.user_id = auth.uid());
$$;

create or replace function public.leave_streak_group(group_uuid uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from public.streak_group_members
  where group_id = group_uuid
    and user_id = auth.uid()
    and not public.streak_group_is_owner(group_uuid, auth.uid());
$$;

revoke execute on function public.get_pending_streak_invites() from public;
revoke execute on function public.request_streak_join(text) from public;
revoke execute on function public.get_streak_group_details(uuid) from public;
revoke execute on function public.invite_streak_member(uuid, text) from public;
revoke execute on function public.respond_to_streak_invitation(uuid, boolean) from public;
revoke execute on function public.remove_streak_member(uuid) from public;
revoke execute on function public.leave_streak_group(uuid) from public;

grant execute on function public.get_pending_streak_invites() to authenticated;
grant execute on function public.request_streak_join(text) to authenticated;
grant execute on function public.get_streak_group_details(uuid) to authenticated;

create or replace function public.get_streak_group_details_v2(target_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not (
    public.streak_group_is_owner(target_group_id, auth.uid())
    or exists (
      select 1 from public.streak_group_members m
      where m.group_id = target_group_id and m.user_id = auth.uid()
    )
  ) then
    raise exception 'You do not have access to this group';
  end if;

  select jsonb_build_object(
    'group', to_jsonb(g),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'user_id', m.user_id, 'status', m.status,
      'joined_at', m.invited_at, 'full_name', p.full_name,
      'email', p.email, 'avatar_url', p.avatar_url
    )) from public.streak_group_members m
      left join public.profiles p on p.id = m.user_id
      where m.group_id = target_group_id), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(to_jsonb(a))
      from public.streak_activity a where a.group_id = target_group_id), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc)
      from public.tasks t where t.user_id in (
        select m.user_id from public.streak_group_members m
        where m.group_id = target_group_id
      )), '[]'::jsonb)
  ) into result
  from public.streak_groups g
  where g.id = target_group_id;

  if result is null then raise exception 'This group was not found'; end if;
  return result;
end;
$$;

grant execute on function public.get_streak_group_details_v2(uuid) to authenticated;
grant execute on function public.invite_streak_member(uuid, text) to authenticated;
grant execute on function public.respond_to_streak_invitation(uuid, boolean) to authenticated;
grant execute on function public.remove_streak_member(uuid) to authenticated;
grant execute on function public.leave_streak_group(uuid) to authenticated;

-- Direct RPCs used by clients that need joined groups and immediate code joins.
create or replace function public.get_my_streak_groups()
returns table (
  id uuid,
  name text,
  description text,
  invite_code text,
  created_at timestamptz,
  role text,
  member_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    sg.id,
    sg.name,
    coalesce(sg.description, '')::text,
    coalesce(sg.invite_code, '')::text,
    sg.created_at,
    case when sg.owner_id = auth.uid() then 'owner' else 'member' end::text,
    (
      select count(*)
      from public.streak_group_members member_count_row
      where member_count_row.group_id = sg.id
        and member_count_row.status in ('active', 'accepted')
    )::bigint
  from public.streak_groups sg
  left join public.streak_group_members sgm
    on sgm.group_id = sg.id
   and sgm.user_id = auth.uid()
   and sgm.status in ('active', 'accepted')
  where sg.owner_id = auth.uid() or sgm.user_id is not null
  order by sg.created_at desc;
$$;

create or replace function public.join_streak_by_code(code_input text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  group_record record;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'message', 'You must be signed in');
  end if;

  select id, name into group_record
  from public.streak_groups
  where upper(trim(invite_code)) = upper(trim(code_input))
     or id::text = trim(code_input)
  limit 1;

  if group_record.id is null then
    return json_build_object('success', false, 'message', 'Invalid invite code');
  end if;

  insert into public.streak_group_members (group_id, user_id, status, invited_at)
  values (group_record.id, auth.uid(), 'active', now())
  on conflict do nothing;

  return json_build_object('success', true, 'group_name', group_record.name);
end;
$$;

grant execute on function public.get_my_streak_groups() to authenticated;
grant execute on function public.join_streak_by_code(text) to authenticated;

notify pgrst, 'reload schema';
