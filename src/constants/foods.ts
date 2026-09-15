export type FoodCategory = 'protein' | 'carbs' | 'dairy' | 'produce' | 'fats' | 'other';
export type FoodUnit = 'piece' | 'gram' | 'ml';

// Nutrition is stored per 100g/100ml — the standard basis every real food
// database (USDA FoodData Central, Nutritionix, Open Food Facts, ...) uses.
// Swapping this static list for a live API later only means fetching
// { caloriesPer100g, proteinPer100gG } per food instead of reading it from
// here — the quantity math and UI stay the same.
export interface Food {
  slug: string;
  category: FoodCategory;
  unit: FoodUnit;
  gramsPerPiece?: number; // only used when unit === 'piece'
  caloriesPer100g: number;
  proteinPer100gG: number;
}

export const FOODS: Food[] = [
  // protein
  { slug: 'egg', category: 'protein', unit: 'piece', gramsPerPiece: 50, caloriesPer100g: 155, proteinPer100gG: 13 },
  { slug: 'chicken_breast', category: 'protein', unit: 'gram', caloriesPer100g: 165, proteinPer100gG: 31 },
  { slug: 'turkey_breast', category: 'protein', unit: 'gram', caloriesPer100g: 135, proteinPer100gG: 30 },
  { slug: 'ground_beef', category: 'protein', unit: 'gram', caloriesPer100g: 215, proteinPer100gG: 26 },
  { slug: 'salmon', category: 'protein', unit: 'gram', caloriesPer100g: 208, proteinPer100gG: 20 },
  { slug: 'tuna_canned', category: 'protein', unit: 'gram', caloriesPer100g: 116, proteinPer100gG: 26 },
  { slug: 'shrimp', category: 'protein', unit: 'gram', caloriesPer100g: 99, proteinPer100gG: 24 },
  { slug: 'tofu', category: 'protein', unit: 'gram', caloriesPer100g: 76, proteinPer100gG: 8 },
  { slug: 'whey_protein', category: 'protein', unit: 'gram', caloriesPer100g: 400, proteinPer100gG: 80 },
  { slug: 'cottage_cheese', category: 'protein', unit: 'gram', caloriesPer100g: 98, proteinPer100gG: 11 },
  // carbs
  { slug: 'white_rice_cooked', category: 'carbs', unit: 'gram', caloriesPer100g: 130, proteinPer100gG: 2.7 },
  { slug: 'brown_rice_cooked', category: 'carbs', unit: 'gram', caloriesPer100g: 123, proteinPer100gG: 2.7 },
  { slug: 'bulgur_cooked', category: 'carbs', unit: 'gram', caloriesPer100g: 83, proteinPer100gG: 3.1 },
  { slug: 'pasta_cooked', category: 'carbs', unit: 'gram', caloriesPer100g: 131, proteinPer100gG: 5 },
  { slug: 'oats_dry', category: 'carbs', unit: 'gram', caloriesPer100g: 389, proteinPer100gG: 17 },
  { slug: 'quinoa_cooked', category: 'carbs', unit: 'gram', caloriesPer100g: 120, proteinPer100gG: 4.4 },
  { slug: 'white_bread', category: 'carbs', unit: 'piece', gramsPerPiece: 30, caloriesPer100g: 265, proteinPer100gG: 9 },
  { slug: 'whole_wheat_bread', category: 'carbs', unit: 'piece', gramsPerPiece: 32, caloriesPer100g: 247, proteinPer100gG: 13 },
  { slug: 'potato_boiled', category: 'carbs', unit: 'gram', caloriesPer100g: 87, proteinPer100gG: 1.9 },
  { slug: 'sweet_potato_boiled', category: 'carbs', unit: 'gram', caloriesPer100g: 90, proteinPer100gG: 2 },
  { slug: 'lentils_cooked', category: 'carbs', unit: 'gram', caloriesPer100g: 116, proteinPer100gG: 9 },
  { slug: 'chickpeas_cooked', category: 'carbs', unit: 'gram', caloriesPer100g: 164, proteinPer100gG: 8.9 },
  // dairy
  { slug: 'milk', category: 'dairy', unit: 'ml', caloriesPer100g: 61, proteinPer100gG: 3.2 },
  { slug: 'yogurt_plain', category: 'dairy', unit: 'gram', caloriesPer100g: 61, proteinPer100gG: 3.5 },
  { slug: 'greek_yogurt', category: 'dairy', unit: 'gram', caloriesPer100g: 59, proteinPer100gG: 10 },
  { slug: 'feta_cheese', category: 'dairy', unit: 'gram', caloriesPer100g: 264, proteinPer100gG: 14 },
  { slug: 'cheddar_cheese', category: 'dairy', unit: 'gram', caloriesPer100g: 402, proteinPer100gG: 25 },
  { slug: 'butter', category: 'dairy', unit: 'gram', caloriesPer100g: 717, proteinPer100gG: 0.9 },
  { slug: 'ayran', category: 'dairy', unit: 'ml', caloriesPer100g: 35, proteinPer100gG: 1.7 },
  // produce
  { slug: 'banana', category: 'produce', unit: 'piece', gramsPerPiece: 118, caloriesPer100g: 89, proteinPer100gG: 1.1 },
  { slug: 'apple', category: 'produce', unit: 'piece', gramsPerPiece: 182, caloriesPer100g: 52, proteinPer100gG: 0.3 },
  { slug: 'orange', category: 'produce', unit: 'piece', gramsPerPiece: 131, caloriesPer100g: 47, proteinPer100gG: 0.9 },
  { slug: 'avocado', category: 'produce', unit: 'piece', gramsPerPiece: 150, caloriesPer100g: 160, proteinPer100gG: 2 },
  { slug: 'tomato', category: 'produce', unit: 'piece', gramsPerPiece: 123, caloriesPer100g: 18, proteinPer100gG: 0.9 },
  { slug: 'cucumber', category: 'produce', unit: 'piece', gramsPerPiece: 120, caloriesPer100g: 15, proteinPer100gG: 0.7 },
  { slug: 'broccoli', category: 'produce', unit: 'gram', caloriesPer100g: 34, proteinPer100gG: 2.8 },
  { slug: 'spinach', category: 'produce', unit: 'gram', caloriesPer100g: 23, proteinPer100gG: 2.9 },
  // fats
  { slug: 'olive_oil', category: 'fats', unit: 'ml', caloriesPer100g: 884, proteinPer100gG: 0 },
  { slug: 'peanut_butter', category: 'fats', unit: 'gram', caloriesPer100g: 588, proteinPer100gG: 25 },
  { slug: 'walnuts', category: 'fats', unit: 'gram', caloriesPer100g: 654, proteinPer100gG: 15 },
  { slug: 'almonds', category: 'fats', unit: 'gram', caloriesPer100g: 579, proteinPer100gG: 21 },
  { slug: 'honey', category: 'fats', unit: 'gram', caloriesPer100g: 304, proteinPer100gG: 0.3 },
];

export const FOODS_BY_SLUG: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.slug, f]));

export const FOOD_CATEGORY_ORDER: FoodCategory[] = ['protein', 'carbs', 'dairy', 'produce', 'fats'];

export function computeFoodNutrition(food: Food, quantity: number): { calories: number; proteinG: number } {
  const grams = food.unit === 'piece' ? quantity * (food.gramsPerPiece ?? 100) : quantity;
  return {
    calories: Math.round((grams / 100) * food.caloriesPer100g),
    proteinG: Math.round((grams / 100) * food.proteinPer100gG),
  };
}

export function defaultQuantityFor(food: Food): number {
  return food.unit === 'piece' ? 1 : 100;
}

export function quantityStepFor(food: Food): number {
  return food.unit === 'piece' ? 1 : 10;
}
