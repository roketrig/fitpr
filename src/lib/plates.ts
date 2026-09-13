export const BAR_WEIGHT_KG = 20;
export const WEIGHT_STEP_KG = 2.5;

const PLATE_SIZES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export const PLATE_COLORS: Record<number, string> = {
  25: '#c9f533',
  20: '#c9f533',
  15: '#a8d129',
  10: '#a8d129',
  5: '#87ab21',
  2.5: '#87ab21',
  1.25: '#6b8619',
};

// Greedily splits the weight loaded on one side of the bar into plates.
export function platesForSide(perSideKg: number): number[] {
  let remaining = Math.round(perSideKg * 100) / 100;
  const plates: number[] = [];

  for (const size of PLATE_SIZES_KG) {
    while (remaining + 1e-6 >= size) {
      plates.push(size);
      remaining = Math.round((remaining - size) * 100) / 100;
    }
  }

  return plates;
}

export function perSideKg(totalWeightKg: number): number {
  return Math.max(0, (totalWeightKg - BAR_WEIGHT_KG) / 2);
}
