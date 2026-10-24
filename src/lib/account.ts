import { getCurrentUserId } from './session';
import { supabase } from './supabase';

// Uploaded photos live in storage, not in the tables that cascade away with
// the auth user, so they're removed here first. Each user's files sit in a
// folder named after their id. Best effort: a failure here must not stop the
// account itself from being deleted.
const PHOTO_BUCKETS = ['avatars', 'food-photos', 'checkin-photos'];

async function deleteMyPhotos(userId: string) {
  for (const bucket of PHOTO_BUCKETS) {
    try {
      const files = supabase.storage.from(bucket);
      for (;;) {
        const { data, error } = await files.list(userId, { limit: 100 });
        if (error || !data || data.length === 0) break;
        const { error: removeError } = await files.remove(data.map((f) => `${userId}/${f.name}`));
        if (removeError) break;
      }
    } catch (e) {
      console.warn(`Deleting ${bucket} photos failed`, e);
    }
  }
}

export async function deleteMyAccount(): Promise<void> {
  const userId = getCurrentUserId();
  if (userId) await deleteMyPhotos(userId);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
