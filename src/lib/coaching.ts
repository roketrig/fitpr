import { getExercise } from '../constants/exercises';
import { supabase } from './supabase';
import {
  CheckinSubmission,
  CoachLink,
  DayOfWeek,
  ExerciseSlug,
  NutritionTarget,
  ProgramExercise,
  PtSubscription,
  StudentSummary,
  WeeklyProgram,
} from '../types';
import { emptyWeek } from '../store/programStore';

function toCheckinSubmission(row: {
  id: string;
  student_id: string;
  photo_path: string;
  weight_kg: number | null;
  submitted_at: string;
  pt_comment: string | null;
  pt_commented_at: string | null;
}): CheckinSubmission {
  return {
    id: row.id,
    studentId: row.student_id,
    photoPath: row.photo_path,
    weightKg: row.weight_kg,
    submittedAt: row.submitted_at,
    ptComment: row.pt_comment,
    ptCommentedAt: row.pt_commented_at,
  };
}

export async function becomePT(): Promise<string> {
  const { data, error } = await supabase.rpc('become_pt');
  if (error) throw error;
  return data as string;
}

export async function linkToPT(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('link_to_pt', { code });
  if (error) throw error;
  return data as string;
}

export async function fetchMyCoach(): Promise<CoachLink | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data: link } = await supabase
    .from('pt_student_links')
    .select('pt_id')
    .eq('student_id', userId)
    .maybeSingle();
  if (!link) return null;

  const { data: pt } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', link.pt_id)
    .maybeSingle();

  return { ptId: link.pt_id, displayName: pt?.display_name || 'Your coach' };
}

export async function fetchMyNutritionTarget(): Promise<NutritionTarget | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data } = await supabase
    .from('nutrition_targets')
    .select('calories, protein_g')
    .eq('student_id', userId)
    .maybeSingle();
  if (!data) return null;
  return { calories: data.calories, proteinG: data.protein_g };
}

export async function fetchMyStudents(): Promise<StudentSummary[]> {
  const { data: userData } = await supabase.auth.getUser();
  const ptId = userData.user?.id;
  if (!ptId) return [];

  const { data: links, error } = await supabase
    .from('pt_student_links')
    .select('student_id, linked_at')
    .eq('pt_id', ptId)
    .order('linked_at', { ascending: false });
  if (error || !links || links.length === 0) return [];

  const ids = links.map((l) => l.student_id);
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', ids);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return links.map((l) => ({
    studentId: l.student_id,
    displayName: nameById.get(l.student_id) || 'Unnamed',
    linkedAt: l.linked_at,
  }));
}

export async function fetchStudentProgram(studentId: string): Promise<WeeklyProgram> {
  const { data } = await supabase
    .from('program_exercises')
    .select('day_of_week, exercise_slug, target_sets, target_reps')
    .eq('user_id', studentId)
    .order('position');

  const week = emptyWeek();
  for (const row of data ?? []) {
    week[row.day_of_week as DayOfWeek].push({
      exerciseSlug: row.exercise_slug as ExerciseSlug,
      targetSets: row.target_sets,
      targetReps: row.target_reps,
    });
  }
  return week;
}

export async function assignExerciseToStudent(
  studentId: string,
  day: DayOfWeek,
  exerciseSlug: ExerciseSlug,
  position: number
): Promise<void> {
  const exercise = getExercise(exerciseSlug);
  const { error } = await supabase.from('program_exercises').upsert(
    {
      user_id: studentId,
      day_of_week: day,
      exercise_slug: exerciseSlug,
      target_sets: 3,
      target_reps: exercise.metric === 'time_seconds' ? 30 : 12,
      position,
    },
    { onConflict: 'user_id,day_of_week,exercise_slug' }
  );
  if (error) throw error;
}

export async function updateStudentExerciseTarget(
  studentId: string,
  day: DayOfWeek,
  exerciseSlug: ExerciseSlug,
  patch: Partial<Pick<ProgramExercise, 'targetSets' | 'targetReps'>>
): Promise<void> {
  const update: Record<string, number> = {};
  if (patch.targetSets !== undefined) update.target_sets = patch.targetSets;
  if (patch.targetReps !== undefined) update.target_reps = patch.targetReps;
  const { error } = await supabase
    .from('program_exercises')
    .update(update)
    .match({ user_id: studentId, day_of_week: day, exercise_slug: exerciseSlug });
  if (error) throw error;
}

export async function removeStudentExercise(
  studentId: string,
  day: DayOfWeek,
  exerciseSlug: ExerciseSlug
): Promise<void> {
  const { error } = await supabase
    .from('program_exercises')
    .delete()
    .match({ user_id: studentId, day_of_week: day, exercise_slug: exerciseSlug });
  if (error) throw error;
}

export async function setStudentNutritionTarget(
  studentId: string,
  target: NutritionTarget
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const ptId = userData.user?.id;
  if (!ptId) throw new Error('Not signed in');

  const { error } = await supabase.from('nutrition_targets').upsert(
    {
      student_id: studentId,
      pt_id: ptId,
      calories: target.calories,
      protein_g: target.proteinG,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id' }
  );
  if (error) throw error;
}

export async function fetchStudentNutritionTarget(studentId: string): Promise<NutritionTarget> {
  const { data } = await supabase
    .from('nutrition_targets')
    .select('calories, protein_g')
    .eq('student_id', studentId)
    .maybeSingle();
  return { calories: data?.calories ?? null, proteinG: data?.protein_g ?? null };
}

export async function setCheckinDay(studentId: string, day: DayOfWeek | null): Promise<void> {
  const { error } = await supabase
    .from('pt_student_links')
    .update({ checkin_day: day })
    .eq('student_id', studentId);
  if (error) throw error;
}

export async function fetchStudentCheckinDay(studentId: string): Promise<DayOfWeek | null> {
  const { data } = await supabase
    .from('pt_student_links')
    .select('checkin_day')
    .eq('student_id', studentId)
    .maybeSingle();
  return (data?.checkin_day ?? null) as DayOfWeek | null;
}

export async function fetchMyCheckinDay(): Promise<DayOfWeek | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  return fetchStudentCheckinDay(userId);
}

export async function fetchStudentCheckins(studentId: string): Promise<CheckinSubmission[]> {
  const { data, error } = await supabase
    .from('checkin_photos')
    .select('id, student_id, photo_path, weight_kg, submitted_at, pt_comment, pt_commented_at')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });
  if (error || !data) return [];
  return data.map(toCheckinSubmission);
}

export async function fetchMyCheckins(): Promise<CheckinSubmission[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  return fetchStudentCheckins(userId);
}

export async function submitCheckin(photoPath: string, weightKg: number | null): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Not signed in');
  const { error } = await supabase
    .from('checkin_photos')
    .insert({ student_id: userId, photo_path: photoPath, weight_kg: weightKg });
  if (error) throw error;
}

export async function commentOnCheckin(checkinId: string, comment: string): Promise<void> {
  const { error } = await supabase.rpc('comment_on_checkin', { checkin_id: checkinId, comment });
  if (error) throw error;
}

export async function fetchMySubscription(): Promise<PtSubscription | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data } = await supabase
    .from('pt_subscriptions')
    .select('status, trial_started_at, student_limit, current_period_end')
    .eq('pt_id', userId)
    .maybeSingle();
  if (!data) return null;
  return {
    status: data.status,
    trialStartedAt: data.trial_started_at,
    studentLimit: data.student_limit,
    currentPeriodEnd: data.current_period_end,
  };
}
