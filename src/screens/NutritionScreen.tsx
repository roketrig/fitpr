import { Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddFoodOverlay } from '../components/AddFoodOverlay';
import { AppHeader } from '../components/AppHeader';
import { useT } from '../i18n/useT';
import { becomePT } from '../lib/coaching';
import { useAuthStore } from '../store/authStore';
import { useCoachStore } from '../store/coachStore';
import { useFoodLogStore } from '../store/foodLogStore';
import { useProfileStore } from '../store/profileStore';
import { colors, fonts } from '../theme';

const COACH_DASHBOARD_URL = 'https://fitpr.vercel.app';

export function NutritionScreen() {
  const { t } = useT();
  const session = useAuthStore((s) => s.session);
  const profile = useProfileStore((s) => s.profile);
  const setRoleAndReferralCode = useProfileStore((s) => s.setRoleAndReferralCode);

  const coach = useCoachStore((s) => s.coach);
  const nutritionTarget = useCoachStore((s) => s.nutritionTarget);
  const linking = useCoachStore((s) => s.linking);
  const linkError = useCoachStore((s) => s.linkError);
  const linkToCoach = useCoachStore((s) => s.linkToCoach);
  const refreshCoach = useCoachStore((s) => s.refresh);

  const entries = useFoodLogStore((s) => s.todaysEntries);
  const removeEntry = useFoodLogStore((s) => s.removeEntry);
  const addEntry = useFoodLogStore((s) => s.addEntry);
  const refreshToday = useFoodLogStore((s) => s.refreshToday);

  const [codeInput, setCodeInput] = useState('');
  const [becomingPt, setBecomingPt] = useState(false);
  const [addFoodOpen, setAddFoodOpen] = useState(false);

  useEffect(() => {
    if (session) {
      refreshCoach();
      refreshToday();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({ calories: acc.calories + e.calories, proteinG: acc.proteinG + e.proteinG }),
        { calories: 0, proteinG: 0 }
      ),
    [entries]
  );

  async function handleBecomePt() {
    setBecomingPt(true);
    try {
      const code = await becomePT();
      setRoleAndReferralCode('pt', code);
    } catch (e) {
      console.warn('Failed to become a trainer', e);
    } finally {
      setBecomingPt(false);
    }
  }

  async function handleLinkToCoach() {
    if (!codeInput.trim()) return;
    await linkToCoach(codeInput.trim());
    setCodeInput('');
  }

  const hasTarget = nutritionTarget && (nutritionTarget.calories || nutritionTarget.proteinG);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppHeader />

        <View style={styles.section}>
          <Text style={styles.eyebrow}>{t('nutrition.subtitle')}</Text>
          <Text style={styles.title}>{t('nutrition.title')}</Text>
        </View>

        {session && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>{t('coach.title')}</Text>

          {profile.role === 'pt' ? (
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.label}>{t('coach.yourCode')}</Text>
              <Text style={styles.referralCode}>{profile.referralCode}</Text>
              {Platform.OS !== 'web' && (
                <View style={styles.webHintRow}>
                  <Text style={styles.hint}>{t('coach.webHint')}</Text>
                  <Pressable onPress={() => Linking.openURL(COACH_DASHBOARD_URL)}>
                    <Text style={styles.webLink}>fitpr.vercel.app</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : coach ? (
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.label}>{t('coach.linked')}</Text>
              <Text style={styles.coachName}>{coach.displayName}</Text>
            </View>
          ) : (
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.label}>{t('coach.linkTitle')}</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex1]}
                  value={codeInput}
                  onChangeText={(v) => setCodeInput(v.toUpperCase())}
                  placeholder={t('coach.codePlaceholder')}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                />
                <Pressable
                  style={[styles.linkButton, linking && styles.disabled]}
                  onPress={handleLinkToCoach}
                  disabled={linking}
                >
                  {linking ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={styles.linkButtonText}>{t('coach.link')}</Text>
                  )}
                </Pressable>
              </View>
              {linkError && <Text style={styles.error}>{linkError}</Text>}

              <Pressable
                style={[styles.becomePtButton, becomingPt && styles.disabled]}
                onPress={handleBecomePt}
                disabled={becomingPt}
              >
                {becomingPt ? (
                  <ActivityIndicator color={colors.lime} />
                ) : (
                  <Text style={styles.becomePtButtonText}>{t('coach.becomePt')}</Text>
                )}
              </Pressable>
              <Text style={styles.hint}>{t('coach.becomePtHint')}</Text>
            </View>
          )}
        </View>
        )}

        <View style={styles.section}>
          {hasTarget ? (
            <View style={styles.progressRow}>
              <ProgressStat
                label={t('nutrition.calories')}
                value={totals.calories}
                target={nutritionTarget!.calories}
              />
              <ProgressStat
                label={t('nutrition.protein')}
                value={totals.proteinG}
                target={nutritionTarget!.proteinG}
                unit="g"
              />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.hint}>{t('nutrition.noTargetSet')}</Text>
              <View style={styles.row}>
                <View style={[styles.flex1, styles.simpleStat]}>
                  <Text style={styles.simpleStatValue}>{totals.calories}</Text>
                  <Text style={styles.simpleStatLabel}>{t('nutrition.calories')}</Text>
                </View>
                <View style={[styles.flex1, styles.simpleStat]}>
                  <Text style={styles.simpleStatValue}>{totals.proteinG}g</Text>
                  <Text style={styles.simpleStatLabel}>{t('nutrition.protein')}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>{t('nutrition.todaysLog')}</Text>
          {entries.length === 0 ? (
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.hint}>{t('nutrition.emptyLog')}</Text>
            </View>
          ) : (
            <View style={{ marginTop: 12, gap: 8 }}>
              {entries.map((entry) => (
                <View key={entry.id} style={styles.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logLabel}>{entry.label}</Text>
                    <Text style={styles.logMacros}>
                      {entry.calories} kcal · {entry.proteinG}g {t('coach.protein').toLowerCase()}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeEntry(entry.id)} style={styles.removeButton}>
                    <Trash2 size={16} color={colors.orange} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.addButton} onPress={() => setAddFoodOpen(true)}>
            <Text style={styles.addButtonText}>{t('nutrition.addFood')}</Text>
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {addFoodOpen && (
        <AddFoodOverlay onClose={() => setAddFoodOpen(false)} onAdd={addEntry} />
      )}
    </SafeAreaView>
  );
}

function ProgressStat({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number | null;
  unit?: string;
}) {
  const pct = target && target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View style={styles.progressCard}>
      <Text style={styles.progressLabel}>{label}</Text>
      <Text style={styles.progressValue}>
        {value}
        {unit}
        {target ? <Text style={styles.progressTarget}> / {target}{unit}</Text> : null}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.foreground, fontSize: 40, fontFamily: fonts.display, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  referralCode: { color: colors.lime, fontSize: 32, fontFamily: fonts.display, letterSpacing: 4, marginTop: 4 },
  coachName: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 17 },
  webHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  webLink: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  flex1: { flex: 1 },
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
  linkButton: {
    backgroundColor: colors.lime,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButtonText: { color: colors.background, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.7 },
  error: { color: colors.orange, fontSize: 12, fontWeight: '600', marginTop: 10 },
  becomePtButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  becomePtButtonText: { color: colors.lime, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  progressRow: { flexDirection: 'row', gap: 12 },
  progressCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  progressLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  progressValue: { color: colors.foreground, fontSize: 22, fontFamily: fonts.display, marginTop: 6 },
  progressTarget: { color: colors.muted, fontSize: 13, fontFamily: undefined },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.panel,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.lime, borderRadius: 3 },
  simpleStat: { alignItems: 'center', backgroundColor: colors.panel, borderRadius: 12, paddingVertical: 14 },
  simpleStatValue: { color: colors.foreground, fontSize: 20, fontFamily: fonts.display },
  simpleStatLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logLabel: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  logMacros: { color: colors.muted, fontSize: 12, marginTop: 2 },
  removeButton: { padding: 8 },
  addButton: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  addButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
