import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useT } from '../i18n/useT';
import { getExercise } from '../constants/exercises';
import { unitKeyFor } from '../lib/metric';
import { colors, fonts } from '../theme';
import { UnlockedBadge } from '../store/workoutStore';

interface Props {
  visible: boolean;
  newBadges: UnlockedBadge[];
  onDone: () => void;
}

const { width } = Dimensions.get('window');

export function PRCelebration({ visible, newBadges, onDone }: Props) {
  const { t, exerciseName, unitLabel } = useT();

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <ConfettiCannon
        count={180}
        origin={{ x: width / 2, y: 0 }}
        fadeOut
        fallSpeed={2800}
        colors={[colors.lime, colors.orange, colors.foreground]}
        onAnimationEnd={onDone}
      />
      <View style={styles.banner}>
        <Text style={styles.title}>{t('celebration.newPr')}</Text>
        {newBadges.map((b) => {
          const badgeTitle =
            b.kind === 'exercise'
              ? `${exerciseName(b.exerciseSlug)} ${b.threshold} ${unitLabel(
                  unitKeyFor(getExercise(b.exerciseSlug).metric)
                )}`
              : `${b.thresholdDays} ${t('workout.dayStreak')}`;
          return (
            <Text key={b.slug} style={styles.badgeText}>
              {t('celebration.badgeUnlocked', { title: badgeTitle })}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 100,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  banner: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.lime,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  title: {
    color: colors.lime,
    fontSize: 28,
    fontFamily: fonts.display,
    letterSpacing: 1,
  },
  badgeText: {
    color: colors.orange,
    fontSize: 14,
    marginTop: 4,
    fontWeight: '700',
  },
});
