import type { RecipeMacrosSnapshot } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import { ValueTile } from "~/shared/design-system/primitives";

import { MACRO_TILE_TONE } from "~/bounded-contexts/programs/nutrition-library/ui/shared/nutrition-tints";

type MacroTilesProps = {
  macros: RecipeMacrosSnapshot;
  kcalTone: "quiet" | "base";
  parity?: string;
};

export function MacroTiles({ macros, kcalTone, parity }: MacroTilesProps) {
  return (
    <dl className="grid grid-cols-4 gap-2" data-parity={parity}>
      <ValueTile label="kcal" tone={kcalTone} value={macros.kcal} />
      <ValueTile
        label="P"
        tone={MACRO_TILE_TONE.protein}
        value={`${macros.protein}g`}
      />
      <ValueTile
        label="C"
        tone={MACRO_TILE_TONE.carb}
        value={`${macros.carb}g`}
      />
      <ValueTile
        label="F"
        tone={MACRO_TILE_TONE.fat}
        value={`${macros.fat}g`}
      />
    </dl>
  );
}
