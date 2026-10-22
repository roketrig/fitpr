import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Colors, useColors } from '../theme';

interface Props {
  total: number;
  completed: number;
}

// One segment per planned set. A segment that just got completed fills in
// with a quick sweep and a small pop; switching exercises resets them
// instantly instead of animating a refill.
export function SetProgress({ total, completed }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fills = useRef<Animated.Value[]>([]);
  const pops = useRef<Animated.Value[]>([]);
  const prevCompleted = useRef(completed);
  const prevTotal = useRef(total);

  while (fills.current.length < total) {
    fills.current.push(new Animated.Value(fills.current.length < completed ? 1 : 0));
    pops.current.push(new Animated.Value(1));
  }

  useEffect(() => {
    const reset = total !== prevTotal.current || completed < prevCompleted.current;
    for (let i = 0; i < total; i++) {
      const target = i < completed ? 1 : 0;
      const justCompleted = target === 1 && !reset && i >= prevCompleted.current;
      if (justCompleted) {
        fills.current[i].setValue(0);
        Animated.timing(fills.current[i], {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
        pops.current[i].setValue(1.18);
        Animated.spring(pops.current[i], { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
      } else {
        fills.current[i].setValue(target);
      }
    }
    prevCompleted.current = completed;
    prevTotal.current = total;
  }, [completed, total]);

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Animated.View key={i} style={[styles.track, { transform: [{ scaleY: pops.current[i] }] }]}>
          <Animated.View
            style={[
              styles.fill,
              { width: fills.current[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginTop: 14 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.lime, borderRadius: 4 },
});
