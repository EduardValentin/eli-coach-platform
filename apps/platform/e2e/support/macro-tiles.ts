import { expect, type Locator } from "@playwright/test";

export type MacroValues = {
  kcal: string;
  protein: string;
  carb: string;
  fat: string;
};

export const NO_MACROS: MacroValues = {
  kcal: "0",
  protein: "0",
  carb: "0",
  fat: "0",
};

export async function expectMacroTiles(
  tiles: Locator,
  macros: MacroValues,
): Promise<void> {
  await expect(tiles.getByRole("term")).toHaveText(["kcal", "P", "C", "F"]);
  await expect(tiles.getByRole("definition")).toHaveText([
    macros.kcal,
    `${macros.protein}g`,
    `${macros.carb}g`,
    `${macros.fat}g`,
  ]);
}
