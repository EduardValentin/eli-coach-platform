import { cn, LABEL_CLASS } from "@eli-coach-platform/ui/lib";
import {
  cardVariants,
  ItemVisual,
  RowActionsMenu,
} from "@eli-coach-platform/ui/primitives";
import { Clock, Pencil } from "lucide-react";
import { useNavigate } from "react-router";

import type { NutritionTagView } from "~/features/nutrition-library/public/foods";
import { recipeBuilderPath } from "~/features/nutrition-library/public/paths";
import type { RecipeCardView } from "~/features/nutrition-library/public/recipes";
import { MacroTiles } from "~/features/nutrition-library/ui/shared/macro-tiles";
import { recipeGlyphOf } from "~/features/nutrition-library/ui/shared/recipe-icons";
import { TagPill } from "~/features/nutrition-library/ui/shared/tag-pill";

type RecipeCardProps = {
  recipe: RecipeCardView;
  tags: readonly NutritionTagView[];
};

export function RecipeCard({ recipe, tags }: RecipeCardProps) {
  const navigate = useNavigate();
  const recipeTags = recipe.tagIds.flatMap((tagId) =>
    tags.filter((tag) => tag.id === tagId),
  );

  return (
    <article
      aria-label={recipe.name}
      className={cn(
        cardVariants({ variant: "item" }),
        "flex flex-col overflow-hidden",
      )}
      data-parity-root="RecipeCard"
    >
      <ItemVisual
        className="h-32 w-full"
        data-parity="recipe-visual"
        icon={recipeGlyphOf(recipe.icon)}
        name={recipe.name}
      />
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-text-primary">
              {recipe.name}
            </h2>
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
              <Clock aria-hidden="true" size={12} /> {recipe.totalMinutes} min
            </span>
          </div>
          <div
            className="flex items-center justify-end"
            data-parity="library-item-actions"
          >
            <RowActionsMenu
              actions={[
                {
                  icon: Pencil,
                  label: "Edit",
                  name: "edit",
                  onSelect: () => void navigate(recipeBuilderPath(recipe.id)),
                },
              ]}
              label={`Actions for ${recipe.name}`}
            />
          </div>
        </div>

        <div>
          <p className={cn("mb-1.5", LABEL_CLASS)}>Per recipe</p>
          <MacroTiles
            kcalTone="quiet"
            macros={recipe.macros}
            parity="recipe-macro-tiles"
          />
        </div>

        {recipeTags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {recipeTags.map((tag) => (
              <li key={tag.id}>
                <TagPill tag={tag} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
