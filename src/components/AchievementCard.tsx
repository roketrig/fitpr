import { Award, Check, Lock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  title: string;
  subtitle: string;
  unlocked: boolean;
  valueText?: string;
  progress?: number;
  progressLabel?: string;
}

export function AchievementCard({
  title,
  subtitle,
  unlocked,
  valueText,
  progress,
  progressLabel,
}: Props) {
  return (
    <View style={[styles.card, unlocked && styles.cardUnlocked]}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, unlocked && styles.iconBoxUnlocked]}>
          {unlocked ? (
            <Award size={22} color={colors.lime} />
          ) : (
            <Lock size={20} color={colors.muted} />
          )}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {unlocked && <Check size={20} color={colors.lime} strokeWidth={3} />}
      </View>

      {unlocked && valueText ? (
        <Text style={styles.value}>{valueText}</Text>
      ) : (
        progress !== undefined && (
          <View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    opacity: 0.7,
  },
  cardUnlocked: { opacity: 1, borderColor: colors.lime },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnlocked: { backgroundColor: 'rgba(201,245,51,0.12)' },
  textCol: { flex: 1 },
  title: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  value: { color: colors.lime, fontSize: 14, fontWeight: '800', marginTop: 12, letterSpacing: 0.5 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.panel,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.orange, borderRadius: 3 },
  progressLabel: { color: colors.lime, fontSize: 11, fontWeight: '700', marginTop: 8 },
});
