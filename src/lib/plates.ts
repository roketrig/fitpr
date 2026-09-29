export const BAR_WEIGHT_KG = 20;
export const WEIGHT_STEP_KG = 2.5;

const PLATE_SIZES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

// How much darker each plate size is than the theme's accent color —
// bigger plates stay closest to the full accent, smaller ones step down.
// Shading off the *current* accent (instead of a hardcoded green) is what
// keeps plates matching whichever color palette is active.
const PLATE_SHADE_STEPS: Record<number, number> = {
  25: 0,
  20: 0,
  15: 0.16,
  10: 0.16,
  5: 0.32,
  2.5: 0.32,
  1.25: 0.48,
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
}

export function getPlateColor(sizeKg: number, accent: string): string {
  const step = PLATE_SHADE_STEPS[sizeKg] ?? 0;
  const [r, g, b] = hexToRgb(accent);
  return rgbToHex(r * (1 - step), g * (1 - step), b * (1 - step));
}

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
