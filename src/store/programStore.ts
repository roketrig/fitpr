import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DayOfWeek, ExerciseSlug, ProgramExercise, WeeklyProgram } from '../types';

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 12;

function emptyWeek(): WeeklyProgram {
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
  moveExercise: (day: DayOfWeek, exerciseSlug: ExerciseSlug, direction: -1 | 1) => void;
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set, get) => ({
      week: SEEDED_WEEK,

      getDay: (day) => get().week[day] ?? [],

      addExerciseToDay: (day, exerciseSlug) =>
        set((state) => {
          const current = state.week[day] ?? [];
          if (current.some((e) => e.exerciseSlug === exerciseSlug)) return state;
          return {
            week: {
              ...state.week,
              [day]: [
                ...current,
                { exerciseSlug, targetSets: DEFAULT_TARGET_SETS, targetReps: DEFAULT_TARGET_REPS },
              ],
            },
          };
        }),

      removeExerciseFromDay: (day, exerciseSlug) =>
        set((state) => ({
          week: {
            ...state.week,
            [day]: (state.week[day] ?? []).filter((e) => e.exerciseSlug !== exerciseSlug),
          },
        })),

      updateExerciseTarget: (day, exerciseSlug, patch) =>
        set((state) => ({
          week: {
            ...state.week,
            [day]: (state.week[day] ?? []).map((e) =>
              e.exerciseSlug === exerciseSlug ? { ...e, ...patch } : e
            ),
          },
        })),

      moveExercise: (day, exerciseSlug, direction) =>
        set((state) => {
          const list = [...(state.week[day] ?? [])];
          const index = list.findIndex((e) => e.exerciseSlug === exerciseSlug);
          const targetIndex = index + direction;
          if (index === -1 || targetIndex < 0 || targetIndex >= list.length) return state;
          [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
          return { week: { ...state.week, [day]: list } };
        }),
    }),
    {
      name: 'fitpr-program',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
