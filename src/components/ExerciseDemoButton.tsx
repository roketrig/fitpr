import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { getExerciseClipUrl, hasExerciseClip } from '../constants/exerciseClips';
import { useT } from '../i18n/useT';
import { colors, fonts } from '../theme';
import { ExerciseSlug } from '../types';

export function ExerciseDemoButton({ slug }: { slug: ExerciseSlug }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  if (!hasExerciseClip(slug)) return null;

  return (
    <>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Play size={12} color={colors.lime} fill={colors.lime} />
        <Text style={styles.buttonText}>{t('workout.watchDemo')}</Text>
      </Pressable>
      {open && <DemoClipModal slug={slug} onClose={() => setOpen(false)} />}
    </>
  );
}

function DemoClipModal({ slug, onClose }: { slug: ExerciseSlug; onClose: () => void }) {
  const player = useVideoPlayer(getExerciseClipUrl(slug), (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.clipCard}>
          <VideoView style={styles.video} player={player} contentFit="cover" nativeControls={false} />
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  buttonText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: fonts.displayRegular,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  clipCard: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 9 / 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  video: { flex: 1 },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16,18,16,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
