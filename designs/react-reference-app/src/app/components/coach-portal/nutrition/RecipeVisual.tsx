import { useState } from 'react';
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
 * If the image fails to load (bad URL, offline) it degrades to the icon rather
 * than showing a broken-image glyph.
 * Size/shape are controlled entirely by `className` (consumer sets h-*, w-*, rounded-*).
 * The icon scales via `iconSize` (default 28).
 */
export function RecipeVisual({ recipe, className = '', iconSize = 28 }: RecipeVisualProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (recipe.imageUrl && !imgFailed) {
    return (
      <img
        src={recipe.imageUrl}
        alt={recipe.name}
        loading="lazy"
        onError={() => setImgFailed(true)}
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
