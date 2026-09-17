export type CoachingBundleId = "1-month" | "3-months" | "6-months";

export type CoachingBundle = {
  id: CoachingBundleId;
  isPopular?: boolean;
  months: number;
  pricePerMonth: number;
  title: string;
  totalPrice: number;
};

export const coachingBundles = [
  {
    id: "1-month",
    title: "1 Month",
    months: 1,
    pricePerMonth: 159,
    totalPrice: 159,
  },
  {
    id: "3-months",
    title: "3 Months",
    months: 3,
    pricePerMonth: 149,
    totalPrice: 447,
    isPopular: true,
  },
  {
    id: "6-months",
    title: "6 Months",
    months: 6,
    pricePerMonth: 139,
    totalPrice: 834,
  },
] as const satisfies readonly CoachingBundle[];

export const coachingBundleBenefits = [
  "Personalized workout and nutrition program",
  "Periodic progress check-ins",
  "Uninterrupted support with your coach",
  "Video form review and correction",
  "Access to the private community",
] as const;

export function resolveSavingsBadge(input: {
  baselinePerMonth: number;
  months: number;
  pricePerMonth: number;
}): string | undefined {
  if (input.months === 1 || input.pricePerMonth >= input.baselinePerMonth) {
    return undefined;
  }

  const savingsPct = Math.floor(
    ((input.baselinePerMonth - input.pricePerMonth) / input.baselinePerMonth) *
      100,
  );

  return savingsPct > 0 ? `Save ${savingsPct}%` : undefined;
}
