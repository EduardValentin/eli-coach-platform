import {
  Egg, Drumstick, Beef, Fish, Ham, Milk, Wheat, Croissant, Sandwich, Carrot, LeafyGreen,
  Salad, Sprout, Apple, Banana, Citrus, Cherry, Grape, Bean, Nut, Droplet, Cookie, Candy,
  IceCream, Cake, Soup, Coffee, Utensils, Clock, Moon, Sparkles, Leaf, type LucideIcon,
} from 'lucide-react';
import type { FoodIcon, TagFamily } from '../../../context/NutritionContext';

export const FOOD_ICONS: { key: FoodIcon; label: string; Icon: LucideIcon }[] = [
  { key: 'egg', label: 'Egg', Icon: Egg },
  { key: 'poultry', label: 'Poultry', Icon: Drumstick },
  { key: 'meat', label: 'Red meat', Icon: Beef },
  { key: 'fish', label: 'Fish', Icon: Fish },
  { key: 'ham', label: 'Deli / ham', Icon: Ham },
  { key: 'dairy', label: 'Dairy', Icon: Milk },
  { key: 'grain', label: 'Grain', Icon: Wheat },
  { key: 'bread', label: 'Bread', Icon: Croissant },
  { key: 'sandwich', label: 'Sandwich', Icon: Sandwich },
  { key: 'root-veg', label: 'Root veg', Icon: Carrot },
  { key: 'leafy', label: 'Leafy greens', Icon: LeafyGreen },
  { key: 'veg', label: 'Vegetable', Icon: Salad },
  { key: 'herb', label: 'Herb / spice', Icon: Sprout },
  { key: 'apple', label: 'Fruit', Icon: Apple },
  { key: 'banana', label: 'Banana', Icon: Banana },
  { key: 'citrus', label: 'Citrus', Icon: Citrus },
  { key: 'cherry', label: 'Berry', Icon: Cherry },
  { key: 'grape', label: 'Grapes', Icon: Grape },
  { key: 'legume', label: 'Legume / bean', Icon: Bean },
  { key: 'nut', label: 'Nut / seed', Icon: Nut },
  { key: 'oil', label: 'Oil / fat', Icon: Droplet },
  { key: 'chocolate', label: 'Chocolate', Icon: Cookie },
  { key: 'candy', label: 'Candy', Icon: Candy },
  { key: 'ice-cream', label: 'Ice cream', Icon: IceCream },
  { key: 'cake', label: 'Cake / dessert', Icon: Cake },
  { key: 'soup', label: 'Soup', Icon: Soup },
  { key: 'drink', label: 'Drink', Icon: Coffee },
  { key: 'other', label: 'Other', Icon: Utensils },
];

export const FOOD_ICON_BY_KEY = Object.fromEntries(FOOD_ICONS.map((f) => [f.key, f.Icon])) as Record<FoodIcon, LucideIcon>;

export function foodIcon(key: FoodIcon | undefined): LucideIcon {
  return FOOD_ICON_BY_KEY[key ?? 'other'];
}

export const TAG_FAMILY_ICON: Record<TagFamily, LucideIcon> = {
  'meal-time': Clock,
  'cycle-phase': Moon,
  nutrient: Sparkles,
  dietary: Leaf,
};
