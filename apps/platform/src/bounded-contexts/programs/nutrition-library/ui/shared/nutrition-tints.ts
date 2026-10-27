import type { FoodCategory } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import type { ValueTile } from "~/shared/design-system/primitives";
import type { ComponentProps } from "react";

type MacroTone = ComponentProps<typeof ValueTile>["tone"];

export const MACRO_TILE_TONE = {
  protein: "tint-red",
  carb: "tint-blue",
  fat: "tint-amber",
} as const satisfies Record<string, MacroTone>;

export const CATEGORY_DOT: Readonly<Record<FoodCategory, string>> = {
  protein: "bg-tint-red",
  carb: "bg-tint-blue",
  fat: "bg-tint-amber",
  legume: "bg-tint-green",
  extra: "bg-tint-violet",
  seasoning: "bg-tint-teal",
};
