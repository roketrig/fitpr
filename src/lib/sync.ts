import { emptyWeek, useProgramStore } from '../store/programStore';
import { useProfileStore } from '../store/profileStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCoachStore } from '../store/coachStore';
import { useFoodLogStore } from '../store/foodLogStore';
import { useWorkoutStore } from '../store/workoutStore';
import { ExerciseSlug, Language, Role, WeeklyProgram } from '../types';
import { supabase } from './supabase';

async function hasRemoteData(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('workout_sets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) {
    console.warn('Supabase hasRemoteData check failed', error);
    return false;
  }
  return (count ?? 0) > 0;
}

async function pushLocalDataToCloud(userId: string) {
  const { sets, unlockedAchievementSlugs } = useWorkoutStore.getState();
  const { week } = useProgramStore.getState();
  const { profile } = useProfileStore.getState();
  const { language } = useSettingsStore.getState();

  await supabase
    .from('profiles')
    .update({
      display_name: profile.displayName,
      gender: profile.gender,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      language,
    })
    .eq('id', userId);

  if (sets.length > 0) {
    await supabase.from('workout_sets').insert(
      sets.map((s) => ({
        user_id: userId,
        exercise_slug: s.exerciseSlug,
        weight_kg: s.weightKg,
        reps: s.reps,
        is_pr: s.isPr,
        performed_at: s.performedAt,
      }))
    );
  }

  if (unlockedAchievementSlugs.length > 0) {
    await supabase.from('unlocked_achievements').upsert(
      unlockedAchievementSlugs.map((achievement_slug) => ({ user_id: userId, achievement_slug })),
      { onConflict: 'user_id,achievement_slug' }
    );
  }

  const programRows = Object.entries(week).flatMap(([day, exercises]) =>
    exercises.map((e, i) => ({
      user_id: userId,
      day_of_week: Number(day),
      exercise_slug: e.exerciseSlug,
      target_sets: e.targetSets,
      target_reps: e.targetReps,
      position: i,
    }))
  );
  if (programRows.length > 0) {
    await supabase
      .from('program_exercises')
      .upsert(programRows, { onConflict: 'user_id,day_of_week,exercise_slug' });
  }
}

async function pullCloudDataToLocal(userId: string) {
  const [profileRes, setsRes, unlockedRes, programRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('workout_sets').select('*').eq('user_id', userId),
    supabase.from('unlocked_achievements').select('achievement_slug').eq('user_id', userId),
    supabase.from('program_exercises').select('*').eq('user_id', userId).order('position'),
  ]);

  if (profileRes.data) {
    const row = profileRes.data;
    useProfileStore.setState((state) => ({
      profile: {
        ...state.profile,
        displayName: row.display_name ?? '',
        gender: row.gender,
        heightCm: row.height_cm,
        weightKg: row.weight_kg,
        role: (row.role as Role) ?? 'student',
        referralCode: row.referral_code ?? null,
      },
    }));
    if (row.language) useSettingsStore.setState({ language: row.language as Language });
  }

  if (setsRes.data) {
    useWorkoutStore.setState({
      sets: setsRes.data.map((r) => ({
        id: r.id,
        exerciseSlug: r.exercise_slug as ExerciseSlug,
        weightKg: Number(r.weight_kg),
        reps: r.reps,
        isPr: r.is_pr,
        performedAt: r.performed_at,
      })),
    });
  }

  if (unlockedRes.data) {
    useWorkoutStore.setState({
      unlockedAchievementSlugs: unlockedRes.data.map((r) => r.achievement_slug),
    });
  }

  if (programRes.data) {
    const week: WeeklyProgram = emptyWeek();
    for (const row of programRes.data) {
      week[row.day_of_week as keyof WeeklyProgram].push({
        exerciseSlug: row.exercise_slug as ExerciseSlug,
        targetSets: row.target_sets,
        targetReps: row.target_reps,
      });
    }
    useProgramStore.setState({ week });
  }
}

// Called right after a successful sign-in/sign-up. A brand-new account has no
// remote data yet, so we upload whatever was tracked locally as a guest;
// an account that already has cloud data (returning on a new device) pulls
// it down and replaces local state instead.
export async function syncOnSignIn(userId: string) {
  const remoteHasData = await hasRemoteData(userId);
  if (remoteHasData) {
    await pullCloudDataToLocal(userId);
  } else {
    await pushLocalDataToCloud(userId);
  }
  await Promise.all([useCoachStore.getState().refresh(), useFoodLogStore.getState().refreshToday()]);
}

// Local (AsyncStorage) state is per-device, not per-account — if we didn't
// wipe it on sign-out, whatever was still sitting locally (a guest session's
// data, or the previous account's) would get treated as "local data to
// migrate" the next time someone signs into a *different* account on this
// device, leaking one account's workouts/program into another's.
function resetLocalDataForSignOut() {
  useWorkoutStore.setState({ sets: [], unlockedAchievementSlugs: [] });
  useProgramStore.setState({ week: emptyWeek() });
  useProfileStore.setState((state) => ({
    profile: {
      displayName: '',
      gender: null,
      heightCm: null,
      weightKg: null,
      memberSinceYear: state.profile.memberSinceYear,
      role: 'student',
      referralCode: null,
    },
  }));
  useSettingsStore.setState({ language: 'en' });
  useCoachStore.setState({ coach: null, nutritionTarget: null });
  useFoodLogStore.setState({ todaysEntries: [] });
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    resetLocalDataForSignOut();
  }
});
