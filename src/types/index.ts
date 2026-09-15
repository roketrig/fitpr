export type Gender = 'male' | 'female';

export type ExerciseSlug =
  // chest
  | 'bench_press'
  | 'incline_bench_press'
  | 'decline_bench_press'
  | 'dumbbell_bench_press'
  | 'dumbbell_fly'
  | 'chest_press_machine'
  | 'cable_fly'
  | 'push_up'
  // back
  | 'deadlift'
  | 'barbell_row'
  | 'lat_pulldown'
  | 'seated_cable_row'
  | 'dumbbell_row'
  | 't_bar_row'
  | 'inverted_row'
  | 'pull_up'
  // legs
  | 'squat'
  | 'front_squat'
  | 'leg_press'
  | 'romanian_deadlift'
  | 'leg_extension'
  | 'leg_curl'
  | 'bulgarian_split_squat'
  | 'lunge'
  | 'hack_squat'
  | 'hip_thrust'
  | 'calf_raise'
  // shoulders
  | 'overhead_press'
  | 'dumbbell_shoulder_press'
  | 'arnold_press'
  | 'lateral_raise'
  | 'front_raise'
  | 'face_pull'
  | 'rear_delt_fly'
  // arms
  | 'barbell_curl'
  | 'dumbbell_curl'
  | 'hammer_curl'
  | 'triceps_pushdown'
  | 'skull_crusher'
  | 'overhead_triceps_extension'
  | 'dip'
  // core
  | 'crunch'
  | 'plank'
  | 'hanging_leg_raise'
  | 'russian_twist'
  | 'ab_wheel_rollout'
  | 'cable_crunch'
  // cardio
  | 'burpee'
  | 'mountain_climber'
  | 'jumping_jack'
  | 'kettlebell_swing';

export type CategoryKey = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';

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

export type Role = 'student' | 'pt';

export interface Profile {
  displayName: string;
  gender: Gender | null;
  heightCm: number | null;
  weightKg: number | null;
  memberSinceYear: number;
  role: Role;
  referralCode: string | null;
}

// 0 = Sunday ... 6 = Saturday, matching JS Date#getDay().
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ProgramExercise {
  exerciseSlug: ExerciseSlug;
  targetSets: number;
  targetReps: number;
}

export type WeeklyProgram = Record<DayOfWeek, ProgramExercise[]>;

export interface CoachLink {
  ptId: string;
  displayName: string;
}

export interface StudentSummary {
  studentId: string;
  displayName: string;
  linkedAt: string;
}

export interface NutritionTarget {
  calories: number | null;
  proteinG: number | null;
}

export interface FoodLogEntry {
  id: string;
  foodSlug: string | null; // null for a manually typed custom entry
  label: string;
  quantity: number;
  calories: number;
  proteinG: number;
  loggedAt: string;
}
