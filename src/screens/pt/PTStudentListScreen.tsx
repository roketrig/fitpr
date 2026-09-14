import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../../i18n/useT';
import { fetchMyStudents } from '../../lib/coaching';
import { supabase } from '../../lib/supabase';
import { PTDashboardParamList } from '../../navigation/PTDashboardNavigator';
import { useProfileStore } from '../../store/profileStore';
import { colors, fonts } from '../../theme';
import { StudentSummary } from '../../types';

type Nav = NativeStackNavigationProp<PTDashboardParamList, 'PTStudentList'>;

export function PTStudentListScreen() {
  const { t } = useT();
  const navigation = useNavigation<Nav>();
  const referralCode = useProfileStore((s) => s.profile.referralCode);
  const [students, setStudents] = useState<StudentSummary[] | null>(null);

  const load = useCallback(() => {
    fetchMyStudents().then(setStudents);
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('pt.dashboardTitle')}</Text>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOut}>{t('pt.signOut')}</Text>
        </Pressable>
      </View>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>{t('pt.yourCode')}</Text>
        <Text style={styles.code}>{referralCode}</Text>
      </View>

      <Text style={styles.hint}>{t('pt.selectStudent')}</Text>

      {students === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.lime} />
      ) : students.length === 0 ? (
        <Text style={styles.empty}>{t('pt.noStudents')}</Text>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => s.studentId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.studentRow}
              onPress={() =>
                navigation.navigate('PTStudentEdit', {
                  studentId: item.studentId,
                  studentName: item.displayName,
                })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.studentName}>{item.displayName}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: { color: colors.foreground, fontSize: 32, fontFamily: fonts.display },
  signOut: { color: colors.orange, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  codeCard: {
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  codeLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  code: { color: colors.lime, fontSize: 32, fontFamily: fonts.display, letterSpacing: 4, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 13, marginHorizontal: 24, marginTop: 20, marginBottom: 8 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  list: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.lime, fontWeight: '800' },
  studentName: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
});
