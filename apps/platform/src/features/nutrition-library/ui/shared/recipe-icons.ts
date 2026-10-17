import type { RecipeIcon } from "@eli-coach-platform/domain/nutrition";
import {
  Beef,
  CakeSlice,
  Coffee,
  CookingPot,
  Cookie,
  Croissant,
  CupSoda,
  Donut,
  Drumstick,
  EggFried,
  Fish,
  IceCreamBowl,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

type RecipeIconAppearance = { label: string; glyph: LucideIcon };

export const RECIPE_ICON_APPEARANCE: Readonly<
  Record<RecipeIcon, RecipeIconAppearance>
> = {
  soup: { label: "Soup", glyph: Soup },
  salad: { label: "Salad", glyph: Salad },
  sandwich: { label: "Sandwich", glyph: Sandwich },
  pizza: { label: "Pizza", glyph: Pizza },
  steak: { label: "Steak", glyph: Beef },
  poultry: { label: "Poultry", glyph: Drumstick },
  fish: { label: "Fish", glyph: Fish },
  eggs: { label: "Eggs", glyph: EggFried },
  pastry: { label: "Pastry", glyph: Croissant },
  pot: { label: "Stew", glyph: CookingPot },
  cake: { label: "Cake", glyph: CakeSlice },
  "ice-cream": { label: "Ice cream", glyph: IceCreamBowl },
  cookie: { label: "Cookie", glyph: Cookie },
  donut: { label: "Donut", glyph: Donut },
  coffee: { label: "Coffee", glyph: Coffee },
  smoothie: { label: "Smoothie", glyph: CupSoda },
  meal: { label: "Meal", glyph: UtensilsCrossed },
};

const NEUTRAL_RECIPE_GLYPH = UtensilsCrossed;

export function recipeGlyphOf(icon: RecipeIcon | null): LucideIcon {
  return icon === null
    ? NEUTRAL_RECIPE_GLYPH
    : RECIPE_ICON_APPEARANCE[icon].glyph;
}
