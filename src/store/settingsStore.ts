import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentUserId } from '../lib/session';
import { supabase } from '../lib/supabase';
import { Language } from '../types';

export type WorkoutViewMode = 'carousel' | 'list';

interface SettingsState {
  language: Language;
  setLanguage: (language: Language) => void;
  workoutViewMode: WorkoutViewMode;
  setWorkoutViewMode: (mode: WorkoutViewMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        set({ language });
        const userId = getCurrentUserId();
        if (!userId) return;
        supabase
          .from('profiles')
          .update({ language })
          .eq('id', userId)
          .then(({ error }) => error && console.warn('Supabase language update failed', error));
      },
      // Device-local display preference — not synced to the account like
      // language/theme are, since it's about how this screen renders here,
      // not identity data tied to the user.
      workoutViewMode: 'carousel',
      setWorkoutViewMode: (workoutViewMode) => set({ workoutViewMode }),
    }),
    {
      name: 'fitpr-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
