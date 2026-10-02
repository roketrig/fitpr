import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { StatRow } from '../../components/StatRow';
import { WeeklyVolumeChart } from '../../components/WeeklyVolumeChart';
import { getExercise } from '../../constants/exercises';
import { useT } from '../../i18n/useT';
import { fetchStudentProfile, fetchStudentSets } from '../../lib/coaching';
import { unitKeyFor } from '../../lib/metric';
import {
  currentStreakDays,
  longestStreakDays,
  mostTrainedExercise,
  totalVolumeKg,
  trainingDayKeys,
  weeklyVolumeSeries,
} from '../../lib/stats';
import { Colors, fonts, useColors } from '../../theme';
import { StudentProfileInfo, WorkoutSet } from '../../types';

const DAY_MS = 86400000;

export function StudentOverviewTab({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { t, exerciseName, unitLabel, dateLocale } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [profile, setProfile] = useState<StudentProfileInfo | null>(null);
  const [sets, setSets] = useState<WorkoutSet[] | null>(null);

  useEffect(() => {
    fetchStudentProfile(studentId).then(setProfile);
    fetchStudentSets(studentId, 90).then(setSets);
  }, [studentId]);

  const last30 = useMemo(
    () => (sets ?? []).filter((s) => Date.now() - new Date(s.performedAt).getTime() <= 30 * DAY_MS),
    [sets]
  );
  const weekly = useMemo(() => weeklyVolumeSeries(sets ?? [], 8), [sets]);
  const topExercise = useMemo(() => mostTrainedExercise(last30), [last30]);
  const recentPrs = useMemo(() => (sets ?? []).filter((s) => s.isPr).slice(0, 5), [sets]);
  const recentSets = useMemo(() => (sets ?? []).slice(0, 12), [sets]);

  function formatSet(set: WorkoutSet): string {
    const metric = getExercise(set.exerciseSlug).metric;
    if (metric === 'weight_reps') return `${set.weightKg} ${unitLabel('kg')} × ${set.reps}`;
    return `${set.reps} ${unitLabel(unitKeyFor(metric))}`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });
  }

  function lastWorkoutText(): string | null {
    if (!sets || sets.length === 0) return null;
    const days = Math.floor((Date.now() - new Date(sets[0].performedAt).getTime()) / DAY_MS);
    const when = days <= 0 ? t('pt.today') : t('pt.daysAgo', { days });
    return t('pt.lastWorkout', { when });
  }

  const initial = (profile?.displayName || studentName).trim().charAt(0).toUpperCase() || '?';
  const bodyBits = [
    profile?.gender ? t(profile.gender === 'male' ? 'profile.male' : 'profile.female') : null,
    profile?.heightCm ? `${profile.heightCm} cm` : null,
    profile?.weightKg ? `${profile.weightKg} kg` : null,
  ].filter(Boolean);

  if (sets === null) return <ActivityIndicator color={colors.lime} style={{ marginTop: 30 }} />;

  return (
    <View style={{ gap: 18 }}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.displayName || studentName}</Text>
          {bodyBits.length > 0 && <Text style={styles.sub}>{bodyBits.join(' · ')}</Text>}
          <Text style={styles.sub}>{lastWorkoutText() ?? t('pt.noActivity')}</Text>
        </View>
      </View>

      <View>
        <StatRow
          stats={[
            { label: t('pt.stat.workouts30'), value: String(trainingDayKeys(last30).length) },
            { label: t('pt.stat.volume30'), value: String(totalVolumeKg(last30)) },
            { label: t('profile.currentStreak'), value: String(currentStreakDays(sets)) },
          ]}
        />
        <View style={{ marginTop: 10 }}>
          <StatRow
            stats={[
              { label: t('profile.bestStreak'), value: String(longestStreakDays(sets)) },
              {
                label: t('profile.topExercise'),
                value: topExercise ? exerciseName(topExercise.exerciseSlug) : '—',
              },
            ]}
          />
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>{t('profile.weeklyVolume')}</Text>
        <WeeklyVolumeChart buckets={weekly} />
      </View>

      <View>
        <Text style={styles.sectionLabel}>{t('pt.recentPrs')}</Text>
        {recentPrs.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>{t('pt.noPrs')}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {recentPrs.map((s, i) => (
              <View key={s.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Text style={styles.rowTitle}>{exerciseName(s.exerciseSlug)}</Text>
                <Text style={styles.prValue}>{formatSet(s)}</Text>
                <Text style={styles.rowDate}>{formatDate(s.performedAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View>
        <Text style={styles.sectionLabel}>{t('pt.recentSets')}</Text>
        {recentSets.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>{t('pt.noActivity')}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {recentSets.map((s, i) => (
              <View key={s.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Text style={styles.rowTitle}>{exerciseName(s.exerciseSlug)}</Text>
                <Text style={styles.rowValue}>{formatSet(s)}</Text>
                <Text style={styles.rowDate}>{formatDate(s.performedAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 56, height: 56 },
  avatarText: { color: colors.lime, fontSize: 22, fontWeight: '800' },
  name: { color: colors.foreground, fontSize: 22, fontFamily: fonts.display },
  sub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 18, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowTitle: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '700' },
  rowValue: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  prValue: { color: colors.lime, fontSize: 13, fontWeight: '800' },
  rowDate: { color: colors.muted, fontSize: 11, fontWeight: '700', minWidth: 48, textAlign: 'right' },
});
