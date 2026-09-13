import { PersonStanding } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  value: number;
  label: string;
}

export function BodyweightVisual({ value, label }: Props) {
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pop, { toValue: 0.85, duration: 70, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [value, pop]);

  return (
    <View>
      <View style={styles.container}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pop }] }]}>
          <PersonStanding size={48} color={colors.lime} strokeWidth={1.75} />
        </Animated.View>
      </View>
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: 110 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(201,245,51,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
