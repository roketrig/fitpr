import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  weightKg: number;
  label: string;
}

const STACK_SLOTS = 10;
const KG_PER_SLOT = 10;

export function MachineVisual({ weightKg, label }: Props) {
  const litSlots = Math.min(STACK_SLOTS, Math.max(1, Math.round(weightKg / KG_PER_SLOT)));
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pop, { toValue: 0.95, duration: 70, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [weightKg, pop]);

  return (
    <View>
      <Animated.View style={[styles.container, { transform: [{ scaleY: pop }] }]}>
        <View style={styles.rail} />
        <View style={styles.stack}>
          {Array.from({ length: STACK_SLOTS }).map((_, i) => {
            const slotIndex = STACK_SLOTS - 1 - i;
            const lit = slotIndex < litSlots;
            const isPin = slotIndex === litSlots - 1;
            return (
              <View key={i} style={[styles.slot, lit && styles.slotLit]}>
                {isPin && <View style={styles.pin} />}
              </View>
            );
          })}
        </View>
        <View style={styles.rail} />
      </Animated.View>
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 110,
  },
  rail: { width: 4, height: 90, backgroundColor: colors.muted, borderRadius: 2 },
  stack: { justifyContent: 'flex-end', height: 90, gap: 2 },
  slot: {
    width: 64,
    height: 6,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  slotLit: { backgroundColor: colors.lime },
  pin: {
    position: 'absolute',
    right: -14,
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.orange,
  },
  hint: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 14,
  },
});
