import type { Recipe } from '../../../context/NutritionContext';
import { recipeIcon } from './recipe-icons';
import type { RecipeIcon } from './recipe-icons';

interface RecipeVisualProps {
  recipe: Pick<Recipe, 'imageUrl' | 'icon' | 'name'>;
  className?: string;
  iconSize?: number;
}

/**
 * Unified photo/icon/default visual for a recipe.
 *
 * Priority: imageUrl → icon from RecipeIcon set → UtensilsCrossed fallback.
 * Size/shape are controlled entirely by `className` (consumer sets h-*, w-*, rounded-*).
 * The icon scales via `iconSize` (default 28).
 */
export function RecipeVisual({ recipe, className = '', iconSize = 28 }: RecipeVisualProps) {
  if (recipe.imageUrl) {
    return (
      <img
        src={recipe.imageUrl}
        alt={recipe.name}
        className={`object-cover ${className}`}
      />
    );
  }

  const Icon = recipeIcon(recipe.icon as RecipeIcon | undefined);

  return (
    <div
      className={`flex items-center justify-center bg-muted ${className}`}
      role="img"
      aria-label={recipe.name}
    >
      <Icon size={iconSize} aria-hidden="true" />
    </div>
  );
}
