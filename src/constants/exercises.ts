import { Exercise, ExerciseSlug } from '../types';

// Placeholder target — used only when an exercise is logged outside of a program day.
export const SETS_PER_SESSION = 4;

export const EXERCISES: Exercise[] = [
  // chest
  { slug: 'bench_press', category: 'chest', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'incline_bench_press', category: 'chest', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'decline_bench_press', category: 'chest', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'dumbbell_bench_press', category: 'chest', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'dumbbell_fly', category: 'chest', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'chest_press_machine', category: 'chest', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'cable_fly', category: 'chest', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'push_up', category: 'chest', equipment: 'bodyweight', metric: 'reps_only' },
  // back
  { slug: 'deadlift', category: 'back', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'barbell_row', category: 'back', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'lat_pulldown', category: 'back', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'seated_cable_row', category: 'back', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'dumbbell_row', category: 'back', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 't_bar_row', category: 'back', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'inverted_row', category: 'back', equipment: 'bodyweight', metric: 'reps_only' },
  { slug: 'pull_up', category: 'back', equipment: 'bodyweight', metric: 'reps_only' },
  // legs
  { slug: 'squat', category: 'legs', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'front_squat', category: 'legs', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'leg_press', category: 'legs', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'romanian_deadlift', category: 'legs', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'leg_extension', category: 'legs', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'leg_curl', category: 'legs', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'bulgarian_split_squat', category: 'legs', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'lunge', category: 'legs', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'hack_squat', category: 'legs', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'hip_thrust', category: 'legs', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'calf_raise', category: 'legs', equipment: 'machine', metric: 'weight_reps' },
  // shoulders
  { slug: 'overhead_press', category: 'shoulders', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'dumbbell_shoulder_press', category: 'shoulders', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'arnold_press', category: 'shoulders', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'lateral_raise', category: 'shoulders', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'front_raise', category: 'shoulders', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'face_pull', category: 'shoulders', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'rear_delt_fly', category: 'shoulders', equipment: 'machine', metric: 'weight_reps' },
  // arms
  { slug: 'barbell_curl', category: 'arms', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'dumbbell_curl', category: 'arms', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'hammer_curl', category: 'arms', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'triceps_pushdown', category: 'arms', equipment: 'machine', metric: 'weight_reps' },
  { slug: 'skull_crusher', category: 'arms', equipment: 'barbell', metric: 'weight_reps' },
  { slug: 'overhead_triceps_extension', category: 'arms', equipment: 'dumbbell', metric: 'weight_reps' },
  { slug: 'dip', category: 'arms', equipment: 'bodyweight', metric: 'reps_only' },
  // core
  { slug: 'crunch', category: 'core', equipment: 'bodyweight', metric: 'reps_only' },
  { slug: 'plank', category: 'core', equipment: 'bodyweight', metric: 'time_seconds' },
  { slug: 'hanging_leg_raise', category: 'core', equipment: 'bodyweight', metric: 'reps_only' },
  { slug: 'russian_twist', category: 'core', equipment: 'bodyweight', metric: 'reps_only' },
  { slug: 'ab_wheel_rollout', category: 'core', equipment: 'bodyweight', metric: 'reps_only' },
  { slug: 'cable_crunch', category: 'core', equipment: 'machine', metric: 'weight_reps' },
  // cardio
  { slug: 'burpee', category: 'cardio', equipment: 'bodyweight', metric: 'reps_only' },
  { slug: 'mountain_climber', category: 'cardio', equipment: 'bodyweight', metric: 'reps_only' },
  { slug: 'jumping_jack', category: 'cardio', equipment: 'bodyweight', metric: 'reps_only' },
  { slug: 'kettlebell_swing', category: 'cardio', equipment: 'dumbbell', metric: 'weight_reps' },
];

export const EXERCISES_BY_SLUG: Record<ExerciseSlug, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.slug, e])
) as Record<ExerciseSlug, Exercise>;

export function getExercise(slug: ExerciseSlug): Exercise {
  return EXERCISES_BY_SLUG[slug];
}

export const CATEGORY_ORDER = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'cardio',
] as const;
