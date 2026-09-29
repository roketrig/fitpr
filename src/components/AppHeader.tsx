import { Dumbbell } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '../i18n/useT';
import { useProfileStore } from '../store/profileStore';
import { useUiModeStore } from '../store/uiModeStore';
import { Colors, useColors } from '../theme';

export function AppHeader() {
  const { t } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const displayName = useProfileStore((s) => s.profile.displayName);
  const role = useProfileStore((s) => s.profile.role);
  const ptViewingAsStudent = useUiModeStore((s) => s.ptViewingAsStudent);
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  const showBackToPtPanel = Platform.OS === 'web' && role === 'pt' && ptViewingAsStudent;

  return (
    <View>
      {showBackToPtPanel && (
        <Pressable
          style={styles.ptBanner}
          onPress={() => useUiModeStore.getState().setPtViewingAsStudent(false)}
        >
          <Text style={styles.ptBannerText}>{t('nav.backToPtPanel')}</Text>
        </Pressable>
      )}
      <View style={styles.row}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Dumbbell size={18} color={colors.background} strokeWidth={3} />
          </View>
          <Text style={styles.logoText}>
            FIT<Text style={{ color: colors.lime }}>PR</Text>
          </Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  ptBanner: {
    backgroundColor: colors.lime,
    paddingVertical: 8,
    alignItems: 'center',
  },
  ptBannerText: { color: colors.background, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.foreground, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.lime, fontWeight: '700' },
});
