import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, useColors } from '../theme';

interface Props {
  label: string;
  color?: string;
  dot?: boolean;
}

export function StatusPill({ label, color, dot = true }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const resolvedColor = color ?? colors.lime;
  return (
    <View style={[styles.pill, { borderColor: resolvedColor }]}>
      {dot && <View style={[styles.dot, { backgroundColor: resolvedColor }]} />}
      <Text style={[styles.label, { color: resolvedColor }]}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
