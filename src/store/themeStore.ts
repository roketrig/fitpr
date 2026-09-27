import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ThemeState {
  paletteId: string;
  setPaletteId: (id: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      paletteId: 'lime',
      setPaletteId: (id) => set({ paletteId: id }),
    }),
    {
      name: 'fitpr-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
