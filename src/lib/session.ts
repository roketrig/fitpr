import { supabase } from './supabase';

// A dependency-free way for stores to read "who's signed in right now"
// without importing the zustand auth store — keeps store→store require
// cycles (workoutStore -> authStore -> workoutStore, etc.) out of the graph.
let currentUserId: string | null = null;

supabase.auth.getSession().then(({ data }) => {
  currentUserId = data.session?.user.id ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUserId = session?.user.id ?? null;
});

export function getCurrentUserId(): string | null {
  return currentUserId;
}
