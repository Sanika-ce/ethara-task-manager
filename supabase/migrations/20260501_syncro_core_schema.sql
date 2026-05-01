-- Syncro core schema: profiles, projects, tasks, auth trigger, and RLS.

create extension if not exists "pgcrypto";

-- 1) Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('ADMIN', 'MEMBER');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
  end if;
end $$;

-- 2) Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role public.user_role not null default 'MEMBER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'TODO',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_status on public.tasks(status);

-- 3) Utility trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists trg_tasks_set_updated_at on public.tasks;
create trigger trg_tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

-- 4) Auth trigger: create profile row when a new auth user signs up
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when (new.raw_user_meta_data ->> 'role') in ('ADMIN', 'MEMBER')
        then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'MEMBER'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case
      when excluded.full_name is null or excluded.full_name = '' then public.profiles.full_name
      else excluded.full_name
    end;

  return new;
exception
  when others then
    raise warning 'handle_new_auth_user failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- 5) Security helper functions
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles profile_row
    where profile_row.id = uid
      and profile_row.role = 'ADMIN'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- 6) Row Level Security
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Profiles: users can read/update their own row; admins can read all.
drop policy if exists "Profiles read own or admin" on public.profiles;
create policy "Profiles read own or admin"
on public.profiles
for select
using (
  id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Profiles update own" on public.profiles;
drop policy if exists "Profiles update own or admin" on public.profiles;
create policy "Profiles update own or admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

-- Projects: admins see all, members see projects they own.
drop policy if exists "Projects select admin all or owner" on public.projects;
create policy "Projects select admin all or owner"
on public.projects
for select
using (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

-- Tasks: requirement policy
-- Admins can see every task.
-- Members can only see tasks where assignee_id = auth.uid().
drop policy if exists "Tasks select admin all member assigned" on public.tasks;
create policy "Tasks select admin all member assigned"
on public.tasks
for select
using (
  public.is_admin(auth.uid())
  or assignee_id = auth.uid()
);

-- Optional write policies for authenticated users (can be tightened later).
drop policy if exists "Tasks insert authenticated" on public.tasks;
create policy "Tasks insert authenticated"
on public.tasks
for insert
with check (auth.uid() is not null);

drop policy if exists "Tasks update admin or creator" on public.tasks;
create policy "Tasks update admin or creator"
on public.tasks
for update
using (
  created_by = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  created_by = auth.uid()
  or public.is_admin(auth.uid())
);
