create table if not exists public.portal_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.portal_states enable row level security;

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
