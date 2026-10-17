export const FOOD_SAVE_OUTCOMES = ['ok', 'fail'] as const;
export type FoodSaveOutcome = (typeof FOOD_SAVE_OUTCOMES)[number];

export const FOOD_NOT_SAVED = "We couldn't save the food. Try again in a moment.";

export function saveFoodThroughServer(outcome: FoodSaveOutcome, write: () => void): void {
  if (outcome === 'fail') throw new Error(FOOD_NOT_SAVED);
  write();
}
