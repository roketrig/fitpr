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

-- ─────────────────────────────────────────────────────────────
-- PT / coaching layer.
-- A user is a plain student by default; calling become_pt() flips their
-- role and mints a referral code, which a student redeems (link_to_pt)
-- to attach themselves to that coach. Once linked, the PT gets write
-- access to that student's program_exercises (so "assigning exercises"
-- is just the PT editing the same weekly-program rows the student's app
-- already reads) and to a new nutrition_targets row for them.
-- ─────────────────────────────────────────────────────────────
alter table profiles add column if not exists role text not null default 'student' check (role in ('student', 'pt'));
alter table profiles add column if not exists referral_code text unique;

-- One row per student — a student has at most one active coach.
create table if not exists pt_student_links (
  student_id uuid primary key references auth.users (id) on delete cascade,
  pt_id uuid not null references auth.users (id) on delete cascade,
  linked_at timestamptz not null default now()
);

create index if not exists pt_student_links_pt_idx on pt_student_links (pt_id);

alter table pt_student_links enable row level security;

drop policy if exists "pt_student_links: select own as student" on pt_student_links;
create policy "pt_student_links: select own as student" on pt_student_links
  for select using (auth.uid() = student_id);

drop policy if exists "pt_student_links: select own as pt" on pt_student_links;
create policy "pt_student_links: select own as pt" on pt_student_links
  for select using (auth.uid() = pt_id);

drop policy if exists "profiles: pt view linked student" on profiles;
create policy "profiles: pt view linked student" on profiles
  for select using (
    exists (
      select 1 from pt_student_links
      where pt_student_links.student_id = profiles.id
        and pt_student_links.pt_id = auth.uid()
    )
  );

drop policy if exists "profiles: student view own pt" on profiles;
create policy "profiles: student view own pt" on profiles
  for select using (
    exists (
      select 1 from pt_student_links
      where pt_student_links.pt_id = profiles.id
        and pt_student_links.student_id = auth.uid()
    )
  );

-- PTs get write access to their linked students' weekly program, on top
-- of each user's own "manage my own rows" policies further up.
drop policy if exists "program_exercises: pt manage linked student" on program_exercises;
create policy "program_exercises: pt manage linked student" on program_exercises
  for all using (
    exists (
      select 1 from pt_student_links
      where pt_student_links.student_id = program_exercises.user_id
        and pt_student_links.pt_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from pt_student_links
      where pt_student_links.student_id = program_exercises.user_id
        and pt_student_links.pt_id = auth.uid()
    )
  );

create table if not exists nutrition_targets (
  student_id uuid primary key references auth.users (id) on delete cascade,
  pt_id uuid not null references auth.users (id) on delete cascade,
  calories integer,
  protein_g integer,
  updated_at timestamptz not null default now()
);

alter table nutrition_targets enable row level security;

drop policy if exists "nutrition_targets: select own as student" on nutrition_targets;
create policy "nutrition_targets: select own as student" on nutrition_targets
  for select using (auth.uid() = student_id);

drop policy if exists "nutrition_targets: pt manage linked student" on nutrition_targets;
create policy "nutrition_targets: pt manage linked student" on nutrition_targets
  for all using (
    exists (
      select 1 from pt_student_links
      where pt_student_links.student_id = nutrition_targets.student_id
        and pt_student_links.pt_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from pt_student_links
      where pt_student_links.student_id = nutrition_targets.student_id
        and pt_student_links.pt_id = auth.uid()
    )
  );

-- Flips the caller to a PT and mints them a referral code (idempotent —
-- calling it again just returns the existing code).
create or replace function public.become_pt()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  existing_code text;
  new_code text;
  attempt int := 0;
begin
  select referral_code into existing_code from profiles where id = auth.uid();
  if existing_code is not null then
    update profiles set role = 'pt' where id = auth.uid();
    return existing_code;
  end if;

  loop
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      update profiles set role = 'pt', referral_code = new_code where id = auth.uid();
      return new_code;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 10 then
        raise exception 'Could not generate a unique referral code, try again';
      end if;
    end;
  end loop;
end;
$$;

-- Redeems a coach's referral code for the calling (student) user.
-- Re-running it with a new code moves the student to that coach.
create or replace function public.link_to_pt(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  found_pt_id uuid;
begin
  select id into found_pt_id from profiles where referral_code = upper(code) and role = 'pt';
  if found_pt_id is null then
    raise exception 'Invalid referral code';
  end if;
  if found_pt_id = auth.uid() then
    raise exception 'You cannot link to yourself';
  end if;

  insert into pt_student_links (student_id, pt_id)
  values (auth.uid(), found_pt_id)
  on conflict (student_id) do update set pt_id = excluded.pt_id, linked_at = now();

  return found_pt_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- food_log_entries: a student's own food diary. food_slug matches the
-- Food slugs in src/constants/foods.ts when picked from the built-in
-- list, or is null for a manually typed custom entry — calories/protein
-- are always stored pre-computed so the log reads correctly even if the
-- underlying food list changes later. Student-only for now: PTs set
-- nutrition_targets but don't read this log (no policy grants them access).
-- ─────────────────────────────────────────────────────────────
create table if not exists food_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_slug text,
  label text not null,
  quantity numeric not null default 1,
  calories integer not null,
  protein_g integer not null,
  logged_at timestamptz not null default now()
);

create index if not exists food_log_entries_user_idx on food_log_entries (user_id, logged_at desc);

alter table food_log_entries enable row level security;

drop policy if exists "food_log_entries: select own" on food_log_entries;
create policy "food_log_entries: select own" on food_log_entries
  for select using (auth.uid() = user_id);

drop policy if exists "food_log_entries: insert own" on food_log_entries;
create policy "food_log_entries: insert own" on food_log_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "food_log_entries: delete own" on food_log_entries;
create policy "food_log_entries: delete own" on food_log_entries
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Account deletion. Every table above references auth.users(id)
-- on delete cascade, so removing the auth user removes all of a
-- person's rows (profile, sets, program, achievements, nutrition
-- target/log, coach link) in one shot — nothing else to clean up here.
-- security definer runs as the function's owner (postgres), which has
-- the privileges to delete from auth.users; a plain client can't do
-- this directly since it only ever holds an anon/user-scoped key.
-- ─────────────────────────────────────────────────────────────
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
