import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  initializing: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  initializing: true,
}));

supabase.auth.getSession().then(({ data }) => {
  useAuthStore.setState({ session: data.session, initializing: false });
});

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({ session });
});
