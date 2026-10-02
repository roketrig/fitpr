import { useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCoachStore } from '../store/coachStore';
import { useProfileStore } from '../store/profileStore';
import { useProgramStore } from '../store/programStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  configureNotifications,
  registerPushToken,
  requestNotificationPermission,
  rescheduleLocalReminders,
} from './notifications';

export function useNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const language = useSettingsStore((s) => s.language);
  const workoutEnabled = useSettingsStore((s) => s.notifyWorkout);
  const workoutHour = useSettingsStore((s) => s.workoutReminderHour);
  const checkinEnabled = useSettingsStore((s) => s.notifyCheckin);
  const week = useProgramStore((s) => s.week);
  const checkinDay = useCoachStore((s) => s.checkinDay);
  const coach = useCoachStore((s) => s.coach);
  const role = useProfileStore((s) => s.profile.role);

  // The cloud refresh hands back a fresh `week` object every 30s even when
  // nothing changed, so key the reschedule on its content instead.
  const programKey = useMemo(() => JSON.stringify(week), [week]);

  useEffect(() => {
    configureNotifications();
  }, []);

  useEffect(() => {
    rescheduleLocalReminders({
      language,
      workoutEnabled,
      workoutHour,
      program: week,
      checkinEnabled,
      checkinDay,
    }).catch((e) => console.warn('Reminder scheduling failed', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, workoutEnabled, workoutHour, programKey, checkinEnabled, checkinDay]);

  // Coach/student pushes matter once there's someone on the other end, so
  // that's when we ask for permission; an already-granted permission is
  // enough to (re)register the device token.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      if (coach || role === 'pt') await requestNotificationPermission();
      await registerPushToken();
    })();
  }, [userId, coach, role]);
}
