import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../i18n/useT';
import { deleteMyAccount } from '../lib/account';
import { colors, fonts } from '../theme';

interface Props {
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountOverlay({ onClose, onDeleted }: Props) {
  const { t } = useT();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount();
      onDeleted();
    } catch {
      setError(t('profile.deleteAccountError'));
      setDeleting(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('profile.deleteAccountTitle')}</Text>
          <Text style={styles.body}>{t('profile.deleteAccountBody')}</Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.confirmButton, deleting && styles.disabled]}
            onPress={handleConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.confirmButtonText}>{t('profile.deleteAccountConfirm')}</Text>
            )}
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onClose} disabled={deleting}>
            <Text style={styles.cancelButtonText}>{t('profile.deleteAccountCancel')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 30,
    justifyContent: 'center',
  },
  content: {
    marginHorizontal: 24,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: 20,
    padding: 24,
  },
  title: {
    color: colors.orange,
    fontSize: 24,
    fontFamily: fonts.display,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  body: {
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 16,
  },
  error: { color: colors.orange, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 14 },
  confirmButton: {
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  disabled: { opacity: 0.7 },
  confirmButtonText: { color: colors.background, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  cancelButton: { paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { color: colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});
