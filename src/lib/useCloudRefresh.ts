import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useCoachStore } from '../store/coachStore';
import { useFoodLogStore } from '../store/foodLogStore';
import { useProgramStore } from '../store/programStore';

const REFRESH_INTERVAL_MS = 30000;

// Things a coach can change from the web dashboard (program, nutrition
// target, check-in day, comments on food entries) only reached the phone on
// the next cold start. This pulls them again when the app comes back to the
// foreground and every 30 seconds while it's open.
export function refreshFromCloud(userId: string) {
  return Promise.all([
    useProgramStore.getState().refreshFromRemote(userId),
    useCoachStore.getState().refresh(),
    useFoodLogStore.getState().refreshToday(),
  ]);
}

export function useCloudRefresh() {
  const userId = useAuthStore((s) => s.session?.user.id);

  useEffect(() => {
    if (!userId) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => refreshFromCloud(userId), REFRESH_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshFromCloud(userId);
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [userId]);
}
