export type Gender = 'male' | 'female';

export type ExerciseSlug =
  // chest
  | 'bench_press'
  | 'incline_bench_press'
  | 'dumbbell_bench_press'
  | 'chest_press_machine'
  | 'cable_fly'
  | 'push_up'
  // back
  | 'deadlift'
  | 'barbell_row'
  | 'lat_pulldown'
  | 'seated_cable_row'
  | 'dumbbell_row'
  | 'pull_up'
  // legs
  | 'squat'
  | 'front_squat'
  | 'leg_press'
  | 'romanian_deadlift'
  | 'leg_extension'
  | 'leg_curl'
  | 'bulgarian_split_squat'
  | 'hip_thrust'
  | 'calf_raise'
  // shoulders
  | 'overhead_press'
  | 'dumbbell_shoulder_press'
  | 'lateral_raise'
  | 'face_pull'
  | 'rear_delt_fly'
  // arms
  | 'barbell_curl'
  | 'dumbbell_curl'
  | 'hammer_curl'
  | 'triceps_pushdown'
  | 'dip'
  // core
  | 'plank'
  | 'hanging_leg_raise'
  | 'cable_crunch';

export type CategoryKey = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

export type EquipmentType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

// weight_reps: track weight (kg) + reps. reps_only: track reps only (bodyweight).
// time_seconds: track a held duration in seconds (stored in WorkoutSet.reps).
export type MetricType = 'weight_reps' | 'reps_only' | 'time_seconds';

export type Language = 'en' | 'tr';

export interface Exercise {
  slug: ExerciseSlug;
  category: CategoryKey;
  equipment: EquipmentType;
  metric: MetricType;
}

export interface WorkoutSet {
  id: string;
  exerciseSlug: ExerciseSlug;
  weightKg: number;
  reps: number;
  isPr: boolean;
  performedAt: string;
}

export interface Achievement {
  slug: string;
  exerciseSlug: ExerciseSlug;
  gender: Gender;
  threshold: number;
}

export interface Profile {
  displayName: string;
  gender: Gender | null;
  heightCm: number | null;
  weightKg: number | null;
  memberSinceYear: number;
}

// 0 = Sunday ... 6 = Saturday, matching JS Date#getDay().
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ProgramExercise {
  exerciseSlug: ExerciseSlug;
  targetSets: number;
  targetReps: number;
}

export type WeeklyProgram = Record<DayOfWeek, ProgramExercise[]>;
