import { getExercise } from '../constants/exercises';
import { primaryValueOf } from './metric';
import { ExerciseSlug, WorkoutSet } from '../types';

// Local calendar date (not UTC — an ISO string slice would misclassify sets
// logged near midnight for anyone east/west of UTC).
function dayKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function trainingDayKeys(sets: WorkoutSet[]): string[] {
  return Array.from(new Set(sets.map((s) => dayKey(s.performedAt)))).sort();
}

// Consecutive days (ending today or yesterday) with at least one logged set.
export function currentStreakDays(sets: WorkoutSet[]): number {
  const days = new Set(trainingDayKeys(sets));
  if (days.size === 0) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreakDays(sets: WorkoutSet[]): number {
  const days = trainingDayKeys(sets);
  if (days.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    current = diffDays === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function totalVolumeKg(sets: WorkoutSet[]): number {
  return sets
    .filter((s) => getExercise(s.exerciseSlug).metric === 'weight_reps')
    .reduce((sum, s) => sum + s.weightKg * s.reps, 0);
}

function monthKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface MonthStats {
  workouts: number;
  totalKg: number;
}

export function statsForCurrentMonth(sets: WorkoutSet[]): MonthStats {
  return { workouts: trainingDayKeys(setsInCurrentMonth(sets)).length, totalKg: totalVolumeKg(setsInCurrentMonth(sets)) };
}

export function setsInCurrentMonth(sets: WorkoutSet[]): WorkoutSet[] {
  const thisMonth = monthKey(new Date());
  return sets.filter((s) => monthKey(s.performedAt) === thisMonth);
}

// Average volume logged per distinct training day — 0 for bodyweight-only days.
export function averageSessionVolumeKg(sets: WorkoutSet[]): number {
  const days = trainingDayKeys(sets).length;
  if (days === 0) return 0;
  return Math.round(totalVolumeKg(sets) / days);
}

export interface MostTrained {
  exerciseSlug: ExerciseSlug;
  setCount: number;
}

export function mostTrainedExercise(sets: WorkoutSet[]): MostTrained | null {
  if (sets.length === 0) return null;
  const counts = new Map<ExerciseSlug, number>();
  for (const s of sets) counts.set(s.exerciseSlug, (counts.get(s.exerciseSlug) ?? 0) + 1);
  let best: MostTrained | null = null;
  for (const [exerciseSlug, setCount] of counts) {
    if (!best || setCount > best.setCount) best = { exerciseSlug, setCount };
  }
  return best;
}

export interface WeekBucket {
  weekStart: string; // ISO date of the bucket's first day
  totalKg: number;
}

// Rolling 7-day buckets ending today, oldest first — a lightweight trend
// view that doesn't depend on any particular locale's week-start convention.
export function weeklyVolumeSeries(sets: WorkoutSet[], weeks = 8): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(today);
    end.setDate(end.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const totalKg = sets
      .filter((s) => getExercise(s.exerciseSlug).metric === 'weight_reps')
      .filter((s) => {
        const d = new Date(s.performedAt);
        return d >= start && d <= end;
      })
      .reduce((sum, s) => sum + s.weightKg * s.reps, 0);

    buckets.push({ weekStart: dayKey(start), totalKg });
  }
  return buckets;
}

export function trainingWeekNumber(sets: WorkoutSet[]): number {
  return Math.max(1, Math.ceil(trainingDayKeys(sets).length / 7));
}

export interface SessionStats {
  todaysSets: WorkoutSet[];
  sessionVolume: number;
  lastSessionVolume: number;
}

function sessionValue(sets: WorkoutSet[], exerciseSlug: ExerciseSlug): number {
  const metric = getExercise(exerciseSlug).metric;
  if (metric === 'weight_reps') return sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  return sets.reduce((sum, s) => sum + s.reps, 0);
}

export function sessionStatsFor(sets: WorkoutSet[], exerciseSlug: ExerciseSlug): SessionStats {
  const exerciseSets = sets
    .filter((s) => s.exerciseSlug === exerciseSlug)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));

  const today = dayKey(new Date().toISOString());
  const todaysSets = exerciseSets.filter((s) => dayKey(s.performedAt) === today);
  const sessionVolume = sessionValue(todaysSets, exerciseSlug);

  const previousDay = [...new Set(exerciseSets.map((s) => dayKey(s.performedAt)))]
    .filter((d) => d !== today)
    .pop();
  const lastSessionVolume = previousDay
    ? sessionValue(
        exerciseSets.filter((s) => dayKey(s.performedAt) === previousDay),
        exerciseSlug
      )
    : 0;

  return { todaysSets, sessionVolume, lastSessionVolume };
}

export function suggestedNextValue(
  sets: WorkoutSet[],
  exerciseSlug: ExerciseSlug,
  personalBest: number
): number {
  const exercise = getExercise(exerciseSlug);
  const exerciseSets = sets
    .filter((s) => s.exerciseSlug === exerciseSlug)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));

  if (exerciseSets.length > 0) return primaryValueOf(exerciseSets[0], exercise.metric);
  if (exercise.metric !== 'weight_reps') return personalBest > 0 ? personalBest : 8;
  if (personalBest > 0) return Math.round((personalBest * 0.7) / 2.5) * 2.5;
  return exercise.equipment === 'barbell' ? 20 : exercise.equipment === 'dumbbell' ? 5 : 20;
}
