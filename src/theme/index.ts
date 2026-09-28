import { useThemeStore } from '../store/themeStore';

// The original palette's exact base — kept hardcoded and untouched per
// explicit request ("bu renk paketi net bir şekilde kalsın").
const BASE = {
  background: '#101210',
  panel: '#171a17',
  card: '#1b1e1b',
  border: '#343934',
  foreground: '#f4f5ed',
  muted: '#92988c',
};

export interface Colors {
  background: string;
  panel: string;
  card: string;
  border: string;
  foreground: string;
  muted: string;
  lime: string;
  orange: string;
}

export interface Palette {
  id: string;
  nameKey: string;
  lime: string;
  orange: string;
  // A hue used to tint the whole dark base (background/panel/card/border/
  // muted/foreground), not just the two accent roles — switching palettes
  // should change the mood of the whole screen, not just button colors.
  // Omitted only for "lime", which keeps the exact original base above.
  seed?: string;
}

export const PALETTES: Palette[] = [
  { id: 'lime', nameKey: 'palette.lime', lime: '#c9f533', orange: '#ff744c' },
  { id: 'coral', nameKey: 'palette.coral', lime: '#F35B54', orange: '#603F83', seed: '#F35B54' },
  { id: 'bloom', nameKey: 'palette.bloom', lime: '#F5BEC7', orange: '#BBDF32', seed: '#F5BEC7' },
  { id: 'fogrose', nameKey: 'palette.fogrose', lime: '#EDFF00', orange: '#BD4275', seed: '#BD4275' },
  { id: 'ganache', nameKey: 'palette.ganache', lime: '#81D7D3', orange: '#C9A24B', seed: '#34292A' },
  { id: 'electric', nameKey: 'palette.electric', lime: '#3AA6FF', orange: '#FF9F1C', seed: '#3AA6FF' },
];

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

// Offsets a neutral gray toward a seed color's hue, by an amount
// proportional to how far the seed itself sits from gray — a strongly
// saturated seed (e.g. a vivid red) tints harder than a soft pastel one,
// the same way the original palette's near-black base already leans
// faintly green to match its lime accent.
function tintedGray(seed: string, gray: number, strength: number): string {
  const [r, g, b] = hexToRgb(seed);
  const avg = (r + g + b) / 3;
  return rgbToHex(gray + (r - avg) * strength, gray + (g - avg) * strength, gray + (b - avg) * strength);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function colorsForPalette(paletteId: string): Colors {
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  if (!palette.seed) {
    return { ...BASE, lime: palette.lime, orange: palette.orange };
  }
  const seed = palette.seed;
  return {
    background: tintedGray(seed, 17, 0.16),
    panel: tintedGray(seed, 24, 0.16),
    card: tintedGray(seed, 29, 0.16),
    border: tintedGray(seed, 54, 0.2),
    foreground: tintedGray(seed, 244, 0.035),
    muted: tintedGray(seed, 148, 0.1),
    lime: palette.lime,
    orange: palette.orange,
  };
}

// Static default for the rare non-component usage — always the original
// palette. Components should use useColors() instead so palette changes
// actually show up.
export const colors: Colors = colorsForPalette('lime');

export function useColors(): Colors {
  const paletteId = useThemeStore((s) => s.paletteId);
  return colorsForPalette(paletteId);
}

export const fonts = {
  display: 'BebasNeue_400Regular',
  displayRegular: 'RobotoCondensed_400Regular',
  body: undefined, // system default
};

export const radii = {
  md: 8,
  lg: 16,
};
