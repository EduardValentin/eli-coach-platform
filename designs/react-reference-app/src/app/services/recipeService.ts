export const RECIPE_SAVE_OUTCOMES = ['ok', 'fail'] as const;
export type RecipeSaveOutcome = (typeof RECIPE_SAVE_OUTCOMES)[number];

export const RECIPE_NOT_SAVED = "We couldn't save the recipe. Try again in a moment.";

export function saveRecipeThroughServer(outcome: RecipeSaveOutcome, write: () => void): void {
  if (outcome === 'fail') throw new Error(RECIPE_NOT_SAVED);
  write();
}
