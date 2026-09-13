import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface Props {
  label: string;
  value: string;
  unit: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function NumberStepperCard({ label, value, unit, onDecrement, onIncrement }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          style={styles.button}
          onPress={onDecrement}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Minus size={18} color={colors.lime} strokeWidth={3} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          style={styles.button}
          onPress={onIncrement}
          accessibilityLabel={`Increase ${label}`}
        >
          <Plus size={18} color={colors.lime} strokeWidth={3} />
        </Pressable>
      </View>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: colors.foreground,
    fontSize: 32,
    fontFamily: fonts.display,
    minWidth: 70,
    textAlign: 'center',
  },
  unit: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 10 },
});
