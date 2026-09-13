import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentUserId } from './authStore';
import { supabase } from '../lib/supabase';
import { Language } from '../types';

interface SettingsState {
  language: Language;
  setLanguage: (language: Language) => void;
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
    }),
    {
      name: 'fitpr-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
