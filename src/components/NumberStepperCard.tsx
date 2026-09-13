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
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onDecrement}
          hitSlop={8}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Minus size={18} color={colors.lime} strokeWidth={3} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onIncrement}
          hitSlop={8}
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
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPressed: { backgroundColor: colors.border },
  value: {
    color: colors.foreground,
    fontSize: 28,
    fontFamily: fonts.display,
    minWidth: 48,
    textAlign: 'center',
  },
  unit: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 10 },
});
