import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  RobotoCondensed_400Regular,
  RobotoCondensed_700Bold,
  useFonts,
} from '@expo-google-fonts/roboto-condensed';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EmailConfirmedScreen } from './src/screens/EmailConfirmedScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { detectAuthRedirect } from './src/lib/authRedirect';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

// Supabase's email links (confirm, reset password) redirect to this web
// deployment (it's the Auth "Site URL"). Most of our users are on the native
// app, so landing them in the full PT-dashboard-or-student-tabs web app after
// a click is jarring — those links get a plain page instead (see
// lib/authRedirect.ts for what counts as one).
const authRedirect = detectAuthRedirect();

export default function App() {
  const [fontsLoaded] = useFonts({
    RobotoCondensed_400Regular,
    RobotoCondensed_700Bold,
    BebasNeue_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  if (authRedirect?.kind === 'recovery') {
    return <ResetPasswordScreen accessToken={authRedirect.accessToken} refreshToken={authRedirect.refreshToken} />;
  }
  if (authRedirect) {
    return <EmailConfirmedScreen variant={authRedirect.kind === 'error' ? 'error' : 'confirmed'} />;
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
