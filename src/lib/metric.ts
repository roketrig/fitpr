import { Exercise, ExerciseSlug, MetricType, WorkoutSet } from '../types';

// The number that PRs / achievements / progress are measured against:
// kg for weight_reps exercises, reps or held seconds otherwise.
export function primaryValueOf(set: Pick<WorkoutSet, 'weightKg' | 'reps'>, metric: MetricType): number {
  return metric === 'weight_reps' ? set.weightKg : set.reps;
}

export interface ValueStepConfig {
  step: number;
  min: number;
}

// Light isolation moves where 5 kg is already a big load: finer 2.5 kg steps
// and a 2.5 kg floor. Everything else starts at 5 kg.
const LIGHT_WEIGHT_SLUGS = new Set<ExerciseSlug>([
  'lateral_raise', 'front_raise', 'rear_delt_fly', 'face_pull', 'cable_lateral_raise', 'triceps_kickback',
  'concentration_curl', 'cable_glute_kickback', 'wrist_curl', 'reverse_wrist_curl', 'cable_fly',
  'triceps_pushdown', 'cable_curl', 'overhead_triceps_extension', 'dumbbell_fly', 'pallof_press',
]);

// Weight moves on a fixed grid so values never land on odd numbers like 7 or
// 11 kg: 2.5 kg steps for barbells and dumbbells (the usual plate/dumbbell
// increments), 5 kg for machines, 2.5 kg for the light isolation moves.
export function getValueStepConfig(exercise: Exercise): ValueStepConfig {
  if (exercise.metric === 'time_seconds') return { step: 5, min: 5 };
  if (exercise.metric === 'reps_only') return { step: 1, min: 1 };

  const light = LIGHT_WEIGHT_SLUGS.has(exercise.slug);
  if (light) return { step: 2.5, min: 2.5 };
  if (exercise.equipment === 'machine') return { step: 5, min: 5 };
  return { step: 2.5, min: 5 };
}

export function snapWeight(exercise: Exercise, value: number): number {
  const { step, min } = getValueStepConfig(exercise);
  return Math.max(min, Math.round(value / step) * step);
}

// `multiplier` lets holding the button speed up: it takes that many grid
// steps at once, so the value always stays on the grid.
export function nextWeight(exercise: Exercise, value: number, dir: 1 | -1, multiplier = 1): number {
  const { step, min } = getValueStepConfig(exercise);
  // An off-grid value (older logs, a changed step) first moves to the nearest
  // grid point in the pressed direction, then continues from there.
  const onGrid = Math.abs(value / step - Math.round(value / step)) < 1e-9;
  const base = onGrid ? value : dir > 0 ? Math.floor(value / step) * step : Math.ceil(value / step) * step;
  return Math.max(min, base + dir * step * multiplier);
}

export function defaultStartWeight(exercise: Exercise): number {
  const light = LIGHT_WEIGHT_SLUGS.has(exercise.slug);
  if (exercise.equipment === 'barbell') return 20;
  if (exercise.equipment === 'dumbbell') return light ? 5 : 10;
  return light ? 10 : 20;
}

// Held durations: 5 s steps under a minute, 10 s steps up to 3 minutes, 30 s
// beyond — always landing on round numbers.
function timeStepAt(value: number, dir: 1 | -1): number {
  if (dir > 0) return value < 60 ? 5 : value < 180 ? 10 : 30;
  return value <= 60 ? 5 : value <= 180 ? 10 : 30;
}

export function snapTimeSeconds(value: number): number {
  const step = value < 60 ? 5 : value < 180 ? 10 : 30;
  return Math.max(5, Math.round(value / step) * step);
}

export function nextTimeSeconds(value: number, dir: 1 | -1, multiplier = 1): number {
  let v = Math.max(5, value);
  for (let i = 0; i < multiplier; i++) {
    const step = timeStepAt(v, dir);
    v = dir > 0 ? (Math.floor(v / step) + 1) * step : Math.max(5, (Math.ceil(v / step) - 1) * step);
  }
  return v;
}

export function formatSeconds(value: number): string {
  if (value < 60) return String(value);
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

// Reps (and a program's per-exercise target) change by one; held durations
// use the round-number steps above.
export function nextRepsOrSeconds(metric: MetricType, value: number, dir: 1 | -1, multiplier = 1): number {
  if (metric === 'time_seconds') return nextTimeSeconds(value, dir, multiplier);
  return Math.max(1, value + dir * multiplier);
}

export function defaultTargetReps(metric: MetricType): number {
  return metric === 'time_seconds' ? 30 : 12;
}

export type UnitKey = 'kg' | 'reps' | 'sec';

export function unitKeyFor(metric: MetricType): UnitKey {
  if (metric === 'weight_reps') return 'kg';
  if (metric === 'time_seconds') return 'sec';
  return 'reps';
}
