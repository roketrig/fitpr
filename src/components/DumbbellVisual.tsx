import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PLATE_COLORS } from '../lib/plates';

interface Props {
  perHandKg: number;
  label: string;
}

const HEAD_SIZES = [1.25, 2, 3, 5, 7.5, 10, 15, 20, 25, 30];

function headSizeFor(perHandKg: number): number {
  let chosen = HEAD_SIZES[0];
  for (const size of HEAD_SIZES) {
    if (perHandKg >= size) chosen = size;
  }
  return chosen;
}

export function DumbbellVisual({ perHandKg, label }: Props) {
  const headSize = headSizeFor(perHandKg);
  const headDiameter = 26 + headSize * 1.6;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pop, { toValue: 0.9, duration: 70, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [perHandKg, pop]);

  const headColor = PLATE_COLORS[headSize] ?? colors.lime;

  return (
    <View>
      <Animated.View style={[styles.container, { transform: [{ scale: pop }] }]}>
        <View
          style={[
            styles.head,
            { width: headDiameter, height: headDiameter, borderRadius: headDiameter / 2, backgroundColor: headColor },
          ]}
        />
        <View style={styles.handle} />
        <View
          style={[
            styles.head,
            { width: headDiameter, height: headDiameter, borderRadius: headDiameter / 2, backgroundColor: headColor },
          ]}
        />
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
    height: 110,
  },
  handle: {
    width: 46,
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: 4,
  },
  head: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
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
