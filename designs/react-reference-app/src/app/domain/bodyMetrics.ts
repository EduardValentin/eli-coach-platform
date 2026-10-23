export function waistToHeightRatio(
  waistCm: number,
  heightCm: number,
): number | null {
  if (heightCm <= 0 || waistCm <= 0) return null;

  return waistCm / heightCm;
}

export function formatRatio(ratio: number): string {
  return ratio.toFixed(2);
}

export function weightChangeKg(
  startingWeightKg: number,
  currentWeightKg: number,
): number {
  return currentWeightKg - startingWeightKg;
}
