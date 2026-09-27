import { useThemeStore } from '../store/themeStore';

// Colors shared by every palette — background/panel/border/text never
// change when the user picks a different accent palette from Profile.
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
}

// "lime" and "orange" are the two accent roles used throughout the app
// (primary CTA/highlight, and secondary/destructive accent) — every
// palette just swaps what those two roles look like.
export const PALETTES: Palette[] = [
  { id: 'lime', nameKey: 'palette.lime', lime: '#c9f533', orange: '#ff744c' },
  { id: 'coral', nameKey: 'palette.coral', lime: '#F35B54', orange: '#603F83' },
  { id: 'bloom', nameKey: 'palette.bloom', lime: '#BBDF32', orange: '#F5BEC7' },
  { id: 'fogrose', nameKey: 'palette.fogrose', lime: '#EDFF00', orange: '#BD4275' },
  { id: 'ganache', nameKey: 'palette.ganache', lime: '#81D7D3', orange: '#C9A24B' },
];

export function colorsForPalette(paletteId: string): Colors {
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  return { ...BASE, lime: palette.lime, orange: palette.orange };
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
  display: 'RobotoCondensed_700Bold',
  displayRegular: 'RobotoCondensed_400Regular',
  body: undefined, // system default
};

export const radii = {
  md: 8,
  lg: 16,
};
