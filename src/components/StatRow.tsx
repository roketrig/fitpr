import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Stat {
  label: string;
  value: string;
}

export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.card}>
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          <View style={styles.column}>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
          {i < stats.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 16,
  },
  column: { flex: 1, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  value: { color: colors.lime, fontSize: 20, fontWeight: '800' },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
});
