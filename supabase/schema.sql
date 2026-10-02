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
  theme_palette text not null default 'lime',
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists theme_palette text not null default 'lime';
alter table profiles add column if not exists avatar_url text;

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

drop policy if exists "unlocked_achievements: update own" on unlocked_achievements;
create policy "unlocked_achievements: update own" on unlocked_achievements
  for update using (auth.uid() = user_id);

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

-- Which weekday (0=Sun..6=Sat, matching program_exercises) the PT wants
-- this student to submit a check-in (progress photo + weight) on. Null
-- until the PT sets one.
alter table pt_student_links add column if not exists checkin_day smallint check (checkin_day between 0 and 6);

create index if not exists pt_student_links_pt_idx on pt_student_links (pt_id);

alter table pt_student_links enable row level security;

drop policy if exists "pt_student_links: select own as student" on pt_student_links;
create policy "pt_student_links: select own as student" on pt_student_links
  for select using (auth.uid() = student_id);

drop policy if exists "pt_student_links: select own as pt" on pt_student_links;
create policy "pt_student_links: select own as pt" on pt_student_links
  for select using (auth.uid() = pt_id);

drop policy if exists "pt_student_links: pt set checkin day" on pt_student_links;
create policy "pt_student_links: pt set checkin day" on pt_student_links
  for update using (auth.uid() = pt_id) with check (auth.uid() = pt_id);

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

-- ─────────────────────────────────────────────────────────────
-- pt_subscriptions: one row per PT tracking trial/paid status. A PT gets
-- a free trial (up to student_limit students, for 1 month from
-- trial_started_at) when they become a PT; after that they need an active
-- store subscription to accept more students.
--
-- Rows are never written directly by a client — become_pt() creates the
-- initial trial row, and only the verify-purchase edge function (using the
-- service role key, which bypasses RLS) ever sets status to 'active' after
-- confirming a real purchase with Google/Apple. There is deliberately no
-- insert/update RLS policy for authenticated users.
-- ─────────────────────────────────────────────────────────────
create table if not exists pt_subscriptions (
  pt_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'active', 'expired', 'canceled')),
  trial_started_at timestamptz not null default now(),
  student_limit int not null default 5,
  platform text check (platform in ('android', 'ios')),
  store_product_id text,
  store_transaction_id text unique,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table pt_subscriptions enable row level security;

drop policy if exists "pt_subscriptions: select own" on pt_subscriptions;
create policy "pt_subscriptions: select own" on pt_subscriptions
  for select using (auth.uid() = pt_id);

-- True while target_pt_id can take on one more student: either an active
-- paid subscription, or still within the free trial's time and headcount.
create or replace function public.can_pt_accept_student(target_pt_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  sub record;
  current_students int;
begin
  select * into sub from pt_subscriptions where pt_id = target_pt_id;
  if sub is null then
    return false;
  end if;

  if sub.status = 'active' and (sub.current_period_end is null or sub.current_period_end > now()) then
    return true;
  end if;

  if sub.status = 'trial' and sub.trial_started_at > now() - interval '1 month' then
    select count(*) into current_students from pt_student_links where pt_id = target_pt_id;
    return current_students < sub.student_limit;
  end if;

  return false;
end;
$$;

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
  insert into pt_subscriptions (pt_id) values (auth.uid()) on conflict (pt_id) do nothing;

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
-- Re-running it with a new code moves the student to that coach. Blocked
-- when the coach can't take a new student (trial limit hit, no active
-- subscription) — unless the student is already linked to that same coach,
-- in which case it's just a harmless re-confirmation.
create or replace function public.link_to_pt(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  found_pt_id uuid;
  already_linked boolean;
begin
  select id into found_pt_id from profiles where referral_code = upper(code) and role = 'pt';
  if found_pt_id is null then
    raise exception 'Invalid referral code';
  end if;
  if found_pt_id = auth.uid() then
    raise exception 'You cannot link to yourself';
  end if;

  select exists(
    select 1 from pt_student_links where student_id = auth.uid() and pt_id = found_pt_id
  ) into already_linked;

  if not already_linked and not can_pt_accept_student(found_pt_id) then
    raise exception 'This coach is not accepting new students right now';
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

alter table food_log_entries add column if not exists photo_path text;

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

-- ─────────────────────────────────────────────────────────────
-- exercise-clips: public storage bucket for short (5-10s), self-filmed
-- exercise demo clips. Files are named "<exercise_slug>.mp4" and
-- uploaded by hand via Dashboard → Storage — nothing in the app needs a
-- code change to pick up a new clip beyond adding its slug to
-- src/constants/exerciseClips.ts. Public read (so the app can just load
-- a plain URL, same as any other static asset); writes are left to the
-- dashboard, not exposed to clients.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('exercise-clips', 'exercise-clips', true)
on conflict (id) do nothing;

drop policy if exists "exercise-clips: public read" on storage.objects;
create policy "exercise-clips: public read" on storage.objects
  for select using (bucket_id = 'exercise-clips');

-- ─────────────────────────────────────────────────────────────
-- avatars: public storage bucket for profile pictures (student or PT —
-- same profiles table, same bucket). Uploaded from the app itself, so
-- (unlike exercise-clips) this needs real write policies, not just a
-- dashboard-only read. Files live at "<user_id>/avatar.jpg" — the first
-- path segment is what the policies check ownership against. Public read
-- is fine here: a profile picture is meant to be seen.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars: own write" on storage.objects;
create policy "avatars: own write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: own update" on storage.objects;
create policy "avatars: own update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: own delete" on storage.objects;
create policy "avatars: own delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- food-photos: private bucket for meal photos attached to food_log_entries.
-- Kept private (not public like avatars/exercise-clips) because the food
-- log itself is private — the Privacy Policy explicitly says a coach
-- never sees it, so the photos shouldn't be reachable by a bare URL
-- either. The app resolves a short-lived signed URL to display one.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', false)
on conflict (id) do nothing;

drop policy if exists "food-photos: own select" on storage.objects;
create policy "food-photos: own select" on storage.objects
  for select using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "food-photos: own write" on storage.objects;
create policy "food-photos: own write" on storage.objects
  for insert with check (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "food-photos: own delete" on storage.objects;
create policy "food-photos: own delete" on storage.objects
  for delete using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- checkin-photos: private bucket for the weekly progress-photo check-in.
-- Unlike food-photos, the linked PT is *meant* to see these (that's the
-- point of the feature), so there's a second select policy granting that.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', false)
on conflict (id) do nothing;

drop policy if exists "checkin-photos: student select own" on storage.objects;
create policy "checkin-photos: student select own" on storage.objects
  for select using (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "checkin-photos: pt select linked" on storage.objects;
create policy "checkin-photos: pt select linked" on storage.objects
  for select using (
    bucket_id = 'checkin-photos' and exists (
      select 1 from pt_student_links
      where pt_student_links.student_id::text = (storage.foldername(name))[1]
        and pt_student_links.pt_id = auth.uid()
    )
  );

drop policy if exists "checkin-photos: student write own" on storage.objects;
create policy "checkin-photos: student write own" on storage.objects
  for insert with check (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "checkin-photos: student delete own" on storage.objects;
create policy "checkin-photos: student delete own" on storage.objects
  for delete using (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- checkin_photos: one row per weekly check-in submission (progress photo
-- + weight). The PT can read their linked students' rows and leave a
-- comment, but only through comment_on_checkin() below — not a direct
-- update grant — so a PT client can't touch weight_kg/photo_path, only
-- pt_comment.
-- ─────────────────────────────────────────────────────────────
create table if not exists checkin_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  photo_path text not null,
  weight_kg numeric,
  submitted_at timestamptz not null default now(),
  pt_comment text,
  pt_commented_at timestamptz
);

create index if not exists checkin_photos_student_idx on checkin_photos (student_id, submitted_at desc);

alter table checkin_photos enable row level security;

drop policy if exists "checkin_photos: student select own" on checkin_photos;
create policy "checkin_photos: student select own" on checkin_photos
  for select using (auth.uid() = student_id);

drop policy if exists "checkin_photos: student insert own" on checkin_photos;
create policy "checkin_photos: student insert own" on checkin_photos
  for insert with check (auth.uid() = student_id);

drop policy if exists "checkin_photos: student delete own" on checkin_photos;
create policy "checkin_photos: student delete own" on checkin_photos
  for delete using (auth.uid() = student_id);

drop policy if exists "checkin_photos: pt select linked" on checkin_photos;
create policy "checkin_photos: pt select linked" on checkin_photos
  for select using (
    exists (
      select 1 from pt_student_links
      where pt_student_links.student_id = checkin_photos.student_id
        and pt_student_links.pt_id = auth.uid()
    )
  );

create or replace function public.comment_on_checkin(checkin_id uuid, comment text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_student uuid;
begin
  select student_id into target_student from checkin_photos where id = checkin_id;
  if target_student is null then
    raise exception 'Check-in not found';
  end if;
  if not exists (
    select 1 from pt_student_links
    where pt_student_links.student_id = target_student
      and pt_student_links.pt_id = auth.uid()
  ) then
    raise exception 'Not authorized to comment on this check-in';
  end if;

  update checkin_photos
  set pt_comment = comment, pt_commented_at = now()
  where id = checkin_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- What a coach can see about a linked student.
--
-- Workout sets: always visible to the linked coach — reviewing training
-- progress is the point of being coached.
--
-- Food log (+ meal photos): visible ONLY while the student has switched on
-- profiles.share_food_log (off by default, student-controlled). The
-- helper below is security definer so the policy can read the consent flag
-- without tripping over profiles' own RLS.
-- ─────────────────────────────────────────────────────────────
alter table profiles add column if not exists share_food_log boolean not null default false;

drop policy if exists "workout_sets: pt select linked student" on workout_sets;
create policy "workout_sets: pt select linked student" on workout_sets
  for select using (
    exists (
      select 1 from pt_student_links
      where pt_student_links.student_id = workout_sets.user_id
        and pt_student_links.pt_id = auth.uid()
    )
  );

create or replace function public.pt_can_view_food_log(target_student uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from pt_student_links l
    join profiles p on p.id = l.student_id
    where l.student_id = target_student
      and l.pt_id = auth.uid()
      and p.share_food_log
  );
$$;

drop policy if exists "food_log_entries: pt select shared" on food_log_entries;
create policy "food_log_entries: pt select shared" on food_log_entries
  for select using (public.pt_can_view_food_log(user_id));

drop policy if exists "food-photos: pt select shared" on storage.objects;
create policy "food-photos: pt select shared" on storage.objects
  for select using (
    bucket_id = 'food-photos'
    and public.pt_can_view_food_log(((storage.foldername(name))[1])::uuid)
  );

-- ─────────────────────────────────────────────────────────────
-- Coach feedback on food log entries.
--
-- A coach who is allowed to see a student's food log (the student's
-- share_food_log switch is on) can approve an entry or ask for a change,
-- with an optional comment. Written only through review_food_entry(); the
-- student has no update policy on this table, and the insert trigger wipes
-- any review fields a client tries to set on a brand-new row.
-- ─────────────────────────────────────────────────────────────
alter table food_log_entries add column if not exists pt_status text check (pt_status in ('approved', 'revise'));
alter table food_log_entries add column if not exists pt_comment text;
alter table food_log_entries add column if not exists pt_reviewed_at timestamptz;

create or replace function public.clear_food_review_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.pt_status := null;
  new.pt_comment := null;
  new.pt_reviewed_at := null;
  return new;
end;
$$;

drop trigger if exists food_log_entries_clear_review on food_log_entries;
create trigger food_log_entries_clear_review
  before insert on food_log_entries
  for each row execute function public.clear_food_review_on_insert();

create or replace function public.review_food_entry(entry_id uuid, new_status text, new_comment text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_student uuid;
begin
  if new_status not in ('approved', 'revise') then
    raise exception 'Invalid review status';
  end if;

  select user_id into target_student from food_log_entries where id = entry_id;
  if target_student is null then
    raise exception 'Food entry not found';
  end if;
  if not public.pt_can_view_food_log(target_student) then
    raise exception 'Not authorized to review this food entry';
  end if;

  update food_log_entries
  set pt_status = new_status,
      pt_comment = nullif(trim(coalesce(new_comment, '')), ''),
      pt_reviewed_at = now()
  where id = entry_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Push notification tokens (Expo push). One row per device token; a token
-- belongs to whoever is signed in on that device right now. No RLS
-- policies on purpose: clients only touch this table through the two
-- functions below, and the send-push edge function reads it with the
-- service role.
-- ─────────────────────────────────────────────────────────────
create table if not exists push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on push_tokens (user_id);

alter table push_tokens enable row level security;

create or replace function public.register_push_token(new_token text, new_platform text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into push_tokens (token, user_id, platform)
  values (new_token, auth.uid(), new_platform)
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(old_token text)
returns void
language sql
security definer set search_path = public
as $$
  delete from push_tokens where token = old_token and user_id = auth.uid();
$$;
