-- FitPR — Supabase schema
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses "if not exists" / "or replace" where possible.

-- ─────────────────────────────────────────────────────────────
-- profiles: one row per authenticated user, 1-1 with auth.users
-- ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  gender text check (gender in ('male', 'female')),
  height_cm numeric,
  weight_kg numeric,
  language text not null default 'en' check (language in ('en', 'tr')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles: select own" on profiles;
create policy "profiles: select own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: insert own" on profiles;
create policy "profiles: insert own" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: update own" on profiles;
create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- workout_sets: every logged set.
-- exercise_slug matches the ExerciseSlug values in src/types/index.ts —
-- kept as free text (not a foreign key) since the exercise catalog lives
-- in app code and can grow without a matching migration here.
-- weight_kg is 0 for reps_only / time_seconds exercises; reps holds the
-- rep count or, for time_seconds exercises, the held duration in seconds.
-- ─────────────────────────────────────────────────────────────
create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_slug text not null,
  weight_kg numeric not null default 0,
  reps integer not null,
  is_pr boolean not null default false,
  performed_at timestamptz not null default now()
);

create index if not exists workout_sets_user_exercise_idx
  on workout_sets (user_id, exercise_slug, performed_at desc);

alter table workout_sets enable row level security;

drop policy if exists "workout_sets: select own" on workout_sets;
create policy "workout_sets: select own" on workout_sets
  for select using (auth.uid() = user_id);

drop policy if exists "workout_sets: insert own" on workout_sets;
create policy "workout_sets: insert own" on workout_sets
  for insert with check (auth.uid() = user_id);

drop policy if exists "workout_sets: update own" on workout_sets;
create policy "workout_sets: update own" on workout_sets
  for update using (auth.uid() = user_id);

drop policy if exists "workout_sets: delete own" on workout_sets;
create policy "workout_sets: delete own" on workout_sets
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- unlocked_achievements: which badges (exercise thresholds or streak
-- badges, matching the slugs generated in src/constants/achievements.ts)
-- a user has earned. Achievement definitions/thresholds are not stored
-- here — they live in app code so tuning them doesn't need a migration.
-- ─────────────────────────────────────────────────────────────
create table if not exists unlocked_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_slug text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_slug)
);

alter table unlocked_achievements enable row level security;

drop policy if exists "unlocked_achievements: select own" on unlocked_achievements;
create policy "unlocked_achievements: select own" on unlocked_achievements
  for select using (auth.uid() = user_id);

drop policy if exists "unlocked_achievements: insert own" on unlocked_achievements;
create policy "unlocked_achievements: insert own" on unlocked_achievements
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- program_exercises: the user's editable weekly program. One row per
-- exercise assigned to a weekday. day_of_week matches JS Date#getDay()
-- (0 = Sunday ... 6 = Saturday). "position" preserves the order exercises
-- were added in for that day.
-- ─────────────────────────────────────────────────────────────
create table if not exists program_exercises (
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  exercise_slug text not null,
  target_sets integer not null default 3,
  target_reps integer not null default 12,
  position integer not null default 0,
  primary key (user_id, day_of_week, exercise_slug)
);

alter table program_exercises enable row level security;

drop policy if exists "program_exercises: select own" on program_exercises;
create policy "program_exercises: select own" on program_exercises
  for select using (auth.uid() = user_id);

drop policy if exists "program_exercises: insert own" on program_exercises;
create policy "program_exercises: insert own" on program_exercises
  for insert with check (auth.uid() = user_id);

drop policy if exists "program_exercises: update own" on program_exercises;
create policy "program_exercises: update own" on program_exercises
  for update using (auth.uid() = user_id);

drop policy if exists "program_exercises: delete own" on program_exercises;
create policy "program_exercises: delete own" on program_exercises
  for delete using (auth.uid() = user_id);
