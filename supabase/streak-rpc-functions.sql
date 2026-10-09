-- Tiny Wins Streaks RPC repair migration
-- Run this in the Supabase SQL Editor after streak-invitations.sql (or after
-- the existing streak tables have the invite_code, member_limit, status, and
-- invited_at columns used by the Streaks feature).
-- This migration does not drop data or change RLS policies.

create or replace function public.get_pending_streak_invites()
returns table (
  membership_id uuid,
  group_id uuid,
  group_name text,
  group_description text,
  group_icon text,
  invited_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as membership_id,
    g.id as group_id,
    g.name as group_name,
    g.description as group_description,
    g.icon as group_icon,
    m.invited_at
  from public.streak_group_members as m
  join public.streak_groups as g on g.id = m.group_id
  where m.user_id = auth.uid()
    and m.status = 'pending'
  order by m.invited_at desc;
$$;

create or replace function public.request_streak_join(invite_code_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
  target_member_limit integer;
  current_member_count integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request to join a group';
  end if;

  select g.id, g.member_limit
    into target_group_id, target_member_limit
  from public.streak_groups as g
  where upper(g.invite_code) = upper(trim(invite_code_input))
  limit 1;

  if target_group_id is null then
    raise exception 'That invite code was not found';
  end if;

  if exists (
    select 1
    from public.streak_groups as g
    where g.id = target_group_id
      and g.owner_id = auth.uid()
  ) then
    raise exception 'You cannot join your own group';
  end if;

  if exists (
    select 1
    from public.streak_group_members as m
    where m.group_id = target_group_id
      and m.user_id = auth.uid()
      and m.status in ('active', 'accepted', 'pending')
  ) then
    raise exception 'You already belong to this group or have a pending request';
  end if;

  select count(*)
    into current_member_count
  from public.streak_group_members as m
  where m.group_id = target_group_id
    and m.status in ('active', 'accepted', 'pending');

  if current_member_count >= coalesce(target_member_limit, 10) then
    raise exception 'This group has reached its member limit';
  end if;

  insert into public.streak_group_members (
    group_id,
    user_id,
    status,
    invited_at
  ) values (
    target_group_id,
    auth.uid(),
    'pending',
    now()
  );

  return jsonb_build_object('group_id', target_group_id);
end;
$$;

grant execute on function public.get_pending_streak_invites() to authenticated;
grant execute on function public.request_streak_join(text) to authenticated;
