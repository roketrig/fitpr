import { useFocusEffect } from '@react-navigation/native';
import { Camera } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { AuthOverlay } from '../components/AuthOverlay';
import { DeleteAccountOverlay } from '../components/DeleteAccountOverlay';
import { PTSubscriptionCard } from '../components/PTSubscriptionCard';
import { StatRow } from '../components/StatRow';
import { StatusPill } from '../components/StatusPill';
import { WeeklyVolumeChart } from '../components/WeeklyVolumeChart';
import { CATEGORY_ORDER, EXERCISES } from '../constants/exercises';
import { useT } from '../i18n/useT';
import { fetchMyCheckinDay, fetchMyCheckins, submitCheckin } from '../lib/coaching';
import { getPublicImageUrl, getSignedImageUrl, pickImage, uploadImage } from '../lib/media';
import { supabase } from '../lib/supabase';
import { unitKeyFor } from '../lib/metric';
import {
  averageSessionVolumeKg,
  currentStreakDays,
  longestStreakDays,
  mostTrainedExercise,
  setsInCurrentMonth,
  statsForCurrentMonth,
  totalVolumeKg,
  trainingDayKeys,
  weeklyVolumeSeries,
} from '../lib/stats';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeStore } from '../store/themeStore';
import { useWorkoutStore } from '../store/workoutStore';
import { Colors, PALETTES, fonts, useColors } from '../theme';
import { CategoryKey, CheckinSubmission, DayOfWeek, Language } from '../types';

export function ProfileScreen() {
  const { t, exerciseName, categoryLabel, unitLabel, weekdayFull } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const profile = useProfileStore((s) => s.profile);
  const setDisplayName = useProfileStore((s) => s.setDisplayName);
  const setGender = useProfileStore((s) => s.setGender);
  const setHeightCm = useProfileStore((s) => s.setHeightCm);
  const setWeightKg = useProfileStore((s) => s.setWeightKg);
  const setAvatarUrl = useProfileStore((s) => s.setAvatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const workoutViewMode = useSettingsStore((s) => s.workoutViewMode);
  const setWorkoutViewMode = useSettingsStore((s) => s.setWorkoutViewMode);
  const paletteId = useThemeStore((s) => s.paletteId);
  const setPaletteId = useThemeStore((s) => s.setPaletteId);

  const sets = useWorkoutStore((s) => s.sets);
  const personalBestFor = useWorkoutStore((s) => s.personalBestFor);

  const session = useAuthStore((s) => s.session);
  const [authOpen, setAuthOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [statsPeriod, setStatsPeriod] = useState<'all' | 'month'>('all');

  const allTimeStats = useMemo(
    () => ({
      workouts: trainingDayKeys(sets).length,
      totalKg: totalVolumeKg(sets),
      bestStreak: longestStreakDays(sets),
    }),
    [sets]
  );
  const monthStats = useMemo(() => statsForCurrentMonth(sets), [sets]);
  const stats =
    statsPeriod === 'month'
      ? { ...monthStats, bestStreak: allTimeStats.bestStreak }
      : allTimeStats;

  const periodSets = useMemo(
    () => (statsPeriod === 'month' ? setsInCurrentMonth(sets) : sets),
    [sets, statsPeriod]
  );
  const avgSessionVolume = useMemo(() => averageSessionVolumeKg(periodSets), [periodSets]);
  const topExercise = useMemo(() => mostTrainedExercise(periodSets), [periodSets]);
  const weeklyVolume = useMemo(() => weeklyVolumeSeries(sets, 8), [sets]);
  const liveStreak = useMemo(() => currentStreakDays(sets), [sets]);

  const initial = profile.displayName.trim().charAt(0).toUpperCase() || '?';

  const [checkinDay, setCheckinDayState] = useState<DayOfWeek | null>(null);
  const [checkins, setCheckins] = useState<CheckinSubmission[]>([]);
  const [checkinPhotoUri, setCheckinPhotoUri] = useState<string | null>(null);
  const [checkinWeight, setCheckinWeight] = useState('');
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);

  // Re-fetch on every visit so a newly set check-in day or a coach's comment
  // appears without restarting the app.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      fetchMyCheckinDay().then(setCheckinDayState);
      fetchMyCheckins().then(setCheckins);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user.id])
  );

  const latestCheckin = checkins[0] ?? null;
  const daysSinceLastCheckin = latestCheckin
    ? (Date.now() - new Date(latestCheckin.submittedAt).getTime()) / 86400000
    : Infinity;
  const showCheckinPrompt =
    checkinDay !== null && new Date().getDay() === checkinDay && daysSinceLastCheckin >= 6;

  function handlePickCheckinPhoto() {
    Alert.alert(t('profile.changePhoto'), undefined, [
      { text: t('profile.takePhoto'), onPress: async () => setCheckinPhotoUri(await pickImage('camera')) },
      { text: t('profile.chooseFromLibrary'), onPress: async () => setCheckinPhotoUri(await pickImage('library')) },
      { text: t('profile.cancel'), style: 'cancel' },
    ]);
  }

  async function handleSubmitCheckin() {
    if (!checkinPhotoUri || !session || checkinSubmitting) return;
    setCheckinSubmitting(true);
    try {
      const path = `${session.user.id}/${Date.now()}.jpg`;
      await uploadImage('checkin-photos', path, checkinPhotoUri);
      await submitCheckin(path, checkinWeight ? Number(checkinWeight) : null);
      setCheckinPhotoUri(null);
      setCheckinWeight('');
      setCheckins(await fetchMyCheckins());
    } catch (e) {
      console.warn('Check-in submit failed', e);
      Alert.alert(t('profile.photoUploadError'));
    } finally {
      setCheckinSubmitting(false);
    }
  }

  async function handleChangeAvatar() {
    if (!session) {
      setAuthOpen(true);
      return;
    }
    Alert.alert(t('profile.changePhoto'), undefined, [
      { text: t('profile.takePhoto'), onPress: () => runAvatarUpload('camera') },
      { text: t('profile.chooseFromLibrary'), onPress: () => runAvatarUpload('library') },
      { text: t('profile.cancel'), style: 'cancel' },
    ]);
  }

  async function runAvatarUpload(source: 'camera' | 'library') {
    const uri = await pickImage(source);
    if (!uri || !session) return;
    setAvatarUploading(true);
    try {
      const path = `${session.user.id}/avatar.jpg`;
      await uploadImage('avatars', path, uri);
      const url = `${getPublicImageUrl('avatars', path)}?t=${Date.now()}`;
      setAvatarUrl(url);
    } catch (e) {
      console.warn('Avatar upload failed', e);
      Alert.alert(t('profile.photoUploadError'));
    } finally {
      setAvatarUploading(false);
    }
  }

  function LanguageButton({ code, label }: { code: Language; label: string }) {
    const active = language === code;
    return (
      <Pressable
        style={[styles.genderButton, active && styles.genderButtonActive]}
        onPress={() => setLanguage(code)}
      >
        <Text style={[styles.genderButtonText, active && styles.genderButtonTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppHeader />

        <View style={styles.section}>
          <View style={styles.topRow}>
            <Text style={styles.eyebrow}>{t('profile.yourAccount')}</Text>
            <StatusPill
              label={session ? t('profile.synced') : t('profile.local')}
              color={session ? colors.lime : colors.muted}
            />
          </View>

          <View style={styles.identityRow}>
            <Pressable style={styles.avatarWrap} onPress={handleChangeAvatar}>
              <View style={[styles.avatar, !profile.avatarUrl && styles.avatarEmpty]}>
                {avatarUploading ? (
                  <ActivityIndicator color={colors.lime} />
                ) : profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
              </View>
              <View style={styles.avatarBadge}>
                <Camera size={13} color={colors.background} strokeWidth={2.5} />
              </View>
            </Pressable>
            <View style={styles.identityCol}>
              <Text style={styles.name}>{profile.displayName || t('profile.unnamedLifter')}</Text>
              <Text style={styles.memberSince} numberOfLines={1} ellipsizeMode="tail">
                {session ? session.user.email : t('profile.memberSince', { year: profile.memberSinceYear })}
              </Text>
            </View>
            <Pressable
              onPress={() => (session ? supabase.auth.signOut() : setAuthOpen(true))}
              style={[styles.signInButton, session ? styles.signOutButton : styles.signInButtonFilled]}
            >
              <Text
                style={[
                  styles.signInButtonText,
                  session ? styles.signOutButtonText : styles.signInButtonTextFilled,
                ]}
              >
                {session ? t('profile.signOut') : t('profile.signIn')}
              </Text>
            </Pressable>
          </View>

          {session && (
            <Pressable onPress={() => setDeleteOpen(true)} style={styles.deleteAccountLink}>
              <Text style={styles.deleteAccountLinkText}>{t('profile.deleteAccount')}</Text>
            </Pressable>
          )}
        </View>

        {authOpen && <AuthOverlay onClose={() => setAuthOpen(false)} />}
        {deleteOpen && (
          <DeleteAccountOverlay
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => setDeleteOpen(false)}
          />
        )}

        {session && profile.role === 'pt' && Platform.OS !== 'web' && (
          <View style={styles.section}>
            <Text style={styles.eyebrow}>{t('subscription.title')}</Text>
            <View style={{ marginTop: 12 }}>
              <PTSubscriptionCard />
            </View>
          </View>
        )}

        {session && checkinDay !== null && (
          <View style={styles.section}>
            <Text style={styles.eyebrow}>{t('profile.checkin')}</Text>
            <Text style={styles.checkinDayLabel}>
              {t('profile.checkinDayLabel', { day: weekdayFull(checkinDay) })}
            </Text>
            {showCheckinPrompt && (
              <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.checkinPromptTitle}>{t('profile.checkinDueToday')}</Text>
                <Pressable style={styles.checkinPhotoButton} onPress={handlePickCheckinPhoto}>
                  {checkinPhotoUri ? (
                    <Image source={{ uri: checkinPhotoUri }} style={styles.checkinPhotoPreview} />
                  ) : (
                    <Text style={styles.checkinPhotoButtonText}>{t('nutrition.addPhoto')}</Text>
                  )}
                </Pressable>
                <TextInput
                  style={[styles.input, { marginTop: 12 }]}
                  value={checkinWeight}
                  onChangeText={setCheckinWeight}
                  keyboardType="numeric"
                  placeholder={t('profile.weightKg')}
                  placeholderTextColor={colors.muted}
                />
                <Pressable
                  style={styles.checkinSubmitButton}
                  onPress={handleSubmitCheckin}
                  disabled={!checkinPhotoUri || checkinSubmitting}
                >
                  {checkinSubmitting ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={styles.checkinSubmitButtonText}>{t('profile.submitCheckin')}</Text>
                  )}
                </Pressable>
              </View>
            )}
            {checkins.length > 0 && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {checkins.slice(0, 5).map((c) => (
                  <CheckinHistoryRow key={c.id} checkin={c} />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>{t('profile.displayName')}</Text>
          <TextInput
            style={styles.input}
            value={profile.displayName}
            onChangeText={setDisplayName}
            placeholder={t('profile.namePlaceholder')}
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>{t('profile.gender')}</Text>
          <View style={styles.genderRow}>
            <Pressable
              style={[styles.genderButton, profile.gender === 'male' && styles.genderButtonActive]}
              onPress={() => setGender('male')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  profile.gender === 'male' && styles.genderButtonTextActive,
                ]}
              >
                {t('profile.male')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.genderButton, profile.gender === 'female' && styles.genderButtonActive]}
              onPress={() => setGender('female')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  profile.gender === 'female' && styles.genderButtonTextActive,
                ]}
              >
                {t('profile.female')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>{t('profile.heightCm')}</Text>
              <TextInput
                style={styles.input}
                value={profile.heightCm?.toString() ?? ''}
                onChangeText={(v) => setHeightCm(v ? Number(v) : null)}
                keyboardType="numeric"
                placeholder="180"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>{t('profile.weightKg')}</Text>
              <TextInput
                style={styles.input}
                value={profile.weightKg?.toString() ?? ''}
                onChangeText={(v) => setWeightKg(v ? Number(v) : null)}
                keyboardType="numeric"
                placeholder="80"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <Text style={styles.label}>{t('profile.language')}</Text>
          <View style={styles.genderRow}>
            <LanguageButton code="en" label="English" />
            <LanguageButton code="tr" label="Türkçe" />
          </View>

          <Text style={styles.label}>{t('profile.workoutView')}</Text>
          <View style={styles.genderRow}>
            <Pressable
              style={[styles.genderButton, workoutViewMode === 'carousel' && styles.genderButtonActive]}
              onPress={() => setWorkoutViewMode('carousel')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  workoutViewMode === 'carousel' && styles.genderButtonTextActive,
                ]}
              >
                {t('profile.workoutViewCarousel')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.genderButton, workoutViewMode === 'list' && styles.genderButtonActive]}
              onPress={() => setWorkoutViewMode('list')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  workoutViewMode === 'list' && styles.genderButtonTextActive,
                ]}
              >
                {t('profile.workoutViewList')}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>{t('profile.colorTheme')}</Text>
          <View style={styles.paletteRow}>
            {PALETTES.map((p) => {
              const active = p.id === paletteId;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.paletteSwatch, active && styles.paletteSwatchActive]}
                  onPress={() => setPaletteId(p.id)}
                  accessibilityLabel={t(p.nameKey as never)}
                >
                  <View style={styles.paletteDotRow}>
                    <View style={[styles.paletteDot, { backgroundColor: p.lime }]} />
                    <View style={[styles.paletteDot, { backgroundColor: p.orange }]} />
                  </View>
                  <Text style={[styles.paletteLabel, active && styles.paletteLabelActive]} numberOfLines={1}>
                    {t(p.nameKey as never)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.periodToggleRow}>
            <Pressable
              style={[styles.periodButton, statsPeriod === 'all' && styles.periodButtonActive]}
              onPress={() => setStatsPeriod('all')}
            >
              <Text style={[styles.periodButtonText, statsPeriod === 'all' && styles.periodButtonTextActive]}>
                {t('profile.allTime')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.periodButton, statsPeriod === 'month' && styles.periodButtonActive]}
              onPress={() => setStatsPeriod('month')}
            >
              <Text
                style={[styles.periodButtonText, statsPeriod === 'month' && styles.periodButtonTextActive]}
              >
                {t('profile.thisMonth')}
              </Text>
            </Pressable>
          </View>
          <StatRow
            stats={[
              { label: t('profile.workouts'), value: String(stats.workouts) },
              { label: t('profile.totalKg'), value: String(stats.totalKg) },
              { label: t('profile.bestStreak'), value: String(stats.bestStreak) },
            ]}
          />
          <View style={{ marginTop: 10 }}>
            <StatRow
              stats={[
                { label: t('profile.currentStreak'), value: String(liveStreak) },
                { label: t('profile.avgSession'), value: String(avgSessionVolume) },
                {
                  label: t('profile.topExercise'),
                  value: topExercise ? exerciseName(topExercise.exerciseSlug) : '—',
                },
              ]}
            />
          </View>

          <Text style={styles.chartTitle}>{t('profile.weeklyVolume')}</Text>
          <WeeklyVolumeChart buckets={weeklyVolume} />
        </View>

        <View style={styles.section}>
          <View style={styles.topRow}>
            <Text style={styles.eyebrow}>{t('profile.personalRecords')}</Text>
            <Text style={styles.allTime}>{t('profile.allTime')}</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            value={recordSearch}
            onChangeText={setRecordSearch}
            placeholder={t('profile.searchRecords')}
            placeholderTextColor={colors.muted}
          />
          {(CATEGORY_ORDER as readonly CategoryKey[]).map((category) => {
            const query = recordSearch.trim().toLowerCase();
            const categoryExercises = EXERCISES.filter(
              (ex) =>
                ex.category === category &&
                (!query || exerciseName(ex.slug).toLowerCase().includes(query))
            );
            if (categoryExercises.length === 0) return null;
            return (
              <View key={category} style={{ marginBottom: 14 }}>
                <Text style={styles.recordCategoryHeader}>{categoryLabel(category)}</Text>
                <View style={styles.recordsCard}>
                  {categoryExercises.map((ex, i) => {
                    const best = personalBestFor(ex.slug);
                    const unit = unitLabel(unitKeyFor(ex.metric));
                    return (
                      <View key={ex.slug}>
                        <View style={styles.recordRow}>
                          <Text style={styles.recordName}>{exerciseName(ex.slug)}</Text>
                          <Text style={styles.recordValue}>
                            {best > 0 ? best : '—'}
                            {best > 0 && <Text style={styles.recordUnit}> {unit}</Text>}
                          </Text>
                        </View>
                        {i < categoryExercises.length - 1 && <View style={styles.recordDivider} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckinHistoryRow({ checkin }: { checkin: CheckinSubmission }) {
  const { t } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedImageUrl('checkin-photos', checkin.photoPath).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [checkin.photoPath]);

  return (
    <View style={styles.checkinHistoryRow}>
      {url ? (
        <Image source={{ uri: url }} style={styles.checkinHistoryThumb} />
      ) : (
        <View style={styles.checkinHistoryThumb} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.checkinHistoryDate}>{new Date(checkin.submittedAt).toLocaleDateString()}</Text>
        {checkin.weightKg != null && (
          <Text style={styles.checkinHistoryWeight}>{checkin.weightKg} kg</Text>
        )}
        {checkin.ptComment && (
          <Text style={styles.checkinHistoryComment}>{`${t('profile.coachComment')}: ${checkin.ptComment}`}</Text>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  avatarWrap: { width: 56, height: 56 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEmpty: { borderWidth: 2, borderColor: colors.lime, borderStyle: 'dashed' },
  avatarImage: { width: 56, height: 56 },
  avatarText: { color: colors.lime, fontSize: 22, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCol: { flex: 1 },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  signInButtonFilled: { backgroundColor: colors.lime, borderColor: colors.lime },
  signOutButton: { backgroundColor: 'transparent', borderColor: colors.orange },
  signInButtonText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  signInButtonTextFilled: { color: colors.background },
  signOutButtonText: { color: colors.orange },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  checkinDayLabel: { color: colors.foreground, fontSize: 15, fontWeight: '800', marginTop: 6 },
  checkinPromptTitle: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  checkinPhotoButton: {
    marginTop: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkinPhotoButtonText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  checkinPhotoPreview: { width: '100%', height: 160, borderRadius: 12 },
  checkinSubmitButton: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  checkinSubmitButtonText: { color: colors.background, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  checkinHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  checkinHistoryThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.panel },
  checkinHistoryDate: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  checkinHistoryWeight: { color: colors.muted, fontSize: 12, marginTop: 2 },
  checkinHistoryComment: { color: colors.lime, fontSize: 12, marginTop: 4, lineHeight: 16 },
  deleteAccountLink: { alignSelf: 'center', marginTop: 18 },
  deleteAccountLinkText: { color: colors.muted, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  name: { color: colors.foreground, fontSize: 24, fontFamily: fonts.display },
  memberSince: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  genderButtonActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  genderButtonText: { color: colors.foreground, fontWeight: '700' },
  genderButtonTextActive: { color: colors.background },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paletteSwatch: {
    width: 84,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
  },
  paletteSwatchActive: { borderColor: colors.lime },
  paletteDotRow: { flexDirection: 'row', gap: 4 },
  paletteDot: { width: 16, height: 16, borderRadius: 8 },
  paletteLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  paletteLabelActive: { color: colors.foreground },
  allTime: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  periodToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  periodButtonText: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  periodButtonTextActive: { color: colors.background },
  chartTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 16,
  },
  recordCategoryHeader: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  recordsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  recordName: { color: colors.foreground, fontSize: 17, fontWeight: '700' },
  recordValue: { color: colors.foreground, fontSize: 22, fontFamily: fonts.display },
  recordUnit: { fontSize: 11, color: colors.muted },
  recordDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
