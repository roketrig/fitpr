import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '../i18n/useT';
import { colors, fonts } from '../theme';

export function EmailConfirmedScreen() {
  const { t } = useT();

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <CheckCircle2 size={40} color={colors.background} strokeWidth={2.5} />
      </View>
      <Text style={styles.title}>{t('emailConfirmed.title')}</Text>
      <Text style={styles.body}>{t('emailConfirmed.body')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontFamily: fonts.display,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
});
