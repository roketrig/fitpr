import {
  RobotoCondensed_400Regular,
  RobotoCondensed_700Bold,
  useFonts,
} from '@expo-google-fonts/roboto-condensed';
import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EmailConfirmedScreen } from './src/screens/EmailConfirmedScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

// Supabase's email confirmation/magic links redirect to this web deployment
// (it's the Auth "Site URL"). Most of our users are on the native app, so
// landing them in the full PT-dashboard-or-student-tabs web app after a
// confirmation click is jarring — show a plain "you're set, go back to the
// app" message for that one case instead.
function isEmailAuthRedirect(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const params = window.location.hash.replace(/^#/, '') + '&' + window.location.search.replace(/^\?/, '');
  return /(^|&)type=(signup|recovery|invite|magiclink|email_change)(&|$)/.test(params);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    RobotoCondensed_400Regular,
    RobotoCondensed_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  if (isEmailAuthRedirect()) {
    return <EmailConfirmedScreen />;
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
