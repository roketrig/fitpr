import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FoodPhotoThumb } from '../../components/FoodPhotoThumb';
import { useT } from '../../i18n/useT';
import {
  fetchStudentFoodLog,
  fetchStudentNutritionTarget,
  fetchStudentProfile,
  setStudentNutritionTarget,
} from '../../lib/coaching';
import { Colors, useColors } from '../../theme';
import { FoodLogEntry, NutritionTarget } from '../../types';

function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function StudentNutritionTab({ studentId }: { studentId: string }) {
  const { t, dateLocale } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [target, setTarget] = useState<NutritionTarget>({ calories: null, proteinG: null });
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [shared, setShared] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<FoodLogEntry[] | null>(null);

  useEffect(() => {
    fetchStudentNutritionTarget(studentId).then(setTarget);
    fetchStudentProfile(studentId).then((p) => setShared(p?.shareFoodLog ?? false));
    fetchStudentFoodLog(studentId, 7).then(setEntries);
  }, [studentId]);

  async function handleSaveTarget() {
    setSaveError(false);
    try {
      await setStudentNutritionTarget(studentId, target);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch {
      setSaveError(true);
    }
  }

  const days = useMemo(() => {
    const byDay = new Map<string, FoodLogEntry[]>();
    for (const e of entries ?? []) {
      const key = dayKeyOf(e.loggedAt);
      byDay.set(key, [...(byDay.get(key) ?? []), e]);
    }
    return Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  function dayLabel(key: string): string {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(dateLocale(), {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <View style={{ gap: 18 }}>
      <View>
        <Text style={styles.sectionLabel}>{t('pt.nutrition')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>{t('coach.calories')}</Text>
              <TextInput
                style={styles.input}
                value={target.calories?.toString() ?? ''}
                onChangeText={(v) => setTarget((n) => ({ ...n, calories: v ? Number(v) : null }))}
                keyboardType="numeric"
                placeholder="2200"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>{t('coach.protein')}</Text>
              <TextInput
                style={styles.input}
                value={target.proteinG?.toString() ?? ''}
                onChangeText={(v) => setTarget((n) => ({ ...n, proteinG: v ? Number(v) : null }))}
                keyboardType="numeric"
                placeholder="160"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>
          <Pressable style={styles.saveButton} onPress={handleSaveTarget}>
            <Text style={styles.saveButtonText}>{savedFlash ? t('pt.saved') : t('pt.save')}</Text>
          </Pressable>
          {saveError && <Text style={styles.error}>{t('pt.saveError')}</Text>}
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>{t('pt.foodLog')}</Text>
        {entries === null || shared === null ? (
          <ActivityIndicator color={colors.lime} style={{ marginTop: 12 }} />
        ) : !shared ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>{t('pt.foodNotSharedTitle')}</Text>
            <Text style={styles.empty}>{t('pt.foodNotShared')}</Text>
          </View>
        ) : days.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>{t('pt.foodEmpty')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {days.map(([key, dayEntries]) => {
              const calories = dayEntries.reduce((sum, e) => sum + e.calories, 0);
              const protein = dayEntries.reduce((sum, e) => sum + e.proteinG, 0);
              return (
                <View key={key} style={styles.card}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>{dayLabel(key)}</Text>
                    <Text style={styles.dayTotals}>
                      {calories}
                      {target.calories ? ` / ${target.calories}` : ''} kcal · {protein}
                      {target.proteinG ? ` / ${target.proteinG}` : ''}g
                    </Text>
                  </View>
                  {dayEntries.map((e) => (
                    <View key={e.id} style={styles.entryRow}>
                      {e.photoPath && <FoodPhotoThumb path={e.photoPath} size={44} />}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryLabel}>{e.label}</Text>
                        <Text style={styles.entryMacros}>
                          {e.calories} kcal · {e.proteinG}g {t('coach.protein').toLowerCase()}
                        </Text>
                      </View>
                      <Text style={styles.entryTime}>
                        {new Date(e.loggedAt).toLocaleTimeString(dateLocale(), {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  saveButtonText: { color: colors.background, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  error: { color: colors.orange, fontSize: 12, fontWeight: '600', marginTop: 10 },
  emptyTitle: { color: colors.foreground, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  empty: { color: colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 6 },
  dayHeader: { marginBottom: 8 },
  dayTitle: { color: colors.foreground, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' },
  dayTotals: { color: colors.lime, fontSize: 12, fontWeight: '700', marginTop: 3 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  entryLabel: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  entryMacros: { color: colors.muted, fontSize: 12, marginTop: 2 },
  entryTime: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
