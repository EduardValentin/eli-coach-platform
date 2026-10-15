import { useEffect, useEffectEvent } from "react";
import { useFetcher } from "react-router";

import {
  foodProblemsAnswerSchema,
  foodSavedAnswerSchema,
  type FoodProblems,
  type FoodRequest,
} from "~/features/nutrition-library/public/foods";
import {
  foodPath,
  NUTRITION_LIBRARY_API_PATHS,
} from "~/features/nutrition-library/public/paths";

export type FoodSaveOutcome =
  | { status: "saved"; redirectTo: string }
  | { status: "refused"; problems: FoodProblems }
  | { status: "failed" };

function outcomeOf(answer: unknown): FoodSaveOutcome {
  const saved = foodSavedAnswerSchema.safeParse(answer);
  if (saved.success) {
    return { status: "saved", redirectTo: saved.data.redirectTo };
  }

  const refused = foodProblemsAnswerSchema.safeParse(answer);
  if (refused.success) {
    return { status: "refused", problems: refused.data.problems };
  }

  return { status: "failed" };
}

type FoodSaveTarget = { action: string; method: "post" | "put" };

function saveTargetOf(foodId: string | null): FoodSaveTarget {
  return foodId === null
    ? { action: NUTRITION_LIBRARY_API_PATHS.foods, method: "post" }
    : { action: foodPath(foodId), method: "put" };
}

export function useFoodSave(
  foodId: string | null,
  onSettled: (outcome: FoodSaveOutcome) => void,
) {
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent((answer: unknown) => {
    onSettled(outcomeOf(answer));
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const target = saveTargetOf(foodId);

  const save = (request: FoodRequest) => {
    void submit(request, {
      ...target,
      defaultShouldRevalidate: false,
      encType: "application/json",
    });
  };

  return { save, saving: state !== "idle" };
}
