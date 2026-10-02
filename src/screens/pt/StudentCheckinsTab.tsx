import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useT } from '../../i18n/useT';
import {
  commentOnCheckin,
  fetchStudentCheckinDay,
  fetchStudentCheckins,
  setCheckinDay,
} from '../../lib/coaching';
import { getSignedImageUrl } from '../../lib/media';
import { notifyOther } from '../../lib/notifications';
import { Colors, useColors } from '../../theme';
import { CheckinSubmission, DayOfWeek } from '../../types';

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export function StudentCheckinsTab({ studentId }: { studentId: string }) {
  const { t, weekdayShort, weekdayFull } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [checkinDay, setCheckinDayState] = useState<DayOfWeek | null>(null);
  const [dayLoaded, setDayLoaded] = useState(false);
  const [checkins, setCheckins] = useState<CheckinSubmission[] | null>(null);

  useEffect(() => {
    fetchStudentCheckinDay(studentId).then((d) => {
      setCheckinDayState(d);
      setDayLoaded(true);
    });
    fetchStudentCheckins(studentId).then(setCheckins);
  }, [studentId]);

  async function handleSetDay(day: DayOfWeek | null) {
    const previous = checkinDay;
    setCheckinDayState(day);
    try {
      await setCheckinDay(studentId, day);
    } catch {
      setCheckinDayState(previous);
    }
  }

  async function handleComment(checkinId: string, comment: string) {
    await commentOnCheckin(checkinId, comment);
    notifyOther('checkin_comment', studentId);
    setCheckins(
      (prev) =>
        prev?.map((c) =>
          c.id === checkinId ? { ...c, ptComment: comment, ptCommentedAt: new Date().toISOString() } : c
        ) ?? null
    );
  }

  return (
    <View style={{ gap: 18 }}>
      <View>
        <Text style={styles.sectionLabel}>{t('pt.checkinDay')}</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>{t('pt.checkinDayHint')}</Text>
          <View style={styles.dayRow}>
            {DAYS.map((day) => {
              const active = day === checkinDay;
              return (
                <Pressable
                  key={day}
                  style={[styles.dayPill, active && styles.dayPillActive]}
                  onPress={() => handleSetDay(active ? null : day)}
                >
                  <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                    {weekdayShort(day)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {dayLoaded && (
            <Text style={checkinDay === null ? styles.warn : styles.ok}>
              {checkinDay === null
                ? t('pt.checkinPickDay')
                : t('pt.checkinDaySet', { day: weekdayFull(checkinDay) })}
            </Text>
          )}
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>{t('pt.checkins')}</Text>
        {checkins === null ? (
          <ActivityIndicator color={colors.lime} style={{ marginTop: 12 }} />
        ) : checkins.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>{t('pt.noCheckins')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {checkins.map((c) => (
              <CheckinCard key={c.id} checkin={c} onComment={handleComment} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function CheckinCard({
  checkin,
  onComment,
}: {
  checkin: CheckinSubmission;
  onComment: (checkinId: string, comment: string) => Promise<void>;
}) {
  const { t, dateLocale } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [comment, setComment] = useState(checkin.ptComment ?? '');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    getSignedImageUrl('checkin-photos', checkin.photoPath).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [checkin.photoPath]);

  async function handleSend() {
    if (!comment.trim() || sending) return;
    setSending(true);
    setStatus('idle');
    try {
      await onComment(checkin.id, comment.trim());
      setStatus('sent');
    } catch (e) {
      console.warn('Check-in comment failed', e);
      setStatus('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.checkinHeader}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.checkinPhoto} resizeMode="cover" />
        ) : (
          <View style={styles.checkinPhoto} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.checkinDate}>
            {new Date(checkin.submittedAt).toLocaleDateString(dateLocale(), {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          {checkin.weightKg != null && <Text style={styles.checkinWeight}>{checkin.weightKg} kg</Text>}
          {checkin.ptComment && status !== 'sent' && (
            <Text style={styles.ptCommentBadge}>{t('pt.commentedBadge')}</Text>
          )}
        </View>
      </View>
      <View style={styles.commentRow}>
        <TextInput
          style={[styles.input, styles.flex1]}
          value={comment}
          onChangeText={(v) => {
            setComment(v);
            setStatus('idle');
          }}
          placeholder={t('pt.checkinCommentPlaceholder')}
          placeholderTextColor={colors.muted}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!comment.trim() || sending) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!comment.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.sendButtonText}>{t('pt.sendComment')}</Text>
          )}
        </Pressable>
      </View>
      {status === 'sent' && <Text style={styles.ok}>{t('pt.commentSent')}</Text>}
      {status === 'error' && <Text style={styles.warn}>{t('pt.commentError')}</Text>}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  empty: { color: colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  dayRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dayPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dayPillActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  dayPillText: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  dayPillTextActive: { color: colors.background },
  ok: { color: colors.lime, fontSize: 12, fontWeight: '700', marginTop: 10 },
  warn: { color: colors.orange, fontSize: 12, fontWeight: '700', marginTop: 10, lineHeight: 17 },
  checkinHeader: { flexDirection: 'row', gap: 14 },
  checkinPhoto: { width: 110, height: 140, borderRadius: 12, backgroundColor: colors.panel },
  checkinDate: { color: colors.foreground, fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  checkinWeight: { color: colors.lime, fontSize: 18, fontWeight: '800', marginTop: 6 },
  ptCommentBadge: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 8 },
  commentRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex1: { flex: 1 },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 46,
  },
  sendButton: {
    backgroundColor: colors.lime,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendButtonText: { color: colors.background, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
});
