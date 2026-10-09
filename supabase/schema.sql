create extension if not exists pgcrypto;
create type public.user_role as enum ('teacher','student');
create type public.task_priority as enum ('high','medium','low');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null, email text not null, role public.user_role not null default 'student', created_at timestamptz not null default now());
create table public.categories (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, name text not null, color text not null default '#8b5cf6', created_at timestamptz not null default now(), unique(user_id,name));
create table public.projects (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade, title text not null, description text not null default '', type text not null default 'personal', join_code text unique not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.project_members (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, role public.user_role not null default 'student', joined_at timestamptz not null default now(), unique(project_id,user_id));
create table public.tasks (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null check (char_length(title) between 1 and 300), description text, category_id uuid references public.categories(id) on delete set null, priority public.task_priority not null default 'medium', due_date date, due_time time, completed boolean not null default false, project_id uuid references public.projects(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.notes (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, author_id uuid not null references public.profiles(id) on delete cascade, title text not null, content text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,full_name,email,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','Tiny Wins user'),new.email,coalesce((new.raw_user_meta_data->>'role')::public.user_role,'student')); insert into public.categories(user_id,name,color) values (new.id,'Personal','#8b5cf6'),(new.id,'Study','#22d3ee'),(new.id,'Work','#f59e0b'),(new.id,'Health','#34d399'),(new.id,'Important','#fb7185'); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger tasks_touch before update on public.tasks for each row execute procedure public.touch_updated_at(); create trigger projects_touch before update on public.projects for each row execute procedure public.touch_updated_at(); create trigger notes_touch before update on public.notes for each row execute procedure public.touch_updated_at();
alter table public.profiles enable row level security; alter table public.categories enable row level security; alter table public.projects enable row level security; alter table public.project_members enable row level security; alter table public.tasks enable row level security; alter table public.notes enable row level security;
create policy "profiles readable by self" on public.profiles for select using (id=auth.uid()); create policy "profiles editable by self" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());
create policy "own categories" on public.categories for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own or joined projects" on public.projects for select using (owner_id=auth.uid() or exists(select 1 from public.project_members m where m.project_id=id and m.user_id=auth.uid())); create policy "teachers own projects" on public.projects for insert with check (owner_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and role='teacher')); create policy "owners manage projects" on public.projects for update using (owner_id=auth.uid()) with check (owner_id=auth.uid()); create policy "owners delete projects" on public.projects for delete using (owner_id=auth.uid());
create policy "see own memberships" on public.project_members for select using (user_id=auth.uid() or exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid())); create policy "students join" on public.project_members for insert with check (user_id=auth.uid());
create policy "own tasks" on public.tasks for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "project notes readable by members" on public.notes for select using (exists(select 1 from public.projects p where p.id=project_id and (p.owner_id=auth.uid() or exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=auth.uid())))); create policy "teachers manage notes" on public.notes for all using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid())) with check (author_id=auth.uid() and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid()));

-- Replace the recursive project and notes policies with security-definer checks.
create or replace function public.is_project_owner(project_uuid uuid, user_uuid uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.projects where id = project_uuid and owner_id = user_uuid); $$;
create or replace function public.is_project_member(project_uuid uuid, user_uuid uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.project_members where project_id = project_uuid and user_id = user_uuid); $$;
create or replace function public.can_view_project_profile(profile_uuid uuid, viewer_uuid uuid) returns boolean language sql stable security definer set search_path = public as $$ select profile_uuid = viewer_uuid or exists (select 1 from public.projects project where project.owner_id = profile_uuid and (project.owner_id = viewer_uuid or public.is_project_member(project.id, viewer_uuid))) or exists (select 1 from public.project_members member where member.user_id = profile_uuid and (public.is_project_owner(member.project_id, viewer_uuid) or public.is_project_member(member.project_id, viewer_uuid))); $$;
drop policy if exists "own or joined projects" on public.projects;
drop policy if exists "see own memberships" on public.project_members;
drop policy if exists "project notes readable by members" on public.notes;
drop policy if exists "teachers manage notes" on public.notes;
create policy "own or joined projects" on public.projects for select using (owner_id = auth.uid() or public.is_project_member(id, auth.uid()));
create policy "see own memberships" on public.project_members for select using (user_id = auth.uid() or public.is_project_owner(project_id, auth.uid()));
create policy "project notes readable by members" on public.notes for select using (public.is_project_owner(project_id, auth.uid()) or public.is_project_member(project_id, auth.uid()));
create policy "project owners manage notes" on public.notes for all using (public.is_project_owner(project_id, auth.uid())) with check (author_id = auth.uid() and public.is_project_owner(project_id, auth.uid()));
create policy "project teachers create notes" on public.notes for insert with check (author_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') and (public.is_project_owner(project_id, auth.uid()) or public.is_project_member(project_id, auth.uid())));
create policy "profiles visible to project members" on public.profiles for select using (public.can_view_project_profile(id, auth.uid()));

drop policy if exists "own tasks" on public.tasks;
create policy "project tasks readable by members" on public.tasks for select using (user_id = auth.uid() or public.is_project_owner(project_id, auth.uid()) or public.is_project_member(project_id, auth.uid()));
create policy "users create own tasks" on public.tasks for insert with check (user_id = auth.uid());
create policy "users update own tasks" on public.tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own tasks" on public.tasks for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy "project members can list files" on storage.objects for select using (
	bucket_id = 'project-files'
	and (public.is_project_owner(((storage.foldername(name))[1])::uuid, auth.uid()) or public.is_project_member(((storage.foldername(name))[1])::uuid, auth.uid()))
);
create policy "project members can upload files" on storage.objects for insert with check (
	bucket_id = 'project-files'
	and (storage.foldername(name))[2] = auth.uid()::text
	and (public.is_project_owner(((storage.foldername(name))[1])::uuid, auth.uid()) or public.is_project_member(((storage.foldername(name))[1])::uuid, auth.uid()))
);
create policy "file owners can update files" on storage.objects for update using (
	bucket_id = 'project-files' and owner_id = auth.uid()
) with check (bucket_id = 'project-files' and owner_id = auth.uid());
create policy "file owners can delete files" on storage.objects for delete using (
	bucket_id = 'project-files' and owner_id = auth.uid()
);
