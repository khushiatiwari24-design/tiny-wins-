-- Run once in the Supabase SQL Editor after the existing streak tables exist.
-- This migration is additive and keeps profile email lookup inside security-definer RPCs.

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

alter table public.streak_groups add column if not exists description text not null default '';
alter table public.streak_groups add column if not exists icon text not null default '🔥';
alter table public.streak_groups add column if not exists daily_goal integer not null default 1;
alter table public.streak_groups add column if not exists required_members integer not null default 1;
alter table public.streak_groups add column if not exists invite_code text;
alter table public.streak_groups add column if not exists member_limit integer not null default 10;
alter table public.streak_group_members add column if not exists status text not null default 'active';
alter table public.streak_group_members add column if not exists invited_at timestamptz not null default now();

update public.streak_groups
set invite_code = upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8))
where invite_code is null or invite_code = '';

create unique index if not exists streak_groups_invite_code_key
  on public.streak_groups (invite_code)
  where invite_code is not null;

create or replace function public.streak_group_is_owner(group_uuid uuid, user_uuid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.streak_groups where id = group_uuid and owner_id = user_uuid); $$;

create or replace function public.streak_group_is_active_member(group_uuid uuid, user_uuid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.streak_group_members where group_id = group_uuid and user_id = user_uuid and status in ('active', 'accepted')); $$;

create or replace function public.invite_streak_member(group_uuid uuid, invitee_email text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  caller uuid := auth.uid();
  invitee uuid;
  invitee_name text;
  group_limit integer;
  active_count integer;
begin
  if caller is null or not public.streak_group_is_owner(group_uuid, caller) then raise exception 'Only the group owner can invite members'; end if;
  select id, full_name into invitee, invitee_name from public.profiles where lower(trim(email)) = lower(trim(invitee_email)) limit 1;
  if invitee is null then raise exception 'No Tiny Wins account was found for that email address'; end if;
  if invitee = caller then raise exception 'You are already the owner of this group'; end if;
  if exists (select 1 from public.streak_group_members where group_id = group_uuid and user_id = invitee and status in ('active', 'accepted')) then raise exception 'This user is already a member of the group'; end if;
  if exists (select 1 from public.streak_group_members where group_id = group_uuid and user_id = invitee and status = 'pending') then raise exception 'An invitation is already pending for this user'; end if;
  select member_limit into group_limit from public.streak_groups where id = group_uuid;
  select count(*) into active_count from public.streak_group_members where group_id = group_uuid and status in ('active', 'accepted', 'pending');
  if active_count >= coalesce(group_limit, 10) then raise exception 'This group has reached its member limit'; end if;
  insert into public.streak_group_members (group_id, user_id, status, invited_at) values (group_uuid, invitee, 'pending', now());
  return jsonb_build_object('user_id', invitee, 'full_name', invitee_name);
end;
$$;

create or replace function public.get_pending_streak_invites()
returns table (membership_id uuid, group_id uuid, group_name text, group_description text, group_icon text, invited_at timestamptz)
language sql security definer set search_path = public
as $$
  select m.id, g.id, g.name, g.description, g.icon, m.invited_at
  from public.streak_group_members m
  join public.streak_groups g on g.id = m.group_id
  where m.user_id = auth.uid() and m.status = 'pending'
  order by m.invited_at desc;
$$;

create or replace function public.respond_to_streak_invitation(membership_uuid uuid, accept_invite boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare
  target_group uuid;
  group_limit integer;
  active_count integer;
begin
  select group_id into target_group from public.streak_group_members where id = membership_uuid and user_id = auth.uid() and status = 'pending';
  if target_group is null then raise exception 'This invitation is no longer available'; end if;
  if not accept_invite then delete from public.streak_group_members where id = membership_uuid and user_id = auth.uid(); return; end if;
  select member_limit into group_limit from public.streak_groups where id = target_group;
  select count(*) into active_count from public.streak_group_members where group_id = target_group and status in ('active', 'accepted');
  if active_count >= coalesce(group_limit, 10) then raise exception 'This group has reached its member limit'; end if;
  update public.streak_group_members set status = 'active' where id = membership_uuid and user_id = auth.uid();
end;
$$;

create or replace function public.request_streak_join(invite_code_input text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  target_group uuid;
  group_limit integer;
  member_count integer;
begin
  select id, member_limit into target_group, group_limit from public.streak_groups where upper(invite_code) = upper(trim(invite_code_input)) limit 1;
  if target_group is null then raise exception 'That invite code was not found'; end if;
  if public.streak_group_is_owner(target_group, auth.uid()) or public.streak_group_is_active_member(target_group, auth.uid()) then raise exception 'You already belong to this group'; end if;
  if exists (select 1 from public.streak_group_members where group_id = target_group and user_id = auth.uid() and status = 'pending') then raise exception 'Your join request is already pending'; end if;
  select count(*) into member_count from public.streak_group_members where group_id = target_group and status in ('active', 'accepted', 'pending');
  if member_count >= coalesce(group_limit, 10) then raise exception 'This group has reached its member limit'; end if;
  insert into public.streak_group_members (group_id, user_id, status, invited_at) values (target_group, auth.uid(), 'pending', now());
  return jsonb_build_object('group_id', target_group);
end;
$$;

create or replace function public.remove_streak_member(membership_uuid uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from public.streak_group_members m
  where m.id = membership_uuid and (public.streak_group_is_owner(m.group_id, auth.uid()) or m.user_id = auth.uid());
end;
$$;

create or replace function public.leave_streak_group(group_uuid uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from public.streak_group_members where group_id = group_uuid and user_id = auth.uid() and not public.streak_group_is_owner(group_uuid, auth.uid());
end;
$$;

create or replace function public.get_streak_group_details(target_group_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  group_row jsonb;
  members_rows jsonb;
  activity_rows jsonb;
  task_rows jsonb;
begin
  if not (public.streak_group_is_owner(target_group_id, auth.uid()) or public.streak_group_is_active_member(target_group_id, auth.uid())) then raise exception 'You do not have access to this group'; end if;
  select to_jsonb(g) into group_row from public.streak_groups g where g.id = target_group_id;
  if group_row is null then raise exception 'This group was not found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'user_id', m.user_id, 'status', m.status, 'joined_at', m.invited_at, 'full_name', p.full_name, 'email', p.email)), '[]'::jsonb) into members_rows
  from public.streak_group_members m left join public.profiles p on p.id = m.user_id
  where m.group_id = target_group_id;
  select coalesce(jsonb_agg(to_jsonb(a) order by coalesce(a.activity_date::text, a.created_at::text) desc), '[]'::jsonb) into activity_rows
  from public.streak_activity a where a.group_id = target_group_id;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into task_rows
  from public.tasks t
  where t.user_id in (select m.user_id from public.streak_group_members m where m.group_id = target_group_id);
  return jsonb_build_object('group', group_row, 'members', members_rows, 'activities', activity_rows, 'tasks', task_rows, 'is_owner', public.streak_group_is_owner(target_group_id, auth.uid()));
end;
$$;

grant execute on function public.invite_streak_member(uuid, text) to authenticated;
grant execute on function public.get_pending_streak_invites() to authenticated;
grant execute on function public.respond_to_streak_invitation(uuid, boolean) to authenticated;
grant execute on function public.request_streak_join(text) to authenticated;
grant execute on function public.remove_streak_member(uuid) to authenticated;
grant execute on function public.leave_streak_group(uuid) to authenticated;
grant execute on function public.get_streak_group_details(uuid) to authenticated;

create or replace function public.get_streak_group_details_v2(target_group_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare result jsonb;
begin
  if not (public.streak_group_is_owner(target_group_id, auth.uid()) or exists (
    select 1 from public.streak_group_members m
    where m.group_id = target_group_id and m.user_id = auth.uid()
  )) then raise exception 'You do not have access to this group'; end if;
  select jsonb_build_object(
    'group', to_jsonb(g),
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'user_id', m.user_id, 'status', m.status, 'joined_at', m.invited_at, 'full_name', p.full_name, 'email', p.email, 'avatar_url', p.avatar_url)) from public.streak_group_members m left join public.profiles p on p.id = m.user_id where m.group_id = target_group_id), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(to_jsonb(a)) from public.streak_activity a where a.group_id = target_group_id), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.tasks t where t.user_id in (select m.user_id from public.streak_group_members m where m.group_id = target_group_id)), '[]'::jsonb)
  ) into result from public.streak_groups g where g.id = target_group_id;
  if result is null then raise exception 'This group was not found'; end if;
  return result;
end;
$$;

grant execute on function public.get_streak_group_details_v2(uuid) to authenticated;