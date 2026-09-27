import React, { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AchievementCard } from '../components/AchievementCard';
import { AppHeader } from '../components/AppHeader';
import { StatusPill } from '../components/StatusPill';
import {
  ACHIEVEMENTS,
  getNextAchievementFor,
  getNextStreakAchievement,
  STREAK_ACHIEVEMENTS,
} from '../constants/achievements';
import { CATEGORY_ORDER, EXERCISES, getExercise } from '../constants/exercises';
import { STREAK_ACHIEVEMENT_TEXT } from '../i18n/translations';
import { useT } from '../i18n/useT';
import { unitKeyFor } from '../lib/metric';
import { currentStreakDays } from '../lib/stats';
import { useProfileStore } from '../store/profileStore';
import { useWorkoutStore } from '../store/workoutStore';
import { Colors, fonts, useColors } from '../theme';
import { CategoryKey } from '../types';

interface Row {
  key: string;
  title: string;
  subtitle: string;
  unlocked: boolean;
  valueText?: string;
  progress?: number;
  progressLabel?: string;
  category: CategoryKey | 'streak';
  unlockedAt?: string;
}

export function AchievementsScreen() {
  const { t, exerciseName, categoryLabel, unitLabel, language, dateLocale } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const gender = useProfileStore((s) => s.profile.gender);
  const sets = useWorkoutStore((s) => s.sets);
  const unlockedSlugs = useWorkoutStore((s) => s.unlockedAchievementSlugs);
  const unlockedAt = useWorkoutStore((s) => s.unlockedAt);
  const personalBestFor = useWorkoutStore((s) => s.personalBestFor);
  const streakDays = useMemo(() => currentStreakDays(sets), [sets]);

  function formatDate(iso?: string): string | undefined {
    if (!iso) return undefined;
    return new Date(iso).toLocaleDateString(dateLocale(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const rows: Row[] = useMemo(() => {
    if (!gender) return [];

    const unlocked = ACHIEVEMENTS.filter(
      (a) => a.gender === gender && unlockedSlugs.includes(a.slug)
    ).map<Row>((a) => {
      const unit = unitLabel(unitKeyFor(getExercise(a.exerciseSlug).metric));
      return {
        key: a.slug,
        title: `${exerciseName(a.exerciseSlug)} ${a.threshold} ${unit}`,
        subtitle: exerciseName(a.exerciseSlug),
        unlocked: true,
        valueText: `${a.threshold} ${unit}`,
        category: getExercise(a.exerciseSlug).category,
        unlockedAt: unlockedAt[a.slug],
      };
    });

    const unlockedStreaks = STREAK_ACHIEVEMENTS.filter((a) =>
      unlockedSlugs.includes(a.slug)
    ).map<Row>((a) => ({
      key: a.slug,
      title: STREAK_ACHIEVEMENT_TEXT[language][a.slug].title,
      subtitle: STREAK_ACHIEVEMENT_TEXT[language][a.slug].subtitle,
      unlocked: true,
      valueText: `${a.thresholdDays} ${t('workout.dayStreak')}`,
      category: 'streak',
      unlockedAt: unlockedAt[a.slug],
    }));

    const nextPerExercise = EXERCISES.map((ex) => {
      const best = personalBestFor(ex.slug);
      const next = getNextAchievementFor(ex.slug, gender, best);
      if (!next || unlockedSlugs.includes(next.slug)) return null;
      const progress = best / next.threshold;
      const unit = unitLabel(unitKeyFor(ex.metric));
      return {
        key: next.slug,
        title: `${exerciseName(ex.slug)} ${next.threshold} ${unit}`,
        subtitle: exerciseName(ex.slug),
        unlocked: false,
        progress,
        progressLabel: t('achievements.percentComplete', { pct: Math.round(progress * 100) }),
        category: ex.category,
      } as Row;
    }).filter((r): r is Row => r !== null);

    const nextStreak = getNextStreakAchievement(streakDays);
    const nextStreakRow: Row[] =
      nextStreak && !unlockedSlugs.includes(nextStreak.slug)
        ? [
            {
              key: nextStreak.slug,
              title: STREAK_ACHIEVEMENT_TEXT[language][nextStreak.slug].title,
              subtitle: STREAK_ACHIEVEMENT_TEXT[language][nextStreak.slug].subtitle,
              unlocked: false,
              progress: streakDays / nextStreak.thresholdDays,
              progressLabel: t('achievements.percentComplete', {
                pct: Math.round((streakDays / nextStreak.thresholdDays) * 100),
              }),
              category: 'streak',
            },
          ]
        : [];

    return [...unlocked, ...unlockedStreaks, ...nextPerExercise, ...nextStreakRow];
  }, [gender, unlockedSlugs, unlockedAt, personalBestFor, streakDays, exerciseName, unitLabel, language, t]);

  const sections = useMemo(() => {
    const byCategory = new Map<string, Row[]>();
    for (const row of rows) {
      const list = byCategory.get(row.category) ?? [];
      list.push(row);
      byCategory.set(row.category, list);
    }
    const order: (CategoryKey | 'streak')[] = [...CATEGORY_ORDER, 'streak'];
    return order
      .filter((c) => byCategory.has(c))
      .map((c) => ({
        title: c === 'streak' ? t('achievements.streakCategory') : categoryLabel(c),
        data: byCategory.get(c)!,
      }));
  }, [rows, t, categoryLabel]);

  const unlockedCount =
    ACHIEVEMENTS.filter((a) => unlockedSlugs.includes(a.slug)).length +
    STREAK_ACHIEVEMENTS.filter((a) => unlockedSlugs.includes(a.slug)).length;

  if (!gender) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <AppHeader />
        <Text style={styles.emptyText}>{t('achievements.setGenderPrompt')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            <AppHeader />
            <View style={styles.section}>
              <View style={styles.topRow}>
                <Text style={styles.eyebrow}>{t('achievements.yourProgress')}</Text>
                <StatusPill label={t('achievements.season')} dot={false} />
              </View>
              <Text style={styles.title}>{t('achievements.title')}</Text>
              <View style={styles.subtitleRow}>
                <Text style={styles.subtitle}>{t('achievements.subtitle')}</Text>
                <View style={styles.unlockedCol}>
                  <Text style={styles.unlockedCount}>{String(unlockedCount).padStart(2, '0')}</Text>
                  <Text style={styles.unlockedLabel}>{t('achievements.unlocked')}</Text>
                </View>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <Text style={styles.categoryHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <AchievementCard
            title={item.title}
            subtitle={item.subtitle}
            unlocked={item.unlocked}
            valueText={item.valueText}
            progress={item.progress}
            progressLabel={item.progressLabel}
            unlockedDateText={formatDate(item.unlockedAt)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 20 }} />}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.foreground, fontSize: 40, fontFamily: fonts.display, marginTop: 4 },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, flex: 1 },
  unlockedCol: { alignItems: 'flex-end' },
  unlockedCount: { color: colors.orange, fontSize: 26, fontFamily: fonts.display },
  unlockedLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  categoryHeader: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
