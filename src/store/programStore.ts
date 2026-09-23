import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentUserId } from '../lib/session';
import { supabase } from '../lib/supabase';
import { DayOfWeek, ExerciseSlug, ProgramExercise, WeeklyProgram } from '../types';

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 12;

export function emptyWeek(): WeeklyProgram {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

// Seeded from the user's real routine as a working example — Wednesday shoulder day.
const SEEDED_WEEK: WeeklyProgram = {
  ...emptyWeek(),
  3: [
    { exerciseSlug: 'dumbbell_shoulder_press', targetSets: 3, targetReps: 12 },
    { exerciseSlug: 'lateral_raise', targetSets: 3, targetReps: 12 },
    { exerciseSlug: 'face_pull', targetSets: 3, targetReps: 12 },
    { exerciseSlug: 'hanging_leg_raise', targetSets: 3, targetReps: 12 },
    { exerciseSlug: 'cable_crunch', targetSets: 3, targetReps: 12 },
  ],
};

function upsertRemote(day: DayOfWeek, entry: ProgramExercise, position: number) {
  const userId = getCurrentUserId();
  if (!userId) return;
  supabase
    .from('program_exercises')
    .upsert(
      {
        user_id: userId,
        day_of_week: day,
        exercise_slug: entry.exerciseSlug,
        target_sets: entry.targetSets,
        target_reps: entry.targetReps,
        position,
      },
      { onConflict: 'user_id,day_of_week,exercise_slug' }
    )
    .then(({ error }) => error && console.warn('Supabase program upsert failed', error));
}

function deleteRemote(day: DayOfWeek, exerciseSlug: ExerciseSlug) {
  const userId = getCurrentUserId();
  if (!userId) return;
  supabase
    .from('program_exercises')
    .delete()
    .match({ user_id: userId, day_of_week: day, exercise_slug: exerciseSlug })
    .then(({ error }) => error && console.warn('Supabase program delete failed', error));
}

interface ProgramState {
  week: WeeklyProgram;
  getDay: (day: DayOfWeek) => ProgramExercise[];
  addExerciseToDay: (day: DayOfWeek, exerciseSlug: ExerciseSlug) => void;
  removeExerciseFromDay: (day: DayOfWeek, exerciseSlug: ExerciseSlug) => void;
  updateExerciseTarget: (
    day: DayOfWeek,
    exerciseSlug: ExerciseSlug,
    patch: Partial<Pick<ProgramExercise, 'targetSets' | 'targetReps'>>
  ) => void;
  refreshFromRemote: (userId: string) => Promise<void>;
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set, get) => ({
      week: SEEDED_WEEK,

      getDay: (day) => get().week[day] ?? [],

      addExerciseToDay: (day, exerciseSlug) => {
        const current = get().week[day] ?? [];
        if (current.some((e) => e.exerciseSlug === exerciseSlug)) return;
        const entry: ProgramExercise = {
          exerciseSlug,
          targetSets: DEFAULT_TARGET_SETS,
          targetReps: DEFAULT_TARGET_REPS,
        };
        set((state) => ({
          week: { ...state.week, [day]: [...(state.week[day] ?? []), entry] },
        }));
        upsertRemote(day, entry, current.length);
      },

      removeExerciseFromDay: (day, exerciseSlug) => {
        set((state) => ({
          week: {
            ...state.week,
            [day]: (state.week[day] ?? []).filter((e) => e.exerciseSlug !== exerciseSlug),
          },
        }));
        deleteRemote(day, exerciseSlug);
      },

      updateExerciseTarget: (day, exerciseSlug, patch) => {
        let updated: ProgramExercise | undefined;
        let position = 0;
        set((state) => {
          const list = (state.week[day] ?? []).map((e, i) => {
            if (e.exerciseSlug === exerciseSlug) {
              updated = { ...e, ...patch };
              position = i;
              return updated;
            }
            return e;
          });
          return { week: { ...state.week, [day]: list } };
        });
        if (updated) upsertRemote(day, updated, position);
      },

      // A PT can change a student's program at any time from the web
      // dashboard, without the student signing out and back in — so unlike
      // the rest of this store (which is a local-first, write-through
      // cache), the program also needs to be pulled fresh whenever the
      // student opens the screens that show it.
      refreshFromRemote: async (userId) => {
        const { data, error } = await supabase
          .from('program_exercises')
          .select('day_of_week, exercise_slug, target_sets, target_reps')
          .eq('user_id', userId)
          .order('position');
        if (error) {
          console.warn('Supabase program refresh failed', error);
          return;
        }
        const week = emptyWeek();
        for (const row of data ?? []) {
          week[row.day_of_week as DayOfWeek].push({
            exerciseSlug: row.exercise_slug as ExerciseSlug,
            targetSets: row.target_sets,
            targetReps: row.target_reps,
          });
        }
        set({ week });
      },
    }),
    {
      name: 'fitpr-program',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
