-- B4X-PLAY5 database setup. Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  mode text not null check (mode in ('Solo','Duo','Squad')),
  map_name text,
  start_at timestamptz not null,
  entry_fee numeric(10,2) not null default 0 check (entry_fee >= 0),
  prize_pool numeric(10,2) not null default 0 check (prize_pool >= 0),
  slots integer not null default 48 check (slots between 2 and 500),
  description text,
  status text not null default 'open' check (status in ('open','closed','live','completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_name text not null check (char_length(team_name) between 2 and 40),
  captain_name text not null check (char_length(captain_name) between 2 and 40),
  captain_uid text not null check (captain_uid ~ '^[0-9]{5,20}$'),
  contact text not null check (char_length(contact) between 3 and 60),
  members_text text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (tournament_id, captain_uid)
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_name text not null,
  placement integer not null check (placement > 0),
  points integer not null default 0 check (points >= 0),
  kills integer not null default 0 check (kills >= 0),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.tournaments enable row level security;
alter table public.registrations enable row level security;
alter table public.results enable row level security;

-- Helper policies: only a user explicitly inserted into admin_users is an admin.
create policy "admins can read own admin row" on public.admin_users
for select to authenticated using (user_id = auth.uid());

create policy "public can read tournaments" on public.tournaments
for select to anon, authenticated using (true);
create policy "admins manage tournaments" on public.tournaments
for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "public can submit registration" on public.registrations
for insert to anon, authenticated
with check (
  status = 'pending'
  and exists(select 1 from public.tournaments t where t.id = tournament_id and t.status = 'open')
);
create policy "admins read registrations" on public.registrations
for select to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));
create policy "admins update registrations" on public.registrations
for update to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "public can read results" on public.results
for select to anon, authenticated using (true);
create policy "admins manage results" on public.results
for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));

-- After creating your admin user through Supabase Authentication, run this once:
-- Replace the email with your own admin email.
-- insert into public.admin_users(user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL';
