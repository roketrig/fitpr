import { Achievement, ExerciseSlug, Gender } from '../types';

// Placeholder strength/rep/hold tiers per exercise & gender.
// Unit matches the exercise's metric (kg, reps, or seconds) — tune freely.
const THRESHOLDS: Record<ExerciseSlug, Record<Gender, number[]>> = {
  // chest
  bench_press: { male: [60, 80, 100, 120, 140], female: [30, 40, 50, 60, 80] },
  incline_bench_press: { male: [50, 70, 90, 110, 130], female: [25, 35, 45, 55, 70] },
  decline_bench_press: { male: [55, 75, 95, 115, 135], female: [28, 38, 48, 58, 73] },
  dumbbell_bench_press: { male: [25, 32, 40, 48, 56], female: [12, 16, 20, 25, 30] },
  dumbbell_fly: { male: [10, 14, 18, 24, 30], female: [5, 7, 10, 13, 17] },
  chest_press_machine: { male: [50, 70, 90, 110, 130], female: [25, 35, 45, 55, 70] },
  cable_fly: { male: [15, 25, 35, 45, 55], female: [8, 12, 18, 25, 32] },
  push_up: { male: [10, 20, 35, 50, 75], female: [5, 10, 20, 30, 45] },
  // back
  deadlift: { male: [100, 120, 140, 160, 180], female: [50, 70, 90, 110, 130] },
  barbell_row: { male: [50, 70, 90, 110, 130], female: [25, 35, 45, 55, 70] },
  lat_pulldown: { male: [40, 55, 70, 85, 100], female: [20, 30, 40, 50, 60] },
  seated_cable_row: { male: [40, 55, 70, 85, 100], female: [20, 30, 40, 50, 60] },
  dumbbell_row: { male: [20, 28, 36, 44, 52], female: [10, 14, 18, 24, 30] },
  t_bar_row: { male: [40, 60, 80, 100, 120], female: [20, 30, 40, 50, 65] },
  inverted_row: { male: [5, 10, 15, 20, 30], female: [3, 8, 12, 16, 22] },
  pull_up: { male: [1, 5, 10, 15, 20], female: [1, 3, 5, 8, 12] },
  // legs
  squat: { male: [80, 100, 120, 140, 160], female: [40, 60, 80, 100, 120] },
  front_squat: { male: [60, 80, 100, 120, 140], female: [30, 45, 60, 75, 95] },
  leg_press: { male: [100, 140, 180, 220, 280], female: [60, 90, 120, 150, 190] },
  romanian_deadlift: { male: [80, 100, 120, 140, 160], female: [40, 55, 70, 85, 105] },
  leg_extension: { male: [30, 45, 60, 75, 90], female: [15, 25, 35, 45, 55] },
  leg_curl: { male: [25, 40, 55, 70, 85], female: [12, 20, 28, 36, 45] },
  bulgarian_split_squat: { male: [15, 22, 30, 38, 46], female: [8, 12, 16, 20, 26] },
  lunge: { male: [15, 20, 26, 32, 40], female: [7, 10, 14, 18, 24] },
  hack_squat: { male: [80, 110, 140, 180, 220], female: [45, 65, 90, 115, 145] },
  hip_thrust: { male: [80, 100, 140, 180, 220], female: [50, 70, 100, 130, 160] },
  calf_raise: { male: [60, 90, 120, 150, 190], female: [30, 50, 70, 90, 115] },
  // shoulders
  overhead_press: { male: [40, 50, 60, 70, 80], female: [20, 25, 30, 35, 40] },
  dumbbell_shoulder_press: { male: [15, 20, 26, 32, 38], female: [7, 10, 14, 18, 22] },
  arnold_press: { male: [12, 16, 20, 26, 32], female: [6, 8, 11, 14, 18] },
  lateral_raise: { male: [8, 12, 16, 20, 26], female: [4, 6, 8, 10, 14] },
  front_raise: { male: [8, 12, 16, 20, 26], female: [4, 6, 8, 10, 14] },
  face_pull: { male: [15, 20, 27, 34, 42], female: [7, 10, 14, 18, 23] },
  rear_delt_fly: { male: [15, 20, 27, 34, 42], female: [7, 10, 14, 18, 23] },
  // arms
  barbell_curl: { male: [20, 30, 40, 50, 60], female: [10, 15, 20, 25, 30] },
  dumbbell_curl: { male: [10, 14, 18, 22, 28], female: [5, 7, 9, 12, 15] },
  hammer_curl: { male: [10, 14, 18, 22, 28], female: [5, 7, 9, 12, 15] },
  triceps_pushdown: { male: [20, 30, 40, 50, 60], female: [10, 15, 20, 25, 32] },
  skull_crusher: { male: [20, 30, 40, 50, 60], female: [10, 15, 20, 25, 32] },
  overhead_triceps_extension: { male: [10, 14, 18, 24, 30], female: [5, 7, 10, 13, 17] },
  dip: { male: [5, 10, 20, 30, 40], female: [1, 5, 10, 15, 20] },
  // core
  crunch: { male: [15, 25, 40, 60, 90], female: [10, 20, 30, 45, 70] },
  plank: { male: [30, 60, 90, 120, 180], female: [20, 45, 75, 105, 150] },
  hanging_leg_raise: { male: [5, 10, 15, 20, 30], female: [3, 8, 12, 18, 25] },
  russian_twist: { male: [20, 30, 45, 60, 90], female: [15, 25, 35, 50, 75] },
  ab_wheel_rollout: { male: [3, 6, 10, 15, 25], female: [1, 3, 6, 10, 16] },
  cable_crunch: { male: [20, 30, 40, 50, 60], female: [10, 15, 20, 25, 32] },
  // cardio
  burpee: { male: [5, 10, 20, 30, 50], female: [3, 8, 15, 22, 35] },
  mountain_climber: { male: [20, 40, 60, 90, 140], female: [15, 30, 45, 65, 100] },
  jumping_jack: { male: [20, 40, 60, 100, 150], female: [15, 30, 50, 80, 120] },
  kettlebell_swing: { male: [16, 20, 24, 32, 40], female: [8, 12, 16, 20, 24] },
};

export const ACHIEVEMENTS: Achievement[] = Object.entries(THRESHOLDS).flatMap(
  ([exerciseSlug, byGender]) =>
    Object.entries(byGender).flatMap(([gender, thresholds]) =>
      thresholds.map((threshold) => ({
        slug: `${exerciseSlug}_${threshold}_${gender}`,
        exerciseSlug: exerciseSlug as ExerciseSlug,
        gender: gender as Gender,
        threshold,
      }))
    )
);

export function getAchievementsFor(gender: Gender): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.gender === gender).sort((a, b) => a.threshold - b.threshold);
}

export function getNextAchievementFor(
  exerciseSlug: ExerciseSlug,
  gender: Gender,
  currentBest: number
): Achievement | null {
  const next = ACHIEVEMENTS.filter(
    (a) => a.exerciseSlug === exerciseSlug && a.gender === gender && a.threshold > currentBest
  ).sort((a, b) => a.threshold - b.threshold)[0];
  return next ?? null;
}

export interface StreakAchievement {
  slug: string;
  thresholdDays: number;
}

export const STREAK_ACHIEVEMENTS: StreakAchievement[] = [
  { slug: 'streak_3d', thresholdDays: 3 },
  { slug: 'streak_10d', thresholdDays: 10 },
  { slug: 'streak_30d', thresholdDays: 30 },
];

export function getNextStreakAchievement(currentStreakDays: number): StreakAchievement | null {
  return (
    STREAK_ACHIEVEMENTS.filter((a) => a.thresholdDays > currentStreakDays).sort(
      (a, b) => a.thresholdDays - b.thresholdDays
    )[0] ?? null
  );
}

export function getNewlyUnlockedAchievements(
  exerciseSlug: ExerciseSlug,
  gender: Gender,
  previousBest: number,
  newValue: number
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) =>
      a.exerciseSlug === exerciseSlug &&
      a.gender === gender &&
      a.threshold > previousBest &&
      a.threshold <= newValue
  );
}
