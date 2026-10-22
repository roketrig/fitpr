import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small physical confirmations. No-ops on web, and a failure (device without
// a haptic engine) must never get in the way of what the user is doing.
export function hapticTap() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
