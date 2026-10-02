import { Camera, ChevronLeft, Minus, Plus, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeFoodNutrition, defaultQuantityFor, Food, FOOD_CATEGORY_ORDER, FOODS, quantityStepFor } from '../constants/foods';
import { useT } from '../i18n/useT';
import { pickImage, uploadImage } from '../lib/media';
import { useAuthStore } from '../store/authStore';
import { Colors, fonts, useColors } from '../theme';
import { NewFoodLogEntry } from '../types';

interface Props {
  onClose: () => void;
  onAdd: (entry: NewFoodLogEntry) => void;
}

export function AddFoodOverlay({ onClose, onAdd }: Props) {
  const { t, foodName, foodCategoryLabel } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const session = useAuthStore((s) => s.session);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleAddPhoto() {
    Alert.alert(t('profile.changePhoto'), undefined, [
      { text: t('profile.takePhoto'), onPress: async () => setPhotoUri(await pickImage('camera')) },
      { text: t('profile.chooseFromLibrary'), onPress: async () => setPhotoUri(await pickImage('library')) },
      { text: t('profile.cancel'), style: 'cancel' },
    ]);
  }

  async function resolvePhotoPath(): Promise<string | null> {
    if (!photoUri || !session) return null;
    const path = `${session.user.id}/${Date.now()}.jpg`;
    await uploadImage('food-photos', path, photoUri);
    return path;
  }

  function unitLabel(food: Food): string {
    if (food.unit === 'piece') return t('nutrition.pieces');
    if (food.unit === 'ml') return t('nutrition.ml');
    return t('nutrition.grams');
  }

  function selectFood(food: Food) {
    setSelectedFood(food);
    setQuantity(defaultQuantityFor(food));
  }

  async function handleAddFromFood() {
    if (!selectedFood || saving) return;
    setSaving(true);
    const photoPath = await resolvePhotoPath().catch(() => null);
    const { calories, proteinG } = computeFoodNutrition(selectedFood, quantity);
    onAdd({
      foodSlug: selectedFood.slug,
      label: foodName(selectedFood.slug),
      quantity,
      calories,
      proteinG,
      photoPath,
    });
    onClose();
  }

  async function handleAddCustom() {
    if (!customName.trim() || saving) return;
    setSaving(true);
    const photoPath = await resolvePhotoPath().catch(() => null);
    onAdd({
      foodSlug: null,
      label: customName.trim(),
      quantity: 1,
      calories: Number(customCalories) || 0,
      proteinG: Number(customProtein) || 0,
      photoPath,
    });
    onClose();
  }

  const showingDetail = selectedFood !== null || customMode;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          {showingDetail ? (
            <Pressable
              style={styles.backButton}
              onPress={() => {
                setSelectedFood(null);
                setCustomMode(false);
              }}
            >
              <ChevronLeft size={20} color={colors.foreground} />
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
          <Text style={styles.title}>{t('nutrition.pickFood')}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {!showingDetail && (
          <FlatList
            data={FOOD_CATEGORY_ORDER}
            keyExtractor={(c) => c}
            contentContainerStyle={{ padding: 16 }}
            ListHeaderComponent={
              <Pressable style={styles.customButton} onPress={() => setCustomMode(true)}>
                <Text style={styles.customButtonText}>{t('nutrition.customFood')}</Text>
              </Pressable>
            }
            renderItem={({ item: category }) => (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.categoryLabel}>{foodCategoryLabel(category)}</Text>
                {FOODS.filter((f) => f.category === category).map((food) => (
                  <Pressable key={food.slug} style={styles.foodRow} onPress={() => selectFood(food)}>
                    <Text style={styles.foodRowText}>{foodName(food.slug)}</Text>
                    <Plus size={16} color={colors.lime} />
                  </Pressable>
                ))}
              </View>
            )}
          />
        )}

        {selectedFood && (
          <View style={styles.detail}>
            <Text style={styles.detailName}>{foodName(selectedFood.slug)}</Text>
            <View style={styles.quantityRow}>
              <Pressable
                style={styles.quantityButton}
                onPress={() =>
                  setQuantity((q) => Math.max(quantityStepFor(selectedFood), q - quantityStepFor(selectedFood)))
                }
              >
                <Minus size={18} color={colors.lime} strokeWidth={3} />
              </Pressable>
              <Text style={styles.quantityValue}>
                {quantity} {unitLabel(selectedFood)}
              </Text>
              <Pressable
                style={styles.quantityButton}
                onPress={() => setQuantity((q) => q + quantityStepFor(selectedFood))}
              >
                <Plus size={18} color={colors.lime} strokeWidth={3} />
              </Pressable>
            </View>
            <Text style={styles.preview}>
              {computeFoodNutrition(selectedFood, quantity).calories} kcal ·{' '}
              {computeFoodNutrition(selectedFood, quantity).proteinG}g {t('coach.protein').toLowerCase()}
            </Text>
            <Pressable style={styles.photoButton} onPress={handleAddPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoThumb} />
              ) : (
                <Camera size={18} color={colors.muted} />
              )}
              <Text style={styles.photoButtonText}>
                {photoUri ? t('profile.changePhoto') : t('nutrition.addPhoto')}
              </Text>
            </Pressable>
            <Pressable style={styles.addButton} onPress={handleAddFromFood} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.addButtonText}>{t('nutrition.add')}</Text>
              )}
            </Pressable>
          </View>
        )}

        {customMode && (
          <View style={styles.detail}>
            <Text style={styles.label}>{t('nutrition.foodName')}</Text>
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder={t('nutrition.foodNamePlaceholder')}
              placeholderTextColor={colors.muted}
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>{t('coach.calories')}</Text>
                <TextInput
                  style={styles.input}
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>{t('coach.protein')}</Text>
                <TextInput
                  style={styles.input}
                  value={customProtein}
                  onChangeText={setCustomProtein}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </View>
            <Text style={styles.hint}>{t('nutrition.customFoodHint')}</Text>
            <Pressable style={styles.photoButton} onPress={handleAddPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoThumb} />
              ) : (
                <Camera size={18} color={colors.muted} />
              )}
              <Text style={styles.photoButtonText}>
                {photoUri ? t('profile.changePhoto') : t('nutrition.addPhoto')}
              </Text>
            </Pressable>
            <Pressable style={styles.addButton} onPress={handleAddCustom} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.addButtonText}>{t('nutrition.add')}</Text>
              )}
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, zIndex: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  backButton: { padding: 8, width: 36 },
  closeButton: { padding: 8, width: 36, alignItems: 'flex-end' },
  title: { color: colors.foreground, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  customButton: {
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  customButtonText: { color: colors.lime, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  categoryLabel: { color: colors.lime, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  foodRow: {
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
  foodRowText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  detail: { padding: 24 },
  detailName: { color: colors.foreground, fontSize: 26, fontFamily: fonts.display, textAlign: 'center' },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 24,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: { color: colors.foreground, fontSize: 20, fontWeight: '700', minWidth: 100, textAlign: 'center' },
  preview: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 16 },
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
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 17 },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  photoThumb: { width: 22, height: 22, borderRadius: 6 },
  photoButtonText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  addButton: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  addButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
