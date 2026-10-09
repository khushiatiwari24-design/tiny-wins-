-- Repair stale streak RPCs that still reference streak_group_members.role.
-- Run this once in the Supabase SQL Editor.

create or replace function public.get_pending_streak_invites()
returns table (membership_id uuid, group_id uuid, group_name text, group_description text, group_icon text, invited_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select m.id, g.id, g.name, g.description, g.icon, m.invited_at
  from public.streak_group_members m
  join public.streak_groups g on g.id = m.group_id
  where m.user_id = auth.uid() and m.status = 'pending'
  order by m.invited_at desc;
$$;

grant execute on function public.get_pending_streak_invites() to authenticated;

create or replace function public.request_streak_join(invite_code_input text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  target_group_id uuid;
  target_member_limit integer;
begin
  select id, member_limit into target_group_id, target_member_limit
  from public.streak_groups
  where upper(invite_code) = upper(trim(invite_code_input))
  limit 1;
  if target_group_id is null then raise exception 'That invite code was not found'; end if;
  if exists (select 1 from public.streak_group_members where group_id = target_group_id and user_id = auth.uid() and status in ('active', 'accepted', 'pending')) then
    raise exception 'You already belong to this group or have a pending request';
  end if;
  if (select count(*) from public.streak_group_members where group_id = target_group_id and status in ('active', 'accepted', 'pending')) >= coalesce(target_member_limit, 10) then
    raise exception 'This group has reached its member limit';
  end if;
  insert into public.streak_group_members (group_id, user_id, status, invited_at)
  values (target_group_id, auth.uid(), 'pending', now());
  return jsonb_build_object('group_id', target_group_id);
end;
$$;

grant execute on function public.request_streak_join(text) to authenticated;

create or replace function public.respond_to_streak_invitation(invitation_id uuid, group_id uuid, accept_invite boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.streak_group_members
    where id = invitation_id and streak_group_members.group_id = respond_to_streak_invitation.group_id
      and user_id = auth.uid() and status = 'pending'
  ) then raise exception 'This invitation is no longer available'; end if;
  if accept_invite then
    update public.streak_group_members set status = 'active'
    where id = invitation_id and streak_group_members.group_id = respond_to_streak_invitation.group_id and user_id = auth.uid();
  else
    delete from public.streak_group_members
    where id = invitation_id and streak_group_members.group_id = respond_to_streak_invitation.group_id and user_id = auth.uid();
  end if;
end;
$$;

grant execute on function public.respond_to_streak_invitation(uuid, uuid, boolean) to authenticated;
