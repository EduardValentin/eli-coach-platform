import { EmptyState } from "~/shared/design-system/portal";
import { ChefHat } from "lucide-react";

import type { NutritionTagView } from "~/bounded-contexts/programs/nutrition-library/public/foods";
import type { RecipeCardView } from "~/bounded-contexts/programs/nutrition-library/public/recipes";

import { RecipeCard } from "./recipe-card";

type RecipeGridProps = {
  recipes: readonly RecipeCardView[];
  tags: readonly NutritionTagView[];
};

export function RecipeGrid({ recipes, tags }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <EmptyState
        description="Recipes you build appear here."
        icon={ChefHat}
        title="No recipes yet"
      />
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-parity="recipe-grid"
    >
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} tags={tags} />
      ))}
    </div>
  );
}
