// Turkish (and most European) keyboards type the decimal separator as a
// comma, and Number('72,5') is NaN — which used to silently become 0 or null.
export function parseDecimal(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
