-- ============================================================
--  Svenska Flashkort — Supabase Schema
--  Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ── Profiles ──────────────────────────────────────────────
-- Auto-populated when a user signs in for the first time
-- via the trigger below.

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz default now()
);

-- ── Cards ─────────────────────────────────────────────────
-- Each user owns their own word list. sv/en are lowercased
-- at insert time by the app.

create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  sv         text not null,
  en         text not null,
  note       text default '',
  created_at timestamptz default now(),
  unique(user_id, sv, en)   -- prevent duplicate pairs per user
);

-- ── Progress ──────────────────────────────────────────────
-- One row per (user, card). Upserted after every answer.

create table if not exists public.progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  card_id    uuid not null references public.cards(id) on delete cascade,
  correct    int  not null default 0,
  wrong      int  not null default 0,
  interval   int  not null default 1,
  next_due   timestamptz default now(),
  last_seen  timestamptz,
  unique(user_id, card_id)
);

-- ============================================================
--  Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.cards    enable row level security;
alter table public.progress enable row level security;

-- profiles: users can only see and edit their own row
create policy "profiles: owner access"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- cards: users can only see and edit their own cards
create policy "cards: owner access"
  on public.cards for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- progress: users can only see and edit their own progress
create policy "progress: owner access"
  on public.progress for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
--  Auto-create profile on sign-up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
