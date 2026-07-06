create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('instructor','learner')),
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learner_records (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  learner_user_id uuid references public.profiles(id) on delete set null,
  learner_name text not null,
  learner_email text not null,
  temporary_password text,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.learner_records enable row level security;
alter table public.portal_states enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "Profiles can read their own profile" on public.profiles;
create policy "Profiles can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Instructors can read their learners" on public.learner_records;
create policy "Instructors can read their learners"
on public.learner_records
for select
to authenticated
using (instructor_id = auth.uid() and public.current_role() = 'instructor');

drop policy if exists "Learners can read their own learner record" on public.learner_records;
create policy "Learners can read their own learner record"
on public.learner_records
for select
to authenticated
using (learner_user_id = auth.uid() and public.current_role() = 'learner');

drop policy if exists "Instructors can create learner records" on public.learner_records;
create policy "Instructors can create learner records"
on public.learner_records
for insert
to authenticated
with check (instructor_id = auth.uid() and public.current_role() = 'instructor');

drop policy if exists "Instructors can update their learners" on public.learner_records;
create policy "Instructors can update their learners"
on public.learner_records
for update
to authenticated
using (instructor_id = auth.uid() and public.current_role() = 'instructor')
with check (instructor_id = auth.uid() and public.current_role() = 'instructor');

drop policy if exists "Learners can add learner-owned notes" on public.learner_records;
create policy "Learners can add learner-owned notes"
on public.learner_records
for update
to authenticated
using (learner_user_id = auth.uid() and public.current_role() = 'learner')
with check (learner_user_id = auth.uid() and public.current_role() = 'learner');

drop policy if exists "Users can read their own portal data" on public.portal_states;
create policy "Users can read their own portal data"
on public.portal_states
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own portal data" on public.portal_states;
create policy "Users can insert their own portal data"
on public.portal_states
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own portal data" on public.portal_states;
create policy "Users can update their own portal data"
on public.portal_states
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists learner_records_instructor_id_idx on public.learner_records(instructor_id);
create index if not exists learner_records_learner_user_id_idx on public.learner_records(learner_user_id);
