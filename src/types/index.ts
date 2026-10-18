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
  | 'chin_up'
  | 'pullover'
  | 'cable_pullover'
  | 'chest_supported_row'
  | 'close_neutral_grip_pulldown'
  | 'reverse_grip_pulldown'
  | 'wide_neutral_grip_pulldown'
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
  | 'kettlebell_swing'
  // wrist
  | 'wrist_curl'
  | 'reverse_wrist_curl'
  | 'wrist_roller'
  // added later
  | 'goblet_squat'
  | 'smith_machine_squat'
  | 'seated_calf_raise'
  | 'cable_glute_kickback'
  | 'hip_abduction_machine'
  | 'hip_adduction_machine'
  | 'single_leg_glute_bridge'
  | 'glute_bridge'
  | 'walking_lunge'
  | 'reverse_lunge'
  | 'step_up'
  | 'sumo_deadlift'
  | 'good_morning'
  | 'seated_leg_curl'
  | 'bodyweight_squat'
  | 'wall_sit'
  | 'incline_dumbbell_press'
  | 'pec_deck'
  | 'incline_push_up'
  | 'decline_push_up'
  | 'diamond_push_up'
  | 'rack_pull'
  | 'back_extension'
  | 'straight_arm_pulldown'
  | 'dumbbell_shrug'
  | 'single_arm_cable_row'
  | 'pendlay_row'
  | 'machine_shoulder_press'
  | 'upright_row'
  | 'cable_lateral_raise'
  | 'pike_push_up'
  | 'preacher_curl'
  | 'incline_dumbbell_curl'
  | 'concentration_curl'
  | 'cable_curl'
  | 'close_grip_bench_press'
  | 'triceps_kickback'
  | 'bench_dip'
  | 'dead_bug'
  | 'hollow_hold'
  | 'side_plank'
  | 'superman_hold'
  | 'bicycle_crunch'
  | 'reverse_crunch'
  | 'lying_leg_raise'
  | 'v_up'
  | 'bird_dog'
  | 'pallof_press'
  | 'arm_circles'
  | 'leg_swings'
  | 'squat_jump'
  | 'jump_rope'
  | 'high_knees'
  | 'butt_kicks'
  | 'box_jump'
  | 'battle_ropes'
  | 'rowing_machine'
  | 'cable_step_up'
  | 'donkey_kickback'
  | 'glute_kickback_machine'
  | 'glute_kickback';

export type CategoryKey =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'wrist';

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
  avatarUrl: string | null;
  shareFoodLog: boolean;
}

export interface StudentProfileInfo {
  displayName: string;
  gender: Gender | null;
  heightCm: number | null;
  weightKg: number | null;
  avatarUrl: string | null;
  shareFoodLog: boolean;
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
  photoPath: string | null; // storage path in the private "food-photos" bucket
  ptStatus: FoodReviewStatus | null; // coach's verdict on this entry
  ptComment: string | null;
}

export type FoodReviewStatus = 'approved' | 'revise';

// What the UI supplies when logging food — the review fields are written
// only by the coach, never by the student.
export type NewFoodLogEntry = Omit<FoodLogEntry, 'id' | 'loggedAt' | 'ptStatus' | 'ptComment'>;

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';

export interface PtSubscription {
  status: SubscriptionStatus;
  trialStartedAt: string;
  studentLimit: number;
  currentPeriodEnd: string | null;
}

export interface CheckinSubmission {
  id: string;
  studentId: string;
  photoPath: string; // storage path in the private "checkin-photos" bucket
  weightKg: number | null;
  submittedAt: string;
  ptComment: string | null;
  ptCommentedAt: string | null;
}
