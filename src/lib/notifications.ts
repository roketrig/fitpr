import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { exerciseNameFor } from '../i18n/useT';
import { translations } from '../i18n/translations';
import { DayOfWeek, Language, WeeklyProgram } from '../types';
import { supabase } from './supabase';

// Notifications only exist in the native apps; every export here is a safe
// no-op on web so callers don't need their own platform checks.
const supported = Platform.OS !== 'web';
const PUSH_TOKEN_KEY = 'fitpr-push-token';

export function configureNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'FitPR',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#c9f533',
    }).catch(() => {});
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

export interface LocalReminderSettings {
  language: Language;
  workoutEnabled: boolean;
  workoutHour: number;
  program: WeeklyProgram;
  checkinEnabled: boolean;
  checkinDay: DayOfWeek | null;
}

// Rebuilds every scheduled local reminder from scratch whenever its inputs
// change — simpler and safer than diffing individual notifications.
export async function rescheduleLocalReminders(s: LocalReminderSettings): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await hasNotificationPermission())) return;

  const t = translations[s.language];

  if (s.workoutEnabled) {
    for (const key of Object.keys(s.program)) {
      const day = Number(key) as DayOfWeek;
      const exercises = s.program[day] ?? [];
      if (exercises.length === 0) continue;
      const names = exercises
        .slice(0, 3)
        .map((e) => exerciseNameFor(s.language, e.exerciseSlug))
        .join(', ');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t['notif.workoutTitle'],
          body: interpolate(t['notif.workoutBody'], { count: exercises.length, names }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1,
          hour: s.workoutHour,
          minute: 0,
          channelId: 'default',
        },
      });
    }
  }

  if (s.checkinEnabled && s.checkinDay !== null) {
    await Notifications.scheduleNotificationAsync({
      content: { title: t['notif.checkinTitle'], body: t['notif.checkinBody'] },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: s.checkinDay + 1,
        hour: 9,
        minute: 0,
        channelId: 'default',
      },
    });
  }
}

// Registers this device for server-sent pushes (coach comments etc.). Needs
// notification permission and, on Android, Firebase/FCM credentials in the
// build — without them this quietly does nothing and local reminders still work.
export async function registerPushToken(): Promise<void> {
  if (!supported) return;
  try {
    if (!(await hasNotificationPermission())) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('register_push_token', {
      new_token: token,
      new_platform: Platform.OS,
    });
    if (error) throw error;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch (e) {
    console.warn('Push token registration skipped', e);
  }
}

// Call before signing out so the next person on this device doesn't inherit
// the previous account's pushes.
export async function unregisterPushToken(): Promise<void> {
  if (!supported) return;
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await supabase.rpc('unregister_push_token', { old_token: token });
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (e) {
    console.warn('Push token removal failed', e);
  }
}

export type PushEvent = 'checkin_comment' | 'food_review' | 'target_updated' | 'checkin_submitted';

// Asks the send-push edge function to notify the other person in a
// coach/student pair. Fire-and-forget: a failed notification must never
// break the action that triggered it.
const lastSent = new Map<string, number>();
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000;

export function notifyOther(event: PushEvent, studentId?: string): void {
  // Reviewing ten meals in a row shouldn't buzz the student ten times.
  const key = `${event}:${studentId ?? ''}`;
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < NOTIFY_COOLDOWN_MS) return;
  lastSent.set(key, now);

  supabase.functions
    .invoke('send-push', { body: { event, studentId } })
    .then(({ error }) => error && console.warn('send-push failed', error))
    .catch((e) => console.warn('send-push failed', e));
}
