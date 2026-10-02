import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateUuid } from '../lib/id';
import { getCurrentUserId } from '../lib/session';
import { supabase } from '../lib/supabase';
import { FoodLogEntry, NewFoodLogEntry } from '../types';

// A refresh that lands right after a local add/remove could briefly erase it
// before its network write finishes, so refreshes skip that short window.
let lastLocalEditAt = 0;
const LOCAL_EDIT_GRACE_MS = 8000;

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface FoodLogState {
  todaysEntries: FoodLogEntry[];
  addEntry: (entry: NewFoodLogEntry) => void;
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
          id: generateUuid(),
          loggedAt: new Date().toISOString(),
          ptStatus: null,
          ptComment: null,
        };
        lastLocalEditAt = Date.now();
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
            photo_path: newEntry.photoPath,
          })
          .then(({ error }) => error && console.warn('Supabase food log insert failed', error));
      },

      removeEntry: (id) => {
        lastLocalEditAt = Date.now();
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
        if (Date.now() - lastLocalEditAt < LOCAL_EDIT_GRACE_MS) return;
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
            photoPath: r.photo_path ?? null,
            ptStatus: r.pt_status ?? null,
            ptComment: r.pt_comment ?? null,
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
