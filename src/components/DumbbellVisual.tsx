import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Colors, useColors } from '../theme';
import { getPlateColor } from '../lib/plates';

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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const headSize = headSizeFor(perHandKg);
  const headDiameter = 34 + headSize * 1.5;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pop, { toValue: 0.9, duration: 70, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [perHandKg, pop]);

  // Shaded off the theme's own accent, not a hardcoded color, so it never
  // clashes with whichever palette is active.
  const headColor = getPlateColor(headSize, colors.lime);
  const handleLength = 46;
  const handleThickness = 11;
  const width = headDiameter * 2 + handleLength;
  const height = headDiameter;
  const cy = height / 2;
  const knurlCount = 4;

  return (
    <View>
      <Animated.View style={[styles.container, { transform: [{ scale: pop }] }]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Rect
            x={headDiameter - 8}
            y={cy - handleThickness / 2}
            width={handleLength + 16}
            height={handleThickness}
            rx={handleThickness / 2}
            fill={colors.muted}
          />
          {Array.from({ length: knurlCount }).map((_, i) => {
            const x = headDiameter + 6 + ((i + 1) * (handleLength + 4)) / (knurlCount + 1);
            return (
              <Line
                key={i}
                x1={x}
                y1={cy - handleThickness / 2 - 2}
                x2={x}
                y2={cy + handleThickness / 2 + 2}
                stroke={colors.background}
                strokeWidth={1.5}
                opacity={0.35}
              />
            );
          })}
          {[headDiameter / 2, width - headDiameter / 2].map((cx, i) => (
            <React.Fragment key={i}>
              <Circle cx={cx} cy={cy} r={headDiameter / 2} fill={headColor} />
              <Circle
                cx={cx}
                cy={cy}
                r={headDiameter / 2 - 7}
                fill="none"
                stroke={colors.background}
                strokeWidth={2}
                opacity={0.22}
              />
              <Circle cx={cx} cy={cy} r={headDiameter * 0.14} fill={colors.background} opacity={0.35} />
              <Circle
                cx={cx - headDiameter * 0.16}
                cy={cy - headDiameter * 0.16}
                r={headDiameter * 0.13}
                fill={colors.foreground}
                opacity={0.16}
              />
            </React.Fragment>
          ))}
        </Svg>
      </Animated.View>
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
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
