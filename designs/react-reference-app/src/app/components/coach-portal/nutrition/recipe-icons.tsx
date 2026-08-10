import {
  Soup, Salad, Sandwich, Pizza, Beef, Drumstick, Fish, EggFried,
  Croissant, CookingPot, CakeSlice, IceCreamBowl, Cookie, Donut,
  Coffee, CupSoda, UtensilsCrossed, type LucideIcon,
} from 'lucide-react';

export type RecipeIcon =
  | 'soup'
  | 'salad'
  | 'sandwich'
  | 'pizza'
  | 'steak'
  | 'poultry'
  | 'fish'
  | 'eggs'
  | 'pastry'
  | 'pot'
  | 'cake'
  | 'ice-cream'
  | 'cookie'
  | 'donut'
  | 'coffee'
  | 'smoothie'
  | 'meal';

export const RECIPE_ICONS: { key: RecipeIcon; label: string; Icon: LucideIcon }[] = [
  { key: 'soup',      label: 'Soup',      Icon: Soup },
  { key: 'salad',     label: 'Salad',     Icon: Salad },
  { key: 'sandwich',  label: 'Sandwich',  Icon: Sandwich },
  { key: 'pizza',     label: 'Pizza',     Icon: Pizza },
  { key: 'steak',     label: 'Steak',     Icon: Beef },
  { key: 'poultry',   label: 'Poultry',   Icon: Drumstick },
  { key: 'fish',      label: 'Fish',      Icon: Fish },
  { key: 'eggs',      label: 'Eggs',      Icon: EggFried },
  { key: 'pastry',    label: 'Pastry',    Icon: Croissant },
  { key: 'pot',       label: 'Stew',      Icon: CookingPot },
  { key: 'cake',      label: 'Cake',      Icon: CakeSlice },
  { key: 'ice-cream', label: 'Ice cream', Icon: IceCreamBowl },
  { key: 'cookie',    label: 'Cookie',    Icon: Cookie },
  { key: 'donut',     label: 'Donut',     Icon: Donut },
  { key: 'coffee',    label: 'Coffee',    Icon: Coffee },
  { key: 'smoothie',  label: 'Smoothie',  Icon: CupSoda },
  { key: 'meal',      label: 'Meal',      Icon: UtensilsCrossed },
];

const RECIPE_ICON_BY_KEY = Object.fromEntries(
  RECIPE_ICONS.map((r) => [r.key, r.Icon]),
) as Record<RecipeIcon, LucideIcon>;

export function recipeIcon(key?: RecipeIcon): LucideIcon {
  if (key && key in RECIPE_ICON_BY_KEY) return RECIPE_ICON_BY_KEY[key];
  return UtensilsCrossed;
}
