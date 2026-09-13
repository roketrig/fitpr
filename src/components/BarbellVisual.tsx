import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PLATE_COLORS, perSideKg, platesForSide } from '../lib/plates';

interface Props {
  totalWeightKg: number;
  label: string;
}

function plateHeight(sizeKg: number): number {
  return 40 + sizeKg * 2.4;
}

export function BarbellVisual({ totalWeightKg, label }: Props) {
  const plates = platesForSide(perSideKg(totalWeightKg));
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pop, { toValue: 0.92, duration: 70, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [totalWeightKg, pop]);

  return (
    <View>
      <Animated.View style={[styles.container, { transform: [{ scale: pop }] }]}>
        <View style={styles.sleeve} />
        <View style={styles.plateStack}>
          {plates.map((size, i) => (
            <View
              key={i}
              style={[
                styles.plate,
                { height: plateHeight(size), backgroundColor: PLATE_COLORS[size] ?? colors.lime },
              ]}
            />
          ))}
        </View>
        <View style={styles.bar} />
        <View style={[styles.plateStack, styles.plateStackRight]}>
          {plates.map((size, i) => (
            <View
              key={i}
              style={[
                styles.plate,
                { height: plateHeight(size), backgroundColor: PLATE_COLORS[size] ?? colors.lime },
              ]}
            />
          ))}
        </View>
        <View style={styles.sleeve} />
      </Animated.View>
      <View style={styles.bench} />
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
  bar: {
    width: 90,
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: 3,
  },
  sleeve: {
    width: 10,
    height: 40,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  plateStack: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  plateStackRight: {
    flexDirection: 'row',
  },
  plate: {
    width: 13,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  bench: {
    width: '55%',
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: -6,
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
