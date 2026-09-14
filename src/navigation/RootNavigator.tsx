import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { CalendarDays, Dumbbell, Trophy, UserRound } from 'lucide-react-native';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n/useT';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProgramScreen } from '../screens/ProgramScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { useProfileStore } from '../store/profileStore';
import { colors } from '../theme';
import { PTDashboardNavigator } from './PTDashboardNavigator';

const Tab = createBottomTabNavigator();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: colors.border,
    primary: colors.lime,
    text: colors.foreground,
  },
};

const ICONS = {
  Workout: Dumbbell,
  Program: CalendarDays,
  Achievements: Trophy,
  Profile: UserRound,
} as const;

function StudentTabs() {
  const { t } = useT();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
        tabBarIcon: ({ color, size }) => {
          const Icon = ICONS[route.name as keyof typeof ICONS];
          return <Icon color={color} size={size ?? 20} />;
        },
      })}
    >
      <Tab.Screen name="Workout" component={WorkoutScreen} options={{ tabBarLabel: t('nav.workout') }} />
      <Tab.Screen name="Program" component={ProgramScreen} options={{ tabBarLabel: t('nav.program') }} />
      <Tab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ tabBarLabel: t('nav.achievements') }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('nav.profile') }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const role = useProfileStore((s) => s.profile.role);
  // PTs manage clients from a desktop-oriented dashboard on the web build;
  // the native mobile app stays the student (and PT-on-the-go) experience.
  const showPtDashboard = Platform.OS === 'web' && role === 'pt';

  return (
    <NavigationContainer theme={navTheme}>
      {showPtDashboard ? <PTDashboardNavigator /> : <StudentTabs />}
    </NavigationContainer>
  );
}
