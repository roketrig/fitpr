import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, Check, Flame } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { ExerciseDemoButton } from '../components/ExerciseDemoButton';
import { ExerciseVisual } from '../components/ExerciseVisual';
import { NumberStepperCard } from '../components/NumberStepperCard';
import { PRCelebration } from '../components/PRCelebration';
import { StatRow } from '../components/StatRow';
import { StatusPill } from '../components/StatusPill';
import { EXERCISES, getExercise, SETS_PER_SESSION } from '../constants/exercises';
import { useT } from '../i18n/useT';
import { getValueStepConfig, unitKeyFor } from '../lib/metric';
import { currentStreakDays, sessionStatsFor, suggestedNextValue, trainingWeekNumber } from '../lib/stats';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useProgramStore } from '../store/programStore';
import { useSettingsStore } from '../store/settingsStore';
import { UnlockedBadge, useWorkoutStore } from '../store/workoutStore';
import { Colors, fonts, useColors } from '../theme';
import { DayOfWeek, ExerciseSlug } from '../types';

const REPS_DEFAULT = 5;

export function WorkoutScreen() {
  const navigation = useNavigation();
  const { t, exerciseName, categoryLabel, unitLabel, dateLocale } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const displayName = useProfileStore((s) => s.profile.displayName);
  const workoutViewMode = useSettingsStore((s) => s.workoutViewMode);
  const authUserId = useAuthStore((s) => s.session?.user.id);
  useEffect(() => {
    if (authUserId) useProgramStore.getState().refreshFromRemote(authUserId);
  }, [authUserId]);

  const today = new Date().getDay() as DayOfWeek;
  const programToday = useProgramStore((s) => s.getDay(today));
  const isProgramMode = programToday.length > 0;
  // Without a program for today there's nothing to log against — browsing
  // the entire 70-exercise catalog as a fallback was confusing, so this is
  // just empty and the screen shows a prompt to build today's program
  // instead (see the isProgramMode branch below).
  const activeSlugs: ExerciseSlug[] = useMemo(() => {
    if (isProgramMode) return programToday.map((p) => p.exerciseSlug);
    return [];
  }, [programToday, isProgramMode]);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  // Falls back to a real exercise even when activeSlugs is empty, purely so
  // the hooks below always have something valid to compute against — the
  // fallback is never actually shown, since the whole exercise UI is
  // hidden whenever isProgramMode is false.
  const activeSlug = activeSlugs[Math.min(exerciseIndex, activeSlugs.length - 1)] ?? EXERCISES[0].slug;
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
    if (activeSlugs.length === 0) return;
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

  const allDoneToday = useMemo(
    () =>
      isProgramMode &&
      programToday.every((p) => sessionStatsFor(sets, p.exerciseSlug).todaysSets.length >= p.targetSets),
    [isProgramMode, programToday, sets]
  );

  const listRows = useMemo(
    () =>
      activeSlugs.map((slug) => {
        const ex = getExercise(slug);
        const programEntry = programToday.find((p) => p.exerciseSlug === slug);
        const target = programEntry?.targetSets ?? SETS_PER_SESSION;
        const completed = Math.min(sessionStatsFor(sets, slug).todaysSets.length, target);
        return { slug, category: ex.category, completed, target };
      }),
    [activeSlugs, programToday, sets]
  );

  const selectExerciseRef = useRef(selectExercise);
  selectExerciseRef.current = selectExercise;
  const exerciseIndexRef = useRef(exerciseIndex);
  exerciseIndexRef.current = exerciseIndex;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -40) selectExerciseRef.current(exerciseIndexRef.current + 1);
        else if (gesture.dx >= 40) selectExerciseRef.current(exerciseIndexRef.current - 1);
      },
    })
  ).current;

  const saveScale = useRef(new Animated.Value(1)).current;
  function handleSavePressIn() {
    Animated.spring(saveScale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  }
  function handleSavePressOut() {
    Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }).start();
  }

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
            <StatusPill
              label={isProgramMode ? t('workout.inProgress') : t('workout.restDay')}
              color={isProgramMode ? colors.lime : colors.muted}
            />
          </View>

          <Text style={styles.title}>
            {displayName ? t('workout.greeting', { name: displayName }) : t('workout.logWorkout')}
          </Text>

          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>
              {isProgramMode
                ? t('workout.exerciseCount', { count: programToday.length })
                : t('workout.noProgramShort')}{' '}
              <Text style={styles.subtitleDim}>/</Text> {t('workout.week')} {week}
            </Text>
            <View style={styles.streakRow}>
              <Flame size={18} color={colors.orange} fill={colors.orange} />
              <Text style={styles.streakValue}>{streak}</Text>
            </View>
          </View>
          <Text style={styles.streakLabel}>{t('workout.dayStreak')}</Text>

          {allDoneToday && (
            <View style={styles.doneBanner}>
              <Check size={16} color={colors.background} strokeWidth={3} />
              <Text style={styles.doneBannerText}>{t('workout.allDoneToday')}</Text>
            </View>
          )}
        </View>

        {!isProgramMode ? (
          <View style={styles.card}>
            <Text style={styles.emptyProgramText}>{t('workout.emptyProgramPrompt')}</Text>
            <Pressable
              style={styles.addExerciseButton}
              onPress={() => navigation.navigate('Program' as never)}
            >
              <Text style={styles.addExerciseButtonText}>{t('workout.goToProgram')}</Text>
            </Pressable>
          </View>
        ) : (
        <>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>{t('workout.chooseExercise')}</Text>
            <Text style={styles.cardLabelAccent}>
              {setsCompleted} / {targetSets} {t('workout.sets')}
            </Text>
          </View>

          {workoutViewMode === 'list' ? (
            <View style={styles.exerciseList}>
              {listRows.map((row, i) => {
                const active = i === exerciseIndex;
                return (
                  <Pressable
                    key={row.slug}
                    style={[styles.listRow, active && styles.listRowActive]}
                    onPress={() => selectExercise(i)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listRowName, active && styles.listRowNameActive]}>
                        {exerciseName(row.slug)}
                      </Text>
                      <Text style={styles.listRowCategory}>{categoryLabel(row.category)}</Text>
                    </View>
                    <Text style={[styles.listRowProgress, active && styles.listRowProgressActive]}>
                      {row.completed}/{row.target}
                    </Text>
                  </Pressable>
                );
              })}
              <ExerciseDemoButton slug={activeSlug} />
            </View>
          ) : (
            <Animated.View
              {...panResponder.panHandlers}
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
              <ExerciseDemoButton slug={activeSlug} />

              <ExerciseVisual
                exercise={exercise}
                weightKg={weightKg}
                reps={reps}
                label={t('workout.tapToLoad')}
              />
            </Animated.View>
          )}

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
          </View>

          <View style={styles.progressRow}>
            {Array.from({ length: targetSets }).map((_, i) => (
              <View key={i} style={styles.progressTrack}>
                {i < setsCompleted && <View style={styles.progressFill} />}
              </View>
            ))}
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

          <Pressable onPress={handleSave} onPressIn={handleSavePressIn} onPressOut={handleSavePressOut}>
            <Animated.View style={[styles.saveButton, { transform: [{ scale: saveScale }] }]}>
              <Check size={18} color={colors.background} strokeWidth={3} />
              <Text style={styles.saveButtonText}>
                {willBePr ? t('workout.saveSetPr') : t('workout.saveSet')}
              </Text>
            </Animated.View>
          </Pressable>
        </View>

        <StatRow
          stats={[
            { label: t('workout.sessionVolume'), value: `${session.sessionVolume} ${unitLabel(unit)}` },
            { label: t('workout.setsCompleted'), value: `${setsCompleted}/${targetSets}` },
            { label: t('workout.lastSession'), value: `${session.lastSessionVolume} ${unitLabel(unit)}` },
          ]}
        />
        </>
        )}

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

const makeStyles = (colors: Colors) => StyleSheet.create({
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
  emptyProgramText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  addExerciseButton: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  addExerciseButtonText: { color: colors.background, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  doneBannerText: { color: colors.background, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
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
  exerciseList: { marginTop: 16, gap: 8 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listRowActive: { borderColor: colors.lime, backgroundColor: colors.card },
  listRowName: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  listRowNameActive: { color: colors.lime },
  listRowCategory: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  listRowProgress: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  listRowProgressActive: { color: colors.lime },
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
  progressRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { flex: 1, backgroundColor: colors.lime, borderRadius: 4 },
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
