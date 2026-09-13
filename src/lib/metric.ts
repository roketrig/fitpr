import { Exercise, MetricType, WorkoutSet } from '../types';

// The number that PRs / achievements / progress are measured against:
// kg for weight_reps exercises, reps or held seconds otherwise.
export function primaryValueOf(set: Pick<WorkoutSet, 'weightKg' | 'reps'>, metric: MetricType): number {
  return metric === 'weight_reps' ? set.weightKg : set.reps;
}

export interface ValueStepConfig {
  step: number;
  min: number;
}

export function getValueStepConfig(exercise: Exercise): ValueStepConfig {
  if (exercise.metric === 'time_seconds') return { step: 5, min: 5 };
  if (exercise.metric === 'reps_only') return { step: 1, min: 1 };

  switch (exercise.equipment) {
    case 'barbell':
      return { step: 2.5, min: 20 };
    case 'dumbbell':
      return { step: 2, min: 2 };
    case 'machine':
      return { step: 5, min: 5 };
    default:
      return { step: 2.5, min: 0 };
  }
}

export type UnitKey = 'kg' | 'reps' | 'sec';

export function unitKeyFor(metric: MetricType): UnitKey {
  if (metric === 'weight_reps') return 'kg';
  if (metric === 'time_seconds') return 'sec';
  return 'reps';
}
