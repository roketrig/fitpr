import { Dumbbell } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useProfileStore } from '../store/profileStore';
import { colors } from '../theme';

export function AppHeader() {
  const displayName = useProfileStore((s) => s.profile.displayName);
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
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
  );
}

const styles = StyleSheet.create({
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
