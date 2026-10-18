import { Plus, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CATEGORY_ORDER, EXERCISES } from '../constants/exercises';
import { useT } from '../i18n/useT';
import { Colors, useColors } from '../theme';
import { CategoryKey, ExerciseSlug } from '../types';

interface Props {
  assigned: Set<ExerciseSlug>;
  onPick: (slug: ExerciseSlug) => void;
}

// Searchable, category-grouped exercise list shared by the student's own
// program editor and the coach's web editor.
export function ExercisePickerList({ assigned, onPick }: Props) {
  const { t, exerciseName, categoryLabel } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return (CATEGORY_ORDER as readonly CategoryKey[])
      .map((category) => {
        const label = categoryLabel(category);
        const categoryMatches = q !== '' && label.toLocaleLowerCase().includes(q);
        const items = EXERCISES.filter(
          (e) =>
            e.category === category &&
            (q === '' || categoryMatches || exerciseName(e.slug).toLocaleLowerCase().includes(q))
        );
        return { category, items };
      })
      .filter((s) => s.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryLabel, exerciseName]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchWrap}>
        <Search size={16} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('program.searchExercise')}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query !== '' && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={sections}
        keyExtractor={(s) => s.category}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>{t('program.noResults')}</Text>}
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.category}>{categoryLabel(section.category)}</Text>
            {section.items.map((ex) => {
              const added = assigned.has(ex.slug);
              return (
                <Pressable
                  key={ex.slug}
                  style={[styles.row, added && styles.rowAdded]}
                  onPress={() => !added && onPick(ex.slug)}
                  disabled={added}
                >
                  <Text style={[styles.rowText, added && styles.rowTextAdded]}>{exerciseName(ex.slug)}</Text>
                  {added ? <Text style={styles.addedLabel}>✓</Text> : <Plus size={16} color={colors.lime} />}
                </Pressable>
              );
            })}
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 15, fontWeight: '600', paddingVertical: 13 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  category: { color: colors.lime, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  rowAdded: { opacity: 0.4 },
  rowText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  rowTextAdded: { color: colors.muted },
  addedLabel: { color: colors.lime, fontWeight: '800' },
});
