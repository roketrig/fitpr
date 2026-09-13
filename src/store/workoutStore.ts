import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getExercise } from '../constants/exercises';
import { getNewlyUnlockedAchievements, STREAK_ACHIEVEMENTS } from '../constants/achievements';
import { getCurrentUserId } from './authStore';
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
  personalBestFor: (exerciseSlug: ExerciseSlug) => number;
  setsFor: (exerciseSlug: ExerciseSlug) => WorkoutSet[];
  addSet: (
    exerciseSlug: ExerciseSlug,
    weightKg: number,
    reps: number,
    gender: Gender | null
  ) => AddSetResult;
}

function syncSetToCloud(set: WorkoutSet) {
  const userId = getCurrentUserId();
  if (!userId) return;
  supabase
    .from('workout_sets')
    .insert({
      user_id: userId,
      exercise_slug: set.exerciseSlug,
      weight_kg: set.weightKg,
      reps: set.reps,
      is_pr: set.isPr,
      performed_at: set.performedAt,
    })
    .then(({ error }) => error && console.warn('Supabase set insert failed', error));
}

function syncBadgesToCloud(slugs: string[]) {
  const userId = getCurrentUserId();
  if (!userId || slugs.length === 0) return;
  supabase
    .from('unlocked_achievements')
    .upsert(
      slugs.map((achievement_slug) => ({ user_id: userId, achievement_slug })),
      { onConflict: 'user_id,achievement_slug' }
    )
    .then(({ error }) => error && console.warn('Supabase badge upsert failed', error));
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      sets: [],
      unlockedAchievementSlugs: [],

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
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

        set({
          sets: updatedSets,
          unlockedAchievementSlugs: [...alreadyUnlocked, ...newBadges.map((b) => b.slug)],
        });

        syncSetToCloud(newSet);
        syncBadgesToCloud(newBadges.map((b) => b.slug));

        return { isPr, newBadges };
      },
    }),
    {
      name: 'fitpr-workouts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
