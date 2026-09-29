import { create } from 'zustand';

// Session-local only (not persisted): a PT on the web build is normally
// locked into the PT dashboard with no way to reach anything else. This
// lets them flip over to see their own personal FitPR experience (they're
// a user too) and back, without changing their stored role.
interface UiModeState {
  ptViewingAsStudent: boolean;
  setPtViewingAsStudent: (value: boolean) => void;
}

export const useUiModeStore = create<UiModeState>((set) => ({
  ptViewingAsStudent: false,
  setPtViewingAsStudent: (value) => set({ ptViewingAsStudent: value }),
}));
