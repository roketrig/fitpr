import { Minus, Plus } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, fonts, useColors } from '../theme';

interface Props {
  label: string;
  value: string;
  unit: string;
  // Called once per tap, then repeatedly while held. `multiplier` grows the
  // longer the button is held (1, then 2, then 4) so big changes stay quick.
  onDecrement: (multiplier: number) => void;
  onIncrement: (multiplier: number) => void;
}

const HOLD_DELAY_MS = 400;
const REPEAT_MS = 110;

function useHoldRepeat(action: (multiplier: number) => void) {
  const actionRef = useRef(action);
  actionRef.current = action;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timeout.current) clearTimeout(timeout.current);
    if (interval.current) clearInterval(interval.current);
    timeout.current = null;
    interval.current = null;
  };
  useEffect(() => stop, []);

  const start = () => {
    stop();
    actionRef.current(1);
    let repeats = 0;
    timeout.current = setTimeout(() => {
      interval.current = setInterval(() => {
        repeats += 1;
        actionRef.current(repeats < 8 ? 1 : repeats < 20 ? 2 : 4);
      }, REPEAT_MS);
    }, HOLD_DELAY_MS);
  };
  return { start, stop };
}

export function NumberStepperCard({ label, value, unit, onDecrement, onIncrement }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dec = useHoldRepeat(onDecrement);
  const inc = useHoldRepeat(onIncrement);
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPressIn={dec.start}
          onPressOut={dec.stop}
          hitSlop={8}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Minus size={18} color={colors.lime} strokeWidth={3} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPressIn={inc.start}
          onPressOut={inc.stop}
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

const makeStyles = (colors: Colors) => StyleSheet.create({
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
