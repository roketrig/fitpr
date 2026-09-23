import { Minus, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { CATEGORY_ORDER, EXERCISES, getExercise } from '../constants/exercises';
import { useT } from '../i18n/useT';
import { useAuthStore } from '../store/authStore';
import { useProgramStore } from '../store/programStore';
import { colors, fonts } from '../theme';
import { CategoryKey, DayOfWeek, ExerciseSlug } from '../types';

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]; // display Monday-first

export function ProgramScreen() {
  const { t, exerciseName, categoryLabel, weekdayShort, weekdayFull } = useT();
  const todayIndex = new Date().getDay() as DayOfWeek;
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayIndex);
  const [pickerOpen, setPickerOpen] = useState(false);

  const authUserId = useAuthStore((s) => s.session?.user.id);
  useEffect(() => {
    if (authUserId) useProgramStore.getState().refreshFromRemote(authUserId);
  }, [authUserId]);

  const dayExercises = useProgramStore((s) => s.getDay(selectedDay));
  const addExerciseToDay = useProgramStore((s) => s.addExerciseToDay);
  const removeExerciseFromDay = useProgramStore((s) => s.removeExerciseFromDay);
  const updateExerciseTarget = useProgramStore((s) => s.updateExerciseTarget);

  const assignedSlugs = new Set(dayExercises.map((e) => e.exerciseSlug));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppHeader />

        <View style={styles.section}>
          <Text style={styles.eyebrow}>{t('program.subtitle')}</Text>
          <Text style={styles.title}>{t('program.title')}</Text>
        </View>

        <View style={styles.dayRow}>
          {DAYS.map((day) => {
            const active = day === selectedDay;
            const isToday = day === todayIndex;
            return (
              <Pressable
                key={day}
                style={[styles.dayPill, active && styles.dayPillActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                  {weekdayShort(day)}
                </Text>
                {isToday && <View style={[styles.todayDot, active && styles.todayDotActive]} />}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.selectedDayLabel}>{weekdayFull(selectedDay)}</Text>

          {dayExercises.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('program.emptyDay')}</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {dayExercises.map((entry) => {
                const ex = getExercise(entry.exerciseSlug);
                return (
                  <View key={entry.exerciseSlug} style={styles.exerciseCard}>
                    <View style={styles.exerciseCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseCardTitle}>{exerciseName(entry.exerciseSlug)}</Text>
                        <Text style={styles.exerciseCardCategory}>{categoryLabel(ex.category)}</Text>
                      </View>
                      <Pressable
                        onPress={() => removeExerciseFromDay(selectedDay, entry.exerciseSlug)}
                        style={styles.removeButton}
                        accessibilityLabel={`Remove ${exerciseName(entry.exerciseSlug)}`}
                      >
                        <Trash2 size={16} color={colors.orange} />
                      </Pressable>
                    </View>

                    <View style={styles.targetRow}>
                      <TargetStepper
                        label={t('program.setsLabel')}
                        value={entry.targetSets}
                        onDecrement={() =>
                          updateExerciseTarget(selectedDay, entry.exerciseSlug, {
                            targetSets: Math.max(1, entry.targetSets - 1),
                          })
                        }
                        onIncrement={() =>
                          updateExerciseTarget(selectedDay, entry.exerciseSlug, {
                            targetSets: entry.targetSets + 1,
                          })
                        }
                      />
                      <TargetStepper
                        label={ex.metric === 'time_seconds' ? t('program.secondsLabel') : t('program.repsLabel')}
                        value={entry.targetReps}
                        onDecrement={() =>
                          updateExerciseTarget(selectedDay, entry.exerciseSlug, {
                            targetReps: Math.max(1, entry.targetReps - (ex.metric === 'time_seconds' ? 5 : 1)),
                          })
                        }
                        onIncrement={() =>
                          updateExerciseTarget(selectedDay, entry.exerciseSlug, {
                            targetReps: entry.targetReps + (ex.metric === 'time_seconds' ? 5 : 1),
                          })
                        }
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable style={styles.addButton} onPress={() => setPickerOpen(true)}>
            <Plus size={18} color={colors.background} strokeWidth={3} />
            <Text style={styles.addButtonText}>{t('program.addExercise')}</Text>
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {pickerOpen && (
        <View style={styles.pickerOverlay}>
          <SafeAreaView style={styles.pickerSafe} edges={['top', 'left', 'right']}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('program.pickExercise')}</Text>
              <Pressable onPress={() => setPickerOpen(false)} style={styles.pickerClose}>
                <X size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <FlatList
              data={CATEGORY_ORDER as readonly CategoryKey[]}
              keyExtractor={(c) => c}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item: category }) => (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.pickerCategory}>{categoryLabel(category)}</Text>
                  {EXERCISES.filter((e) => e.category === category).map((ex) => {
                    const added = assignedSlugs.has(ex.slug);
                    return (
                      <Pressable
                        key={ex.slug}
                        style={[styles.pickerRow, added && styles.pickerRowAdded]}
                        onPress={() => !added && addExerciseToDay(selectedDay, ex.slug)}
                        disabled={added}
                      >
                        <Text style={[styles.pickerRowText, added && styles.pickerRowTextAdded]}>
                          {exerciseName(ex.slug)}
                        </Text>
                        {added ? (
                          <Text style={styles.pickerAddedLabel}>✓</Text>
                        ) : (
                          <Plus size={16} color={colors.lime} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
            <Pressable style={styles.doneButton} onPress={() => setPickerOpen(false)}>
              <Text style={styles.doneButtonText}>{t('program.done')}</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

function TargetStepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={styles.targetStepper}>
      <Text style={styles.targetLabel}>{label}</Text>
      <View style={styles.targetControls}>
        <Pressable onPress={onDecrement} style={styles.targetButton} accessibilityLabel={`Decrease ${label}`}>
          <Minus size={14} color={colors.lime} strokeWidth={3} />
        </Pressable>
        <Text style={styles.targetValue}>{value}</Text>
        <Pressable onPress={onIncrement} style={styles.targetButton} accessibilityLabel={`Increase ${label}`}>
          <Plus size={14} color={colors.lime} strokeWidth={3} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.foreground, fontSize: 36, fontFamily: fonts.display, marginTop: 4 },
  dayRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  dayPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dayPillActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  dayPillText: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  dayPillTextActive: { color: colors.background },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.orange,
    marginTop: 4,
  },
  todayDotActive: { backgroundColor: colors.background },
  selectedDayLabel: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: colors.muted, textAlign: 'center' },
  exerciseCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  exerciseCardHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseCardTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  exerciseCardCategory: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  removeButton: { padding: 8 },
  targetRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  targetStepper: { flex: 1, backgroundColor: colors.panel, borderRadius: 10, padding: 10, alignItems: 'center' },
  targetLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  targetControls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  targetButton: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  targetValue: { color: colors.foreground, fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  addButtonText: { color: colors.background, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  pickerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
  },
  pickerSafe: { flex: 1 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pickerTitle: { color: colors.foreground, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  pickerClose: { padding: 8 },
  pickerCategory: { color: colors.lime, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pickerRowAdded: { opacity: 0.4 },
  pickerRowText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  pickerRowTextAdded: { color: colors.muted },
  pickerAddedLabel: { color: colors.lime, fontWeight: '800' },
  doneButton: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  doneButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
