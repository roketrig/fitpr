import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { AuthOverlay } from '../components/AuthOverlay';
import { DeleteAccountOverlay } from '../components/DeleteAccountOverlay';
import { StatRow } from '../components/StatRow';
import { StatusPill } from '../components/StatusPill';
import { EXERCISES } from '../constants/exercises';
import { useT } from '../i18n/useT';
import { supabase } from '../lib/supabase';
import { unitKeyFor } from '../lib/metric';
import { longestStreakDays, totalVolumeKg, trainingDayKeys } from '../lib/stats';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useSettingsStore } from '../store/settingsStore';
import { useWorkoutStore } from '../store/workoutStore';
import { colors, fonts } from '../theme';
import { Language } from '../types';

export function ProfileScreen() {
  const { t, exerciseName, categoryLabel, unitLabel } = useT();
  const profile = useProfileStore((s) => s.profile);
  const setDisplayName = useProfileStore((s) => s.setDisplayName);
  const setGender = useProfileStore((s) => s.setGender);
  const setHeightCm = useProfileStore((s) => s.setHeightCm);
  const setWeightKg = useProfileStore((s) => s.setWeightKg);

  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const sets = useWorkoutStore((s) => s.sets);
  const personalBestFor = useWorkoutStore((s) => s.personalBestFor);

  const session = useAuthStore((s) => s.session);
  const [authOpen, setAuthOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const stats = useMemo(
    () => ({
      workouts: trainingDayKeys(sets).length,
      totalKg: totalVolumeKg(sets),
      bestStreak: longestStreakDays(sets),
    }),
    [sets]
  );

  const initial = profile.displayName.trim().charAt(0).toUpperCase() || '?';

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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.identityCol}>
              <Text style={styles.name}>{profile.displayName || t('profile.unnamedLifter')}</Text>
              <Text style={styles.memberSince} numberOfLines={1} ellipsizeMode="tail">
                {session ? session.user.email : t('profile.memberSince', { year: profile.memberSinceYear })}
              </Text>
            </View>
            <Pressable
              onPress={() => (session ? supabase.auth.signOut() : setAuthOpen(true))}
              style={styles.signInButton}
            >
              <Text style={styles.signInButtonText}>
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
        </View>

        <View style={styles.section}>
          <StatRow
            stats={[
              { label: t('profile.workouts'), value: String(stats.workouts) },
              { label: t('profile.totalKg'), value: String(stats.totalKg) },
              { label: t('profile.bestStreak'), value: String(stats.bestStreak) },
            ]}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.topRow}>
            <Text style={styles.eyebrow}>{t('profile.personalRecords')}</Text>
            <Text style={styles.allTime}>{t('profile.allTime')}</Text>
          </View>
          <View style={styles.recordsCard}>
            {EXERCISES.map((ex, i) => {
              const best = personalBestFor(ex.slug);
              const unit = unitLabel(unitKeyFor(ex.metric));
              return (
                <View key={ex.slug}>
                  <View style={styles.recordRow}>
                    <View>
                      <Text style={styles.recordName}>{exerciseName(ex.slug)}</Text>
                      <Text style={styles.recordCategory}>{categoryLabel(ex.category)}</Text>
                    </View>
                    <Text style={styles.recordValue}>
                      {best > 0 ? best : '—'}
                      {best > 0 && <Text style={styles.recordUnit}> {unit}</Text>}
                    </Text>
                  </View>
                  {i < EXERCISES.length - 1 && <View style={styles.recordDivider} />}
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.lime, fontSize: 22, fontWeight: '800' },
  identityCol: { flex: 1 },
  signInButton: { paddingHorizontal: 12, paddingVertical: 8 },
  signInButtonText: { color: colors.lime, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
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
  allTime: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  recordsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  recordName: { color: colors.foreground, fontSize: 17, fontWeight: '700' },
  recordCategory: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  recordValue: { color: colors.foreground, fontSize: 22, fontFamily: fonts.display },
  recordUnit: { fontSize: 11, color: colors.muted },
  recordDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
