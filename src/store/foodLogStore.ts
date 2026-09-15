import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentUserId } from '../lib/session';
import { supabase } from '../lib/supabase';
import { FoodLogEntry } from '../types';

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface FoodLogState {
  todaysEntries: FoodLogEntry[];
  addEntry: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void;
  removeEntry: (id: string) => void;
  refreshToday: () => Promise<void>;
}

export const useFoodLogStore = create<FoodLogState>()(
  persist(
    (set, get) => ({
      todaysEntries: [],

      addEntry: (entry) => {
        const newEntry: FoodLogEntry = {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          loggedAt: new Date().toISOString(),
        };
        set({ todaysEntries: [...get().todaysEntries, newEntry] });

        const userId = getCurrentUserId();
        if (!userId) return;
        supabase
          .from('food_log_entries')
          .insert({
            id: newEntry.id,
            user_id: userId,
            food_slug: newEntry.foodSlug,
            label: newEntry.label,
            quantity: newEntry.quantity,
            calories: newEntry.calories,
            protein_g: newEntry.proteinG,
            logged_at: newEntry.loggedAt,
          })
          .then(({ error }) => error && console.warn('Supabase food log insert failed', error));
      },

      removeEntry: (id) => {
        set({ todaysEntries: get().todaysEntries.filter((e) => e.id !== id) });

        const userId = getCurrentUserId();
        if (!userId) return;
        supabase
          .from('food_log_entries')
          .delete()
          .match({ id, user_id: userId })
          .then(({ error }) => error && console.warn('Supabase food log delete failed', error));
      },

      refreshToday: async () => {
        const userId = getCurrentUserId();
        if (!userId) return;
        const { data, error } = await supabase
          .from('food_log_entries')
          .select('*')
          .eq('user_id', userId)
          .gte('logged_at', startOfTodayIso())
          .order('logged_at');
        if (error || !data) return;
        set({
          todaysEntries: data.map((r) => ({
            id: r.id,
            foodSlug: r.food_slug,
            label: r.label,
            quantity: Number(r.quantity),
            calories: r.calories,
            proteinG: r.protein_g,
            loggedAt: r.logged_at,
          })),
        });
      },
    }),
    {
      name: 'fitpr-food-log',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
