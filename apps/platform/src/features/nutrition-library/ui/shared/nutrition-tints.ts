import type { FoodCategory } from "@eli-coach-platform/domain/nutrition";
import type { ValueTile } from "@eli-coach-platform/ui/primitives";
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
  extra: "bg-tint-purple",
  seasoning: "bg-tint-teal",
};
