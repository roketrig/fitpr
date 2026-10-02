import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchMyCheckinDay, fetchMyCoach, fetchMyNutritionTarget, linkToPT } from '../lib/coaching';
import { CoachLink, DayOfWeek, NutritionTarget } from '../types';

interface CoachState {
  coach: CoachLink | null;
  nutritionTarget: NutritionTarget | null;
  checkinDay: DayOfWeek | null;
  linking: boolean;
  linkError: string | null;
  refresh: () => Promise<void>;
  linkToCoach: (code: string) => Promise<boolean>;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set) => ({
      coach: null,
      nutritionTarget: null,
      checkinDay: null,
      linking: false,
      linkError: null,

      refresh: async () => {
        // A failed fetch (e.g. offline) keeps what we already have instead of
        // looking like the coach unlinked.
        try {
          const [coach, nutritionTarget, checkinDay] = await Promise.all([
            fetchMyCoach(),
            fetchMyNutritionTarget(),
            fetchMyCheckinDay(),
          ]);
          set({ coach, nutritionTarget, checkinDay });
        } catch (e) {
          console.warn('Coach refresh failed', e);
        }
      },

      linkToCoach: async (code) => {
        set({ linking: true, linkError: null });
        try {
          await linkToPT(code.trim());
          const coach = await fetchMyCoach();
          set({ coach, linking: false });
          return true;
        } catch (e) {
          set({ linking: false, linkError: e instanceof Error ? e.message : String(e) });
          return false;
        }
      },
    }),
    {
      name: 'fitpr-coach',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        coach: state.coach,
        nutritionTarget: state.nutritionTarget,
        checkinDay: state.checkinDay,
      }),
    }
  )
);
