import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../i18n/useT';
import { supabase } from '../lib/supabase';
import { syncOnSignIn } from '../lib/sync';
import { colors, fonts } from '../theme';

interface Props {
  onClose: () => void;
}

type Mode = 'signIn' | 'signUp';

export function AuthOverlay({ onClose }: Props) {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signIn') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (data.session) {
          setSyncing(true);
          await syncOnSignIn(data.session.user.id);
          onClose();
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setSyncing(true);
          await syncOnSignIn(data.session.user.id);
          onClose();
        } else {
          setCheckEmail(true);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close">
              <X size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{mode === 'signIn' ? t('auth.titleSignIn') : t('auth.titleSignUp')}</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

            {checkEmail ? (
              <View style={styles.checkEmailBox}>
                <Text style={styles.checkEmailText}>{t('auth.checkEmail')}</Text>
                <Pressable style={styles.primaryButton} onPress={onClose}>
                  <Text style={styles.primaryButtonText}>{t('auth.close')}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.label}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                />

                <Text style={styles.label}>{t('auth.password')}</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading || !email || !password}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
                    </Text>
                  )}
                </Pressable>

                {syncing && <Text style={styles.syncingText}>{t('auth.syncing')}</Text>}

                <Pressable
                  onPress={() => {
                    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                    setError(null);
                  }}
                  style={styles.switchLink}
                >
                  <Text style={styles.switchLinkText}>
                    {mode === 'signIn' ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  closeButton: { padding: 8 },
  content: { paddingHorizontal: 24, paddingTop: 16 },
  title: { color: colors.foreground, fontSize: 32, fontFamily: fonts.display },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 6, marginBottom: 24 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  error: { color: colors.orange, fontSize: 13, fontWeight: '600', marginTop: 14 },
  primaryButton: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  syncingText: { color: colors.lime, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  switchLink: { marginTop: 20, alignItems: 'center' },
  switchLinkText: { color: colors.lime, fontSize: 13, fontWeight: '700' },
  checkEmailBox: { marginTop: 12 },
  checkEmailText: { color: colors.foreground, fontSize: 15, lineHeight: 22 },
});
