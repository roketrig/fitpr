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
  chin_up: { male: [1, 5, 10, 15, 20], female: [1, 3, 5, 8, 12] },
  pullover: { male: [15, 22, 30, 38, 46], female: [8, 12, 16, 20, 26] },
  cable_pullover: { male: [25, 35, 45, 55, 70], female: [12, 18, 25, 32, 40] },
  chest_supported_row: { male: [20, 28, 36, 44, 52], female: [10, 14, 18, 24, 30] },
  close_neutral_grip_pulldown: { male: [40, 55, 70, 85, 100], female: [20, 30, 40, 50, 60] },
  reverse_grip_pulldown: { male: [40, 55, 70, 85, 100], female: [20, 30, 40, 50, 60] },
  wide_neutral_grip_pulldown: { male: [40, 55, 70, 85, 100], female: [20, 30, 40, 50, 60] },
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
  // wrist
  wrist_curl: { male: [10, 20, 30, 40, 50], female: [5, 10, 15, 20, 30] },
  reverse_wrist_curl: { male: [5, 10, 20, 30, 40], female: [3, 6, 10, 15, 20] },
  wrist_roller: { male: [3, 6, 10, 15, 25], female: [2, 4, 7, 10, 16] },
  // added later
  goblet_squat: { male: [16, 24, 32, 40, 50], female: [8, 12, 16, 20, 26] },
  smith_machine_squat: { male: [60, 80, 100, 120, 150], female: [30, 45, 60, 75, 95] },
  seated_calf_raise: { male: [30, 45, 60, 80, 100], female: [15, 25, 35, 45, 60] },
  cable_glute_kickback: { male: [10, 20, 30, 40, 50], female: [5, 10, 15, 25, 35] },
  hip_abduction_machine: { male: [30, 50, 70, 90, 110], female: [20, 35, 50, 65, 80] },
  hip_adduction_machine: { male: [30, 50, 70, 90, 110], female: [20, 35, 50, 65, 80] },
  single_leg_glute_bridge: { male: [10, 20, 35, 50, 75], female: [10, 20, 30, 45, 65] },
  glute_bridge: { male: [15, 30, 50, 75, 100], female: [15, 30, 50, 75, 100] },
  walking_lunge: { male: [10, 16, 24, 32, 40], female: [5, 8, 12, 16, 22] },
  reverse_lunge: { male: [10, 20, 30, 50, 80], female: [10, 20, 30, 45, 70] },
  step_up: { male: [10, 16, 24, 32, 40], female: [5, 8, 12, 16, 22] },
  sumo_deadlift: { male: [100, 120, 140, 170, 200], female: [50, 70, 90, 110, 135] },
  good_morning: { male: [30, 50, 70, 90, 110], female: [15, 25, 35, 45, 60] },
  seated_leg_curl: { male: [25, 40, 55, 70, 85], female: [12, 20, 28, 36, 45] },
  bodyweight_squat: { male: [20, 40, 60, 100, 150], female: [20, 40, 60, 90, 130] },
  wall_sit: { male: [30, 60, 90, 120, 180], female: [20, 45, 75, 100, 150] },
  incline_dumbbell_press: { male: [20, 28, 36, 44, 52], female: [10, 14, 18, 22, 28] },
  pec_deck: { male: [30, 45, 60, 75, 90], female: [15, 25, 35, 45, 55] },
  incline_push_up: { male: [10, 20, 35, 50, 75], female: [10, 20, 30, 45, 65] },
  decline_push_up: { male: [5, 12, 20, 30, 45], female: [3, 8, 14, 22, 32] },
  diamond_push_up: { male: [5, 12, 20, 30, 45], female: [3, 8, 12, 18, 26] },
  rack_pull: { male: [100, 140, 180, 220, 260], female: [50, 70, 90, 110, 135] },
  back_extension: { male: [10, 20, 30, 40, 60], female: [10, 20, 30, 40, 60] },
  straight_arm_pulldown: { male: [20, 30, 40, 50, 65], female: [10, 15, 22, 30, 38] },
  dumbbell_shrug: { male: [24, 32, 40, 48, 60], female: [10, 14, 18, 22, 28] },
  single_arm_cable_row: { male: [15, 25, 35, 45, 55], female: [8, 12, 18, 24, 30] },
  pendlay_row: { male: [50, 70, 90, 110, 130], female: [25, 35, 45, 55, 70] },
  machine_shoulder_press: { male: [30, 45, 60, 75, 90], female: [15, 22, 30, 38, 48] },
  upright_row: { male: [20, 30, 40, 50, 60], female: [10, 15, 20, 25, 32] },
  cable_lateral_raise: { male: [5, 8, 11, 14, 18], female: [2, 4, 6, 8, 10] },
  pike_push_up: { male: [5, 10, 15, 25, 40], female: [3, 6, 10, 16, 25] },
  preacher_curl: { male: [20, 30, 40, 50, 60], female: [10, 15, 20, 25, 30] },
  incline_dumbbell_curl: { male: [8, 12, 16, 20, 24], female: [4, 6, 8, 10, 13] },
  concentration_curl: { male: [8, 12, 16, 20, 24], female: [4, 6, 8, 10, 13] },
  cable_curl: { male: [15, 25, 35, 45, 55], female: [8, 12, 18, 24, 30] },
  close_grip_bench_press: { male: [50, 70, 90, 110, 130], female: [25, 35, 45, 55, 70] },
  triceps_kickback: { male: [6, 10, 14, 18, 22], female: [3, 5, 7, 9, 12] },
  bench_dip: { male: [10, 20, 30, 45, 60], female: [10, 18, 26, 36, 50] },
  dead_bug: { male: [10, 20, 30, 50, 80], female: [10, 20, 30, 50, 80] },
  hollow_hold: { male: [15, 30, 45, 60, 90], female: [10, 20, 35, 50, 70] },
  side_plank: { male: [20, 40, 60, 90, 120], female: [15, 30, 50, 75, 100] },
  superman_hold: { male: [20, 40, 60, 90, 120], female: [20, 40, 60, 90, 120] },
  bicycle_crunch: { male: [20, 40, 60, 100, 150], female: [20, 40, 60, 90, 130] },
  reverse_crunch: { male: [10, 20, 30, 50, 80], female: [10, 20, 30, 45, 70] },
  lying_leg_raise: { male: [8, 15, 25, 40, 60], female: [8, 15, 25, 35, 50] },
  v_up: { male: [5, 10, 20, 30, 45], female: [3, 8, 14, 22, 32] },
  bird_dog: { male: [10, 20, 30, 50, 80], female: [10, 20, 30, 50, 80] },
  pallof_press: { male: [10, 20, 30, 40, 50], female: [5, 10, 15, 20, 28] },
  arm_circles: { male: [30, 60, 90, 120, 180], female: [30, 60, 90, 120, 180] },
  leg_swings: { male: [10, 20, 30, 50, 80], female: [10, 20, 30, 50, 80] },
  squat_jump: { male: [10, 20, 30, 50, 80], female: [8, 15, 25, 40, 60] },
  jump_rope: { male: [30, 60, 120, 300, 600], female: [30, 60, 120, 300, 600] },
  high_knees: { male: [20, 40, 60, 90, 120], female: [20, 40, 60, 90, 120] },
  butt_kicks: { male: [20, 40, 60, 90, 120], female: [20, 40, 60, 90, 120] },
  box_jump: { male: [5, 10, 15, 25, 40], female: [3, 6, 10, 16, 25] },
  battle_ropes: { male: [20, 40, 60, 90, 120], female: [20, 40, 60, 90, 120] },
  rowing_machine: { male: [60, 180, 300, 600, 1200], female: [60, 180, 300, 600, 1200] },
  cable_step_up: { male: [10, 20, 30, 40, 50], female: [5, 10, 15, 25, 35] },
  donkey_kickback: { male: [15, 30, 50, 75, 100], female: [15, 30, 50, 75, 100] },
  glute_kickback_machine: { male: [20, 35, 50, 70, 90], female: [10, 20, 30, 45, 60] },
  glute_kickback: { male: [15, 30, 50, 75, 100], female: [15, 30, 50, 75, 100] },
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
