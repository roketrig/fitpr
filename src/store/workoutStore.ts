import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getExercise } from '../constants/exercises';
import { getNewlyUnlockedAchievements, STREAK_ACHIEVEMENTS } from '../constants/achievements';
import { generateUuid, isUuid } from '../lib/id';
import { getCurrentUserId } from '../lib/session';
import { supabase } from '../lib/supabase';
import { currentStreakDays } from '../lib/stats';
import { primaryValueOf } from '../lib/metric';
import { ExerciseSlug, Gender, WorkoutSet } from '../types';

export type UnlockedBadge =
  | { kind: 'exercise'; slug: string; exerciseSlug: ExerciseSlug; threshold: number }
  | { kind: 'streak'; slug: string; thresholdDays: number };

interface AddSetResult {
  isPr: boolean;
  newBadges: UnlockedBadge[];
}

interface WorkoutState {
  sets: WorkoutSet[];
  unlockedAchievementSlugs: string[];
  unlockedAt: Record<string, string>;
  // Ids of sets the cloud hasn't confirmed yet (offline, guest, or a failed
  // request). They stay local and are retried, never silently dropped.
  pendingSyncIds: string[];
  // Sets deleted locally whose cloud row still has to go.
  pendingDeleteIds: string[];
  flushPendingSets: () => Promise<void>;
  personalBestFor: (exerciseSlug: ExerciseSlug) => number;
  setsFor: (exerciseSlug: ExerciseSlug) => WorkoutSet[];
  addSet: (
    exerciseSlug: ExerciseSlug,
    weightKg: number,
    reps: number,
    gender: Gender | null
  ) => AddSetResult;
  updateSet: (id: string, weightKg: number, reps: number) => void;
  deleteSet: (id: string) => void;
}

// Sets carry their own uuid, so retrying after a lost response can't create
// a duplicate row.
async function pushSetToCloud(set: WorkoutSet): Promise<boolean> {
  const userId = getCurrentUserId();
  if (!userId) return false;
  const row = {
    user_id: userId,
    exercise_slug: set.exerciseSlug,
    weight_kg: set.weightKg,
    reps: set.reps,
    is_pr: set.isPr,
    performed_at: set.performedAt,
  };
  const { error } = isUuid(set.id)
    ? await supabase.from('workout_sets').upsert({ id: set.id, ...row }, { onConflict: 'id' })
    : await supabase.from('workout_sets').insert(row);
  if (error) {
    console.warn('Supabase set sync failed', error);
    return false;
  }
  return true;
}

async function deleteSetFromCloud(id: string): Promise<boolean> {
  const { error } = await supabase.from('workout_sets').delete().eq('id', id);
  if (error) {
    console.warn('Supabase set delete failed', error);
    return false;
  }
  return true;
}

function markDeleted(ids: string[]) {
  if (ids.length === 0) return;
  useWorkoutStore.setState((state) => ({
    pendingDeleteIds: state.pendingDeleteIds.filter((id) => !ids.includes(id)),
  }));
}

// A set is a PR when it beat everything logged before it, so after an edit
// or delete the flags for that exercise are worked out again in order.
function withRecomputedPrFlags(sets: WorkoutSet[], exerciseSlug: ExerciseSlug): WorkoutSet[] {
  const metric = getExercise(exerciseSlug).metric;
  const ordered = sets
    .filter((s) => s.exerciseSlug === exerciseSlug)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  let best = 0;
  const flags = new Map<string, boolean>();
  for (const s of ordered) {
    const value = primaryValueOf(s, metric);
    flags.set(s.id, value > best);
    best = Math.max(best, value);
  }
  return sets.map((s) => (flags.has(s.id) && flags.get(s.id) !== s.isPr ? { ...s, isPr: flags.get(s.id)! } : s));
}

function markSynced(ids: string[]) {
  if (ids.length === 0) return;
  useWorkoutStore.setState((state) => ({
    pendingSyncIds: state.pendingSyncIds.filter((id) => !ids.includes(id)),
  }));
}

function syncBadgesToCloud(slugs: string[], unlockedAt: string) {
  const userId = getCurrentUserId();
  if (!userId || slugs.length === 0) return;
  supabase
    .from('unlocked_achievements')
    .upsert(
      slugs.map((achievement_slug) => ({ user_id: userId, achievement_slug, unlocked_at: unlockedAt })),
      { onConflict: 'user_id,achievement_slug' }
    )
    .then(({ error }) => error && console.warn('Supabase badge upsert failed', error));
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      sets: [],
      unlockedAchievementSlugs: [],
      unlockedAt: {},
      pendingSyncIds: [],
      pendingDeleteIds: [],

      flushPendingSets: async () => {
        if (!getCurrentUserId()) return;
        const { sets, pendingSyncIds, pendingDeleteIds } = get();
        const pending = sets.filter((s) => pendingSyncIds.includes(s.id));
        const [pushed, deleted] = await Promise.all([
          Promise.all(pending.map(async (s) => ((await pushSetToCloud(s)) ? s.id : null))),
          Promise.all(pendingDeleteIds.map(async (id) => ((await deleteSetFromCloud(id)) ? id : null))),
        ]);
        markSynced(pushed.filter((id): id is string => id !== null));
        markDeleted(deleted.filter((id): id is string => id !== null));
      },

      personalBestFor: (exerciseSlug) => {
        const metric = getExercise(exerciseSlug).metric;
        return get()
          .sets.filter((s) => s.exerciseSlug === exerciseSlug)
          .reduce((max, s) => Math.max(max, primaryValueOf(s, metric)), 0);
      },

      setsFor: (exerciseSlug) =>
        get()
          .sets.filter((s) => s.exerciseSlug === exerciseSlug)
          .sort((a, b) => b.performedAt.localeCompare(a.performedAt)),

      addSet: (exerciseSlug, weightKg, reps, gender) => {
        const metric = getExercise(exerciseSlug).metric;
        const previousBest = get().personalBestFor(exerciseSlug);
        const newValue = primaryValueOf({ weightKg, reps }, metric);
        const isPr = newValue > previousBest;

        const newSet: WorkoutSet = {
          id: generateUuid(),
          exerciseSlug,
          weightKg,
          reps,
          isPr,
          performedAt: new Date().toISOString(),
        };

        const updatedSets = [...get().sets, newSet];
        const alreadyUnlocked = get().unlockedAchievementSlugs;

        const newExerciseBadges = gender
          ? getNewlyUnlockedAchievements(exerciseSlug, gender, previousBest, newValue).filter(
              (a) => !alreadyUnlocked.includes(a.slug)
            )
          : [];

        const newStreakDays = currentStreakDays(updatedSets);
        const newStreakBadges = STREAK_ACHIEVEMENTS.filter(
          (a) => a.thresholdDays <= newStreakDays && !alreadyUnlocked.includes(a.slug)
        );

        const newBadges: UnlockedBadge[] = [
          ...newExerciseBadges.map<UnlockedBadge>((a) => ({
            kind: 'exercise',
            slug: a.slug,
            exerciseSlug: a.exerciseSlug,
            threshold: a.threshold,
          })),
          ...newStreakBadges.map<UnlockedBadge>((a) => ({
            kind: 'streak',
            slug: a.slug,
            thresholdDays: a.thresholdDays,
          })),
        ];

        const unlockedAt = new Date().toISOString();
        const newSlugs = newBadges.map((b) => b.slug);
        set((state) => ({
          sets: updatedSets,
          pendingSyncIds: [...state.pendingSyncIds, newSet.id],
          unlockedAchievementSlugs: [...alreadyUnlocked, ...newSlugs],
          unlockedAt: {
            ...state.unlockedAt,
            ...Object.fromEntries(newSlugs.map((slug) => [slug, unlockedAt])),
          },
        }));

        pushSetToCloud(newSet).then((ok) => ok && markSynced([newSet.id]));
        syncBadgesToCloud(newSlugs, unlockedAt);

        return { isPr, newBadges };
      },

      updateSet: (id, weightKg, reps) => {
        const target = get().sets.find((s) => s.id === id);
        if (!target) return;
        const before = get().sets;
        const edited = before.map((s) => (s.id === id ? { ...s, weightKg, reps } : s));
        const after = withRecomputedPrFlags(edited, target.exerciseSlug);
        // Only sets with a cloud-compatible id can be updated there; the
        // changed ones (the edited set plus any whose PR flag moved) go up.
        const changed = after.filter((s, i) => s !== before[i] && isUuid(s.id));
        set((state) => ({
          sets: after,
          pendingSyncIds: [...new Set([...state.pendingSyncIds, ...changed.map((s) => s.id)])],
        }));
        changed.forEach((s) => pushSetToCloud(s).then((ok) => ok && markSynced([s.id])));
      },

      deleteSet: (id) => {
        const target = get().sets.find((s) => s.id === id);
        if (!target) return;
        const remaining = get().sets.filter((s) => s.id !== id);
        const after = withRecomputedPrFlags(remaining, target.exerciseSlug);
        const changed = after.filter((s, i) => s !== remaining[i] && isUuid(s.id));
        const signedIn = !!getCurrentUserId();
        const cloudDelete = signedIn && isUuid(id);
        set((state) => ({
          sets: after,
          pendingSyncIds: [
            ...new Set([...state.pendingSyncIds.filter((p) => p !== id), ...changed.map((s) => s.id)]),
          ],
          pendingDeleteIds: cloudDelete ? [...state.pendingDeleteIds, id] : state.pendingDeleteIds,
        }));
        if (cloudDelete) deleteSetFromCloud(id).then((ok) => ok && markDeleted([id]));
        changed.forEach((s) => pushSetToCloud(s).then((ok) => ok && markSynced([s.id])));
      },
    }),
    {
      name: 'fitpr-workouts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
