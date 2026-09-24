import { ExerciseSlug } from '../types';

// Short (5-10s), copyright-free demo clips, one per exercise, uploaded by
// hand to the public "exercise-clips" Supabase Storage bucket as
// "<slug>.mp4". Add a slug here once its clip is uploaded — nothing else
// in the app needs to change, the demo button just starts showing up.
export const EXERCISE_CLIP_SLUGS = new Set<ExerciseSlug>([
  // e.g. 'bench_press',
]);

export function hasExerciseClip(slug: ExerciseSlug): boolean {
  return EXERCISE_CLIP_SLUGS.has(slug);
}

export function getExerciseClipUrl(slug: ExerciseSlug): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/exercise-clips/${slug}.mp4`;
}
