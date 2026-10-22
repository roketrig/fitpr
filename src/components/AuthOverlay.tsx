import { X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
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
import { TranslationKey } from '../i18n/translations';
import { WEB_APP_URL } from '../lib/config';
import { supabase } from '../lib/supabase';
import { syncOnSignIn } from '../lib/sync';
import { Colors, fonts, useColors } from '../theme';

interface Props {
  onClose: () => void;
}

type Mode = 'signIn' | 'signUp' | 'reset';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const RESEND_COOLDOWN_S = 60;

// Supabase's raw messages ("Invalid login credentials", "email rate limit
// exceeded") read like server errors; map the common ones to something a
// person can act on.
function friendlyError(message: string): { key: TranslationKey | null; needsResend: boolean } {
  if (/email not confirmed/i.test(message)) return { key: 'auth.errNotConfirmed', needsResend: true };
  if (/invalid login credentials/i.test(message)) return { key: 'auth.errInvalid', needsResend: false };
  if (/rate limit|too many|over_email_send_rate_limit|security purposes/i.test(message))
    return { key: 'auth.errRateLimit', needsResend: false };
  if (/already (been )?registered|already exists/i.test(message)) return { key: 'auth.errExists', needsResend: false };
  if (/password.*(at least|short|weak|characters)/i.test(message)) return { key: 'auth.errWeakPassword', needsResend: false };
  if (/network|failed to fetch|fetch failed/i.test(message)) return { key: 'auth.errNetwork', needsResend: false };
  return { key: null, needsResend: false };
}

export function AuthOverlay({ onClose }: Props) {
  const { t } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsResend, setNeedsResend] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function showError(e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const mapped = friendlyError(message);
    setError(mapped.key ? t(mapped.key) : message);
    setNeedsResend(mapped.needsResend);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setNeedsResend(false);
  }

  async function handleSubmit() {
    setError(null);
    setNotice(null);
    setNeedsResend(false);

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t('auth.errEmail'));
      return;
    }
    if (mode === 'signUp' && password.length < MIN_PASSWORD) {
      setError(t('auth.errShortPassword'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: WEB_APP_URL,
        });
        if (resetError) throw resetError;
        setNotice(t('auth.resetSent'));
      } else if (mode === 'signIn') {
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
          options: { emailRedirectTo: WEB_APP_URL },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setSyncing(true);
          await syncOnSignIn(data.session.user.id);
          onClose();
        } else {
          setCheckEmail(true);
          setCooldown(RESEND_COOLDOWN_S);
        }
      }
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !EMAIL_PATTERN.test(email.trim())) return;
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: WEB_APP_URL },
    });
    if (resendError) {
      showError(resendError);
      return;
    }
    setNotice(t('auth.resent'));
    setCooldown(RESEND_COOLDOWN_S);
  }

  const resendButton = (
    <Pressable onPress={handleResend} disabled={cooldown > 0} style={styles.switchLink}>
      <Text style={[styles.switchLinkText, cooldown > 0 && styles.disabledText]}>
        {cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resend')}
      </Text>
    </Pressable>
  );

  const title =
    mode === 'reset' ? t('auth.resetTitle') : mode === 'signIn' ? t('auth.titleSignIn') : t('auth.titleSignUp');
  const subtitle = mode === 'reset' ? t('auth.resetSubtitle') : t('auth.subtitle');
  const submitLabel =
    mode === 'reset' ? t('auth.sendReset') : mode === 'signIn' ? t('auth.signIn') : t('auth.signUp');

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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {checkEmail ? (
              <View style={styles.checkEmailBox}>
                <Text style={styles.checkEmailText}>{t('auth.checkEmail')}</Text>
                {notice && <Text style={styles.notice}>{notice}</Text>}
                {error && <Text style={styles.error}>{error}</Text>}
                {resendButton}
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
                  textContentType="emailAddress"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                />

                {mode !== 'reset' && (
                  <>
                    <Text style={styles.label}>{t('auth.password')}</Text>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
                      placeholder="••••••••"
                      placeholderTextColor={colors.muted}
                      onSubmitEditing={handleSubmit}
                    />
                    {mode === 'signUp' && <Text style={styles.hint}>{t('auth.passwordHint')}</Text>}
                  </>
                )}

                {error && <Text style={styles.error}>{error}</Text>}
                {notice && <Text style={styles.notice}>{notice}</Text>}
                {needsResend && resendButton}

                <Pressable
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading || !email || (mode !== 'reset' && !password)}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{submitLabel}</Text>
                  )}
                </Pressable>

                {syncing && <Text style={styles.syncingText}>{t('auth.syncing')}</Text>}

                {mode === 'signIn' && (
                  <Pressable onPress={() => switchMode('reset')} style={styles.switchLink}>
                    <Text style={styles.switchLinkText}>{t('auth.forgot')}</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => switchMode(mode === 'signUp' ? 'signIn' : mode === 'reset' ? 'signIn' : 'signUp')}
                  style={styles.switchLink}
                >
                  <Text style={styles.switchLinkText}>
                    {mode === 'signIn'
                      ? t('auth.switchToSignUp')
                      : mode === 'reset'
                        ? t('auth.backToSignIn')
                        : t('auth.switchToSignIn')}
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

const makeStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  closeButton: { padding: 8 },
  content: { paddingHorizontal: 24, paddingTop: 16 },
  title: { color: colors.foreground, fontSize: 32, fontFamily: fonts.display },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 6, marginBottom: 24, lineHeight: 19 },
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
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
  error: { color: colors.orange, fontSize: 13, fontWeight: '600', marginTop: 14, lineHeight: 19 },
  notice: { color: colors.lime, fontSize: 13, fontWeight: '600', marginTop: 14, lineHeight: 19 },
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
  switchLink: { marginTop: 18, alignItems: 'center' },
  switchLinkText: { color: colors.lime, fontSize: 13, fontWeight: '700' },
  disabledText: { color: colors.muted },
  checkEmailBox: { marginTop: 12 },
  checkEmailText: { color: colors.foreground, fontSize: 15, lineHeight: 22 },
});
