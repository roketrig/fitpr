import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentUserId } from './authStore';
import { supabase } from '../lib/supabase';
import { Gender, Profile } from '../types';

function syncProfileField(field: 'display_name' | 'gender' | 'height_cm' | 'weight_kg', value: unknown) {
  const userId = getCurrentUserId();
  if (!userId) return;
  supabase
    .from('profiles')
    .update({ [field]: value })
    .eq('id', userId)
    .then(({ error }) => error && console.warn('Supabase profile update failed', error));
}

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
      setDisplayName: (displayName) => {
        set((state) => ({ profile: { ...state.profile, displayName } }));
        syncProfileField('display_name', displayName);
      },
      setGender: (gender) => {
        set((state) => ({ profile: { ...state.profile, gender } }));
        syncProfileField('gender', gender);
      },
      setHeightCm: (heightCm) => {
        set((state) => ({ profile: { ...state.profile, heightCm } }));
        syncProfileField('height_cm', heightCm);
      },
      setWeightKg: (weightKg) => {
        set((state) => ({ profile: { ...state.profile, weightKg } }));
        syncProfileField('weight_kg', weightKg);
      },
    }),
    {
      name: 'fitpr-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
