import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { PTStudentEditScreen } from '../screens/pt/PTStudentEditScreen';
import { PTStudentListScreen } from '../screens/pt/PTStudentListScreen';

export type PTDashboardParamList = {
  PTStudentList: undefined;
  PTStudentEdit: { studentId: string; studentName: string };
};

const Stack = createNativeStackNavigator<PTDashboardParamList>();

export function PTDashboardNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PTStudentList" component={PTStudentListScreen} />
      <Stack.Screen name="PTStudentEdit" component={PTStudentEditScreen} />
    </Stack.Navigator>
  );
}
