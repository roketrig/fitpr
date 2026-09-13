import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, Check, Flame } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { ExerciseVisual } from '../components/ExerciseVisual';
import { NumberStepperCard } from '../components/NumberStepperCard';
import { PRCelebration } from '../components/PRCelebration';
import { StatRow } from '../components/StatRow';
import { StatusPill } from '../components/StatusPill';
import { EXERCISES, getExercise, SETS_PER_SESSION } from '../constants/exercises';
import { useT } from '../i18n/useT';
import { getValueStepConfig, unitKeyFor } from '../lib/metric';
import { currentStreakDays, sessionStatsFor, suggestedNextValue, trainingWeekNumber } from '../lib/stats';
import { useProfileStore } from '../store/profileStore';
import { useProgramStore } from '../store/programStore';
import { UnlockedBadge, useWorkoutStore } from '../store/workoutStore';
import { colors, fonts } from '../theme';
import { DayOfWeek, ExerciseSlug } from '../types';

const REPS_DEFAULT = 5;

export function WorkoutScreen() {
  const navigation = useNavigation();
  const { t, exerciseName, categoryLabel, unitLabel, dateLocale } = useT();

  const today = new Date().getDay() as DayOfWeek;
  const programToday = useProgramStore((s) => s.getDay(today));
  const isProgramMode = programToday.length > 0;
  // A day with a program only browses that day's exercises — mixing in the
  // full catalog defeats the point of having set up a program for today.
  const activeSlugs: ExerciseSlug[] = useMemo(() => {
    if (isProgramMode) return programToday.map((p) => p.exerciseSlug);
    return EXERCISES.map((e) => e.slug);
  }, [programToday, isProgramMode]);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const activeSlug = activeSlugs[Math.min(exerciseIndex, activeSlugs.length - 1)];
  const exercise = getExercise(activeSlug);
  const programEntry = programToday.find((p) => p.exerciseSlug === activeSlug);
  const targetSets = programEntry?.targetSets ?? SETS_PER_SESSION;
  const targetReps = programEntry?.targetReps ?? REPS_DEFAULT;
  const unit = unitKeyFor(exercise.metric);
  const stepConfig = getValueStepConfig(exercise);

  const [reps, setReps] = useState(targetReps);
  const [celebration, setCelebration] = useState<{ visible: boolean; badges: UnlockedBadge[] }>({
    visible: false,
    badges: [],
  });

  const cardAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    cardAnim.setValue(0);
    Animated.timing(cardAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [exerciseIndex, cardAnim]);

  const gender = useProfileStore((s) => s.profile.gender);
  const sets = useWorkoutStore((s) => s.sets);
  const addSet = useWorkoutStore((s) => s.addSet);
  const personalBestFor = useWorkoutStore((s) => s.personalBestFor);

  const personalBest = personalBestFor(activeSlug);
  const personalBestDate = useMemo(() => {
    const best = sets
      .filter((s) => s.exerciseSlug === activeSlug)
      .reduce<null | (typeof sets)[number]>(
        (max, s) => (!max || s.weightKg + s.reps >= max.weightKg + max.reps ? s : max),
        null
      );
    return best
      ? new Date(best.performedAt).toLocaleDateString(dateLocale(), {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;
  }, [sets, activeSlug, dateLocale]);
  const session = useMemo(() => sessionStatsFor(sets, activeSlug), [sets, activeSlug]);
  const streak = useMemo(() => currentStreakDays(sets), [sets]);
  const week = useMemo(() => trainingWeekNumber(sets), [sets]);

  const [weightKg, setWeightKg] = useState(() => suggestedNextValue(sets, activeSlug, personalBest));

  function selectExercise(nextIndex: number) {
    const wrapped = (nextIndex + activeSlugs.length) % activeSlugs.length;
    setExerciseIndex(wrapped);
    const nextSlug = activeSlugs[wrapped];
    const nextExercise = getExercise(nextSlug);
    const nextProgramEntry = programToday.find((p) => p.exerciseSlug === nextSlug);
    if (nextExercise.metric === 'weight_reps') {
      setWeightKg(suggestedNextValue(sets, nextSlug, personalBestFor(nextSlug)));
      setReps(nextProgramEntry?.targetReps ?? REPS_DEFAULT);
    } else {
      setReps(suggestedNextValue(sets, nextSlug, personalBestFor(nextSlug)));
    }
  }

  const currentValue = exercise.metric === 'weight_reps' ? weightKg : reps;
  const willBePr = currentValue > personalBest;
  const setsCompleted = Math.min(session.todaysSets.length, targetSets);

  function handleSave() {
    const { isPr, newBadges } = addSet(
      activeSlug,
      exercise.metric === 'weight_reps' ? weightKg : 0,
      reps,
      gender
    );
    if (isPr) {
      setCelebration({ visible: true, badges: newBadges });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppHeader />

        <View style={styles.section}>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>
              {new Date()
                .toLocaleDateString(dateLocale(), { weekday: 'long', month: 'long', day: 'numeric' })
                .toUpperCase()}
            </Text>
            <StatusPill label={t('workout.inProgress')} />
          </View>

          <Text style={styles.title}>{t('workout.logWorkout')}</Text>

          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>
              {isProgramMode ? t('workout.powerSession') : t('workout.freeSession')}{' '}
              <Text style={styles.subtitleDim}>/</Text> {t('workout.week')} {week}
            </Text>
            <View style={styles.streakRow}>
              <Flame size={18} color={colors.orange} fill={colors.orange} />
              <Text style={styles.streakValue}>{streak}</Text>
            </View>
          </View>
          <Text style={styles.streakLabel}>{t('workout.dayStreak')}</Text>

          {!isProgramMode && (
            <Pressable onPress={() => navigation.navigate('Program' as never)}>
              <Text style={styles.freeSessionHint}>
                {t('workout.noProgramToday')} {t('workout.editProgram')}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>{t('workout.chooseExercise')}</Text>
            <Text style={styles.cardLabelAccent}>
              {setsCompleted} / {targetSets} {t('workout.sets')}
            </Text>
          </View>

          <Animated.View
            style={{
              opacity: cardAnim,
              transform: [
                { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
              ],
            }}
          >
            <View style={styles.exerciseSwitcher}>
              <Pressable
                style={styles.chevronButton}
                onPress={() => selectExercise(exerciseIndex - 1)}
                accessibilityLabel="Previous exercise"
              >
                <ChevronLeft size={22} color={colors.foreground} />
              </Pressable>
              <Text style={styles.exerciseName}>{exerciseName(activeSlug)}</Text>
              <Pressable
                style={styles.chevronButton}
                onPress={() => selectExercise(exerciseIndex + 1)}
                accessibilityLabel="Next exercise"
              >
                <ChevronRight size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={styles.category}>{categoryLabel(exercise.category)}</Text>

            <ExerciseVisual
              exercise={exercise}
              weightKg={weightKg}
              reps={reps}
              label={t('workout.tapToLoad')}
            />
          </Animated.View>

          <View style={styles.divider} />

          <View style={styles.pbRow}>
            <Text style={styles.pbLabel}>{t('workout.personalBest')}</Text>
            <Text style={styles.pbValue}>
              {personalBest > 0 ? personalBest : '—'}
              {personalBest > 0 && <Text style={styles.pbUnit}> {unitLabel(unit)}</Text>}
            </Text>
            <Text style={styles.pbDate}>{personalBestDate ?? ''}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>
              {t('workout.logSet')} {setsCompleted + 1}
            </Text>
            <View style={styles.dotsRow}>
              {Array.from({ length: targetSets }).map((_, i) => (
                <View key={i} style={[styles.dot, i < setsCompleted && styles.dotFilled]} />
              ))}
            </View>
          </View>

          <View style={styles.stepperRow}>
            {exercise.metric === 'weight_reps' && (
              <NumberStepperCard
                label={t('workout.weight')}
                value={String(weightKg)}
                unit={t('workout.kg')}
                onDecrement={() => setWeightKg((w) => Math.max(stepConfig.min, w - stepConfig.step))}
                onIncrement={() => setWeightKg((w) => w + stepConfig.step)}
              />
            )}
            <NumberStepperCard
              label={exercise.metric === 'time_seconds' ? t('workout.seconds') : t('workout.reps')}
              value={String(reps)}
              unit={exercise.metric === 'time_seconds' ? t('workout.seconds') : t('workout.reps')}
              onDecrement={() =>
                setReps((r) =>
                  Math.max(
                    exercise.metric === 'time_seconds' ? 5 : 1,
                    r - (exercise.metric === 'time_seconds' ? 5 : 1)
                  )
                )
              }
              onIncrement={() =>
                setReps((r) => r + (exercise.metric === 'time_seconds' ? 5 : 1))
              }
            />
          </View>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Check size={18} color={colors.background} strokeWidth={3} />
            <Text style={styles.saveButtonText}>
              {willBePr ? t('workout.saveSetPr') : t('workout.saveSet')}
            </Text>
          </Pressable>
        </View>

        <StatRow
          stats={[
            { label: t('workout.sessionVolume'), value: `${session.sessionVolume} ${unitLabel(unit)}` },
            { label: t('workout.setsCompleted'), value: `${setsCompleted}/${targetSets}` },
            { label: t('workout.lastSession'), value: `${session.lastSessionVolume} ${unitLabel(unit)}` },
          ]}
        />

        <View style={{ height: 24 }} />
      </ScrollView>

      <PRCelebration
        visible={celebration.visible}
        newBadges={celebration.badges}
        onDone={() => setCelebration({ visible: false, badges: [] })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: {
    color: colors.foreground,
    fontSize: 44,
    fontFamily: fonts.display,
    marginTop: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  subtitleDim: { color: colors.border },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakValue: { color: colors.orange, fontSize: 26, fontFamily: fonts.display },
  streakLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'right',
  },
  freeSessionHint: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cardLabelAccent: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  exerciseSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  chevronButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '600',
    minWidth: 170,
    textAlign: 'center',
  },
  category: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 12 },
  pbRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pbLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, flex: 1 },
  pbValue: {
    color: colors.foreground,
    fontSize: 24,
    fontFamily: fonts.display,
    flex: 1,
    textAlign: 'center',
  },
  pbUnit: { fontSize: 12, color: colors.muted, fontFamily: undefined },
  pbDate: { flex: 1, color: colors.muted, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.muted },
  dotFilled: { backgroundColor: colors.lime, borderColor: colors.lime },
  stepperRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
  },
  saveButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
