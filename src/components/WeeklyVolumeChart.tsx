import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { WeekBucket } from '../lib/stats';
import { Colors, useColors } from '../theme';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;
const BAR_AREA_HEIGHT = 96;
const BASELINE_Y = 108;

function shortDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function WeeklyVolumeChart({ buckets }: { buckets: WeekBucket[] }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const maxKg = Math.max(1, ...buckets.map((b) => b.totalKg));
  const gap = 6;
  const barWidth = (CHART_WIDTH - gap * (buckets.length + 1)) / buckets.length;

  return (
    <View style={styles.card}>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        {buckets.map((bucket, i) => {
          const x = gap + i * (barWidth + gap);
          const barHeight = Math.max(3, (bucket.totalKg / maxKg) * BAR_AREA_HEIGHT);
          const isLast = i === buckets.length - 1;
          return (
            <Rect
              key={bucket.weekStart}
              x={x}
              y={BASELINE_Y - barHeight}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={isLast ? colors.lime : withAlpha(colors.lime, 0.45)}
            />
          );
        })}
      </Svg>
      <View style={styles.labelRow}>
        {buckets.map((bucket, i) =>
          i % 2 === 0 || i === buckets.length - 1 ? (
            <Text key={bucket.weekStart} style={styles.label}>
              {shortDayMonth(bucket.weekStart)}
            </Text>
          ) : (
            <Text key={bucket.weekStart} style={styles.label} />
          )
        )}
      </View>
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { color: colors.muted, fontSize: 9, fontWeight: '700', flex: 1, textAlign: 'center' },
});
