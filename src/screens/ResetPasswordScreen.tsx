import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useT } from '../i18n/useT';
import { supabase } from '../lib/supabase';
import { Colors, fonts, useColors } from '../theme';
import { EmailConfirmedScreen } from './EmailConfirmedScreen';

const MIN_PASSWORD = 6;

// Where a "reset password" email lands (web). The link carries a short-lived
// session in the URL; we adopt it, let the person pick a new password, then
// sign this browser out again — they sign in on the phone with the new one.
export function ResetPasswordScreen({
  accessToken,
  refreshToken,
}: {
  accessToken: string | null;
  refreshToken: string | null;
}) {
  const { t } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      setStatus('invalid');
      return;
    }
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => setStatus(sessionError ? 'invalid' : 'ready'));
  }, [accessToken, refreshToken]);

  async function handleSave() {
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(t('auth.errShortPassword'));
      return;
    }
    if (password !== confirm) {
      setError(t('reset.mismatch'));
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    await supabase.auth.signOut();
    window.history.replaceState(null, '', window.location.pathname);
    setSaving(false);
    setStatus('done');
  }

  if (status === 'invalid') return <EmailConfirmedScreen variant="error" />;
  if (status === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }
  if (status === 'done') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('reset.doneTitle')}</Text>
        <Text style={styles.body}>{t('reset.doneBody')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <View style={styles.form}>
        <Text style={styles.title}>{t('reset.title')}</Text>
        <Text style={styles.body}>{t('reset.subtitle')}</Text>

        <Text style={styles.label}>{t('reset.newPassword')}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.label}>{t('reset.confirmPassword')}</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          textContentType="newPassword"
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          onSubmitEditing={handleSave}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving || !password || !confirm}
        >
          {saving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>{t('reset.save')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  form: { width: '100%', maxWidth: 380 },
  title: { color: colors.foreground, fontSize: 30, fontFamily: fonts.display, textAlign: 'center' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 340 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 18 },
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
  error: { color: colors.orange, fontSize: 13, fontWeight: '600', marginTop: 14, lineHeight: 19 },
  button: { backgroundColor: colors.lime, borderRadius: 14, paddingVertical: 16, marginTop: 24, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
