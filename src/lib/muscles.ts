import { EXERCISE_MUSCLES, MUSCLES } from '../constants/muscles';
import { Muscle, WorkoutSet } from '../types';

export type MuscleScores = Record<Muscle, number>;

// A set counts 1 toward each primary muscle and 0.5 toward each helper.
// Sets, not kilos: volume would drown out bodyweight and timed exercises.
export function muscleScores(sets: WorkoutSet[]): MuscleScores {
  const scores = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as MuscleScores;
  for (const s of sets) {
    const work = EXERCISE_MUSCLES[s.exerciseSlug];
    if (!work) continue;
    for (const m of work.primary) scores[m] += 1;
    for (const m of work.secondary) scores[m] += 0.5;
  }
  return scores;
}
