import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { MUSCLES } from '../constants/muscles';
import { MUSCLE_LABELS } from '../i18n/translations';
import { useT } from '../i18n/useT';
import { muscleScores } from '../lib/muscles';
import { Colors, useColors } from '../theme';
import { Gender, Muscle, WorkoutSet } from '../types';

const DAY_MS = 86400000;
type Period = 7 | 30 | 'all';

interface Shape {
  muscle: Muscle;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number;
}

// Body proportions: women get narrower shoulders/waist and wider hips.
function proportions(gender: Gender | null) {
  return gender === 'female' ? { sh: 0.84, wa: 0.86, hp: 1.14 } : { sh: 1, wa: 1, hp: 1 };
}

type Prop = ReturnType<typeof proportions>;

const both = (build: (s: 1 | -1) => Shape[]): Shape[] => [...build(-1), ...build(1)];

function frontShapes({ sh, wa, hp }: Prop): Shape[] {
  return [
    ...both((s) => [
      { muscle: 'traps', cx: 100 + s * 15, cy: 63, rx: 12, ry: 7, rot: s * -20 },
      { muscle: 'front_delts', cx: 100 + s * sh * 50, cy: 78, rx: 11, ry: 13 },
      { muscle: 'side_delts', cx: 100 + s * sh * 59, cy: 86, rx: 6, ry: 11 },
      { muscle: 'chest', cx: 100 + s * sh * 20, cy: 92, rx: sh * 19, ry: 15, rot: s * 8 },
      { muscle: 'biceps', cx: 100 + s * sh * 57, cy: 118, rx: 8, ry: 20, rot: s * -4 },
      { muscle: 'forearms', cx: 100 + s * sh * 63, cy: 172, rx: 7, ry: 25, rot: s * -3 },
      { muscle: 'obliques', cx: 100 + s * wa * 27, cy: 142, rx: 8, ry: 26, rot: s * -8 },
      { muscle: 'quads', cx: 100 + s * hp * 23, cy: 254, rx: hp * 15, ry: 52, rot: s * -3 },
      { muscle: 'adductors', cx: 100 + s * hp * 7, cy: 250, rx: 5, ry: 40 },
      { muscle: 'calves', cx: 100 + s * hp * 21, cy: 350, rx: 9, ry: 35 },
    ]),
    ...[112, 131, 150].flatMap((cy) =>
      ([-1, 1] as const).map((s) => ({ muscle: 'abs' as Muscle, cx: 100 + s * 8, cy, rx: 7, ry: 8 }))
    ),
  ];
}

function backShapes({ sh, hp }: Prop): Shape[] {
  return [
    { muscle: 'traps', cx: 100, cy: 80, rx: 26, ry: 20 },
    ...both((s) => [
      { muscle: 'rear_delts', cx: 100 + s * sh * 50, cy: 78, rx: 11, ry: 12 },
      { muscle: 'side_delts', cx: 100 + s * sh * 59, cy: 86, rx: 6, ry: 11 },
      { muscle: 'upper_back', cx: 100 + s * 10, cy: 108, rx: 10, ry: 14 },
      { muscle: 'lats', cx: 100 + s * sh * 29, cy: 125, rx: sh * 14, ry: 28, rot: s * 10 },
      { muscle: 'triceps', cx: 100 + s * sh * 57, cy: 118, rx: 8, ry: 20, rot: s * -4 },
      { muscle: 'forearms', cx: 100 + s * sh * 63, cy: 172, rx: 7, ry: 25, rot: s * -3 },
      { muscle: 'lower_back', cx: 100 + s * 9, cy: 162, rx: 9, ry: 14 },
      { muscle: 'glutes', cx: 100 + s * hp * 17, cy: 207, rx: hp * 17, ry: 17 },
      { muscle: 'hamstrings', cx: 100 + s * hp * 22, cy: 264, rx: hp * 14, ry: 42 },
      { muscle: 'calves', cx: 100 + s * hp * 20, cy: 345, rx: 10, ry: 34 },
    ]),
  ];
}

function mixHex(a: string, b: string, t: number): string {
  const parse = (h: string) => /^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : null;
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return b;
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function Figure({
  shapes,
  prop,
  fillFor,
  baseColor,
  strokeColor,
}: {
  shapes: Shape[];
  prop: Prop;
  fillFor: (m: Muscle) => string;
  baseColor: string;
  strokeColor: string;
}) {
  const { sh, wa, hp } = prop;
  const limb = (x1: number, y1: number, x2: number, y2: number, w: number) => (
    <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={baseColor} strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 430">
      {/* silhouette */}
      <Circle cx={100} cy={28} r={16} fill={baseColor} />
      <Rect x={92} y={42} width={16} height={20} fill={baseColor} />
      <Path
        d={`M ${100 - sh * 48} 66 Q 100 56 ${100 + sh * 48} 66 L ${100 + wa * 30} 175 Q ${100 + hp * 34} 190 ${100 + hp * 34} 210 L ${100 - hp * 34} 210 Q ${100 - hp * 34} 190 ${100 - wa * 30} 175 Z`}
        fill={baseColor}
      />
      {([-1, 1] as const).map((s) => (
        <G key={s}>
          {limb(100 + s * sh * 52, 74, 100 + s * sh * 58, 142, 22)}
          {limb(100 + s * sh * 58, 142, 100 + s * sh * 64, 205, 16)}
          <Ellipse cx={100 + s * sh * 65} cy={214} rx={6} ry={9} fill={baseColor} />
          {limb(100 + s * hp * 20, 205, 100 + s * hp * 22, 300, hp * 38)}
          {limb(100 + s * hp * 22, 300, 100 + s * hp * 20, 402, 26)}
          <Ellipse cx={100 + s * hp * 20} cy={414} rx={11} ry={7} fill={baseColor} />
        </G>
      ))}
      {/* muscles */}
      {shapes.map((sp, i) => (
        <Ellipse
          key={i}
          cx={sp.cx}
          cy={sp.cy}
          rx={sp.rx}
          ry={sp.ry}
          fill={fillFor(sp.muscle)}
          stroke={strokeColor}
          strokeWidth={1}
          transform={sp.rot ? `rotate(${sp.rot} ${sp.cx} ${sp.cy})` : undefined}
        />
      ))}
    </Svg>
  );
}

interface Props {
  sets: WorkoutSet[];
  gender: Gender | null;
}

export function MuscleMapCard({ sets, gender }: Props) {
  const { t, language } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [period, setPeriod] = useState<Period>(30);

  const periodSets = useMemo(
    () => (period === 'all' ? sets : sets.filter((s) => Date.now() - new Date(s.performedAt).getTime() <= period * DAY_MS)),
    [sets, period]
  );
  const scores = useMemo(() => muscleScores(periodSets), [periodSets]);
  const maxScore = Math.max(0, ...MUSCLES.map((m) => scores[m]));

  const prop = useMemo(() => proportions(gender), [gender]);
  // The silhouette sits between the card and the idle-muscle color so head, neck and hands stay visible.
  const baseColor = useMemo(() => mixHex(colors.card, colors.border, 0.5), [colors]);
  const front = useMemo(() => frontShapes(prop), [prop]);
  const back = useMemo(() => backShapes(prop), [prop]);

  const fillFor = (m: Muscle) => {
    if (maxScore <= 0 || scores[m] <= 0) return colors.border;
    const t01 = Math.pow(scores[m] / maxScore, 0.6);
    return mixHex(colors.border, colors.lime, 0.3 + 0.7 * t01);
  };

  const ranked = MUSCLES.filter((m) => scores[m] > 0).sort((a, b) => scores[b] - scores[a]).slice(0, 6);
  const periods: { key: Period; label: string }[] = [
    { key: 7, label: t('muscle.period7') },
    { key: 30, label: t('muscle.period30') },
    { key: 'all', label: t('profile.allTime') },
  ];

  return (
    <View>
      <Text style={styles.title}>{t('muscle.title')}</Text>
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <Pressable
            key={String(p.key)}
            style={[styles.chip, period === p.key && styles.chipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.chipText, period === p.key && styles.chipTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.figures}>
          <View style={styles.figureCol}>
            <View style={styles.figureBox}>
              <Figure shapes={front} prop={prop} fillFor={fillFor} baseColor={baseColor} strokeColor={baseColor} />
            </View>
            <Text style={styles.viewLabel}>{t('muscle.front')}</Text>
          </View>
          <View style={styles.figureCol}>
            <View style={styles.figureBox}>
              <Figure shapes={back} prop={prop} fillFor={fillFor} baseColor={baseColor} strokeColor={baseColor} />
            </View>
            <Text style={styles.viewLabel}>{t('muscle.back')}</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendText}>{t('muscle.less')}</Text>
          <View style={styles.legendBar}>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <View key={v} style={[styles.legendStep, { backgroundColor: mixHex(colors.border, colors.lime, 0.3 + 0.7 * v) }]} />
            ))}
          </View>
          <Text style={styles.legendText}>{t('muscle.more')}</Text>
        </View>

        {ranked.length === 0 ? (
          <Text style={styles.empty}>{t('muscle.empty')}</Text>
        ) : (
          <View style={styles.list}>
            {ranked.map((m) => (
              <View key={m} style={styles.listRow}>
                <Text style={styles.listLabel}>{MUSCLE_LABELS[language][m]}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(scores[m] / maxScore) * 100}%` }]} />
                </View>
                <Text style={styles.listValue}>
                  {Math.round(scores[m] * 10) / 10} {t('muscle.setsUnit')}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.hint}>{t('muscle.hint')}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  title: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { color: colors.foreground, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: colors.background },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  figures: { flexDirection: 'row', gap: 8 },
  figureCol: { flex: 1, alignItems: 'center' },
  figureBox: { width: '100%', aspectRatio: 200 / 430 },
  viewLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  legendBar: { flexDirection: 'row', borderRadius: 4, overflow: 'hidden' },
  legendStep: { width: 26, height: 8 },
  legendText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: 16 },
  list: { marginTop: 16, gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listLabel: { width: 86, color: colors.foreground, fontSize: 13, fontWeight: '700' },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.panel, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: colors.lime },
  listValue: { width: 62, textAlign: 'right', color: colors.muted, fontSize: 12, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 14 },
});
