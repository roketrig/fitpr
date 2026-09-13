import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Gender, Profile } from '../types';

interface ProfileState {
  profile: Profile;
  setDisplayName: (name: string) => void;
  setGender: (gender: Gender) => void;
  setHeightCm: (heightCm: number | null) => void;
  setWeightKg: (weightKg: number | null) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: {
        displayName: '',
        gender: null,
        heightCm: null,
        weightKg: null,
        memberSinceYear: new Date().getFullYear(),
      },
      setDisplayName: (displayName) =>
        set((state) => ({ profile: { ...state.profile, displayName } })),
      setGender: (gender) => set((state) => ({ profile: { ...state.profile, gender } })),
      setHeightCm: (heightCm) => set((state) => ({ profile: { ...state.profile, heightCm } })),
      setWeightKg: (weightKg) => set((state) => ({ profile: { ...state.profile, weightKg } })),
    }),
    {
      name: 'fitpr-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
