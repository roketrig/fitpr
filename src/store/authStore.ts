import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { emptyWeek, useProgramStore } from './programStore';
import { useProfileStore } from './profileStore';
import { useSettingsStore } from './settingsStore';
import { useWorkoutStore } from './workoutStore';

interface AuthState {
  session: Session | null;
  initializing: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  initializing: true,
}));

// Local (AsyncStorage) state is per-device, not per-account — if we didn't
// wipe it on sign-out, whatever was still sitting locally (a guest session's
// data, or the previous account's) would get treated as "local data to
// migrate" the next time someone signs into a *different* account on this
// device, leaking one account's workouts/program into another's.
function resetLocalDataForSignOut() {
  useWorkoutStore.setState({ sets: [], unlockedAchievementSlugs: [] });
  useProgramStore.setState({ week: emptyWeek() });
  useProfileStore.setState((state) => ({
    profile: {
      displayName: '',
      gender: null,
      heightCm: null,
      weightKg: null,
      memberSinceYear: state.profile.memberSinceYear,
    },
  }));
  useSettingsStore.setState({ language: 'en' });
}

supabase.auth.getSession().then(({ data }) => {
  useAuthStore.setState({ session: data.session, initializing: false });
});

supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({ session });
  if (event === 'SIGNED_OUT') {
    resetLocalDataForSignOut();
  }
});

export function getCurrentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null;
}
