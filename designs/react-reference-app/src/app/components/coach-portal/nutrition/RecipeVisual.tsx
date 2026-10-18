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
export function RecipeVisual({
  recipe,
  className = '',
  iconSize = 28,
}: RecipeVisualProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>();

  if (recipe.imageUrl && recipe.imageUrl !== failedImageUrl) {
    const imageUrl = recipe.imageUrl;
    const markFailed = () => setFailedImageUrl(imageUrl);
    const markFailedWhenAlreadyBroken = (image: HTMLImageElement | null) => {
      if (image?.complete && image.naturalWidth === 0) markFailed();
    };
    return (
      <img
        ref={markFailedWhenAlreadyBroken}
        src={imageUrl}
        alt={recipe.name}
        loading="lazy"
        onError={markFailed}
        className={`object-cover ${className}`}
        data-parity="recipe-visual"
      />
    );
  }

  const Icon = recipeIcon(recipe.icon as RecipeIcon | undefined);

  return (
    <div
      className={`flex items-center justify-center bg-surface-quiet ${className}`}
      role="img"
      aria-label={recipe.name}
      data-parity="recipe-visual"
    >
      <Icon size={iconSize} aria-hidden="true" />
    </div>
  );
}
