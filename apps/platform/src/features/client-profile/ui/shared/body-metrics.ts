export function waistToHeightRatio(
  waistCm: number,
  heightCm: number | null,
): string | null {
  if (heightCm === null || heightCm <= 0 || waistCm <= 0) {
    return null;
  }

  return (waistCm / heightCm).toFixed(2);
}
