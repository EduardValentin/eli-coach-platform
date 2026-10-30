const RATIO_DECIMAL_PLACES = 2;

export function waistToHeightRatio(
  waistCm: number | null,
  heightCm: number | null,
): string | null {
  if (waistCm === null || heightCm === null) return null;
  if (waistCm <= 0 || heightCm <= 0) return null;

  return (waistCm / heightCm).toFixed(RATIO_DECIMAL_PLACES);
}
