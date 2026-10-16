import { ListingToolbar } from "@eli-coach-platform/ui/filters";
import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@eli-coach-platform/ui/tabs";
import { Plus } from "lucide-react";
import { Link } from "react-router";

import type {
  FoodView,
  NutritionTagView,
} from "~/features/nutrition-library/public/foods";
import {
  NEW_FOOD_PATH,
  NEW_RECIPE_PATH,
  NUTRITION_TAB_PARAM,
  NUTRITION_TABS,
  nutritionTabOf,
  type NutritionTab,
} from "~/features/nutrition-library/public/paths";
import type { RecipeCardView } from "~/features/nutrition-library/public/recipes";
import { FoodTable } from "~/features/nutrition-library/ui/coach/foods/food-table";
import { RecipeGrid } from "~/features/nutrition-library/ui/coach/recipes/recipe-grid";

const HEADER_ACTIONS: Readonly<
  Record<NutritionTab, { label: string; to: string }>
> = {
  foods: { label: "New food", to: NEW_FOOD_PATH },
  recipes: { label: "New recipe", to: NEW_RECIPE_PATH },
};

const TAB_LABELS: Readonly<Record<NutritionTab, string>> = {
  foods: "Foods",
  recipes: "Recipes",
};

type NutritionHubProps = {
  foods: readonly FoodView[];
  tags: readonly NutritionTagView[];
  recipes: readonly RecipeCardView[];
};

export function NutritionHub({ foods, tags, recipes }: NutritionHubProps) {
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const tab = nutritionTabOf(searchParams);
  const action = HEADER_ACTIONS[tab];

  const chooseTab = (chosen: string) =>
    replaceSearchParams((params) => params.set(NUTRITION_TAB_PARAM, chosen));

  const tabs = (
    <TabsList>
      {NUTRITION_TABS.map((value) => (
        <TabsTrigger className="px-4 sm:px-5" key={value} value={value}>
          {TAB_LABELS[value]}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <div className="w-full" data-parity-root="NutritionHub">
      <PortalPageHeader
        actions={
          <Link
            className={buttonVariants({ size: "md", variant: "primary" })}
            to={action.to}
          >
            <Plus aria-hidden="true" size={16} />
            {action.label}
          </Link>
        }
        subtitle="Build your food library and recipes."
        title="Nutrition"
      />

      <Tabs
        className="w-full"
        onValueChange={chooseTab}
        value={tab}
        variant="segmented"
      >
        <TabsContent value="foods">
          <ListingToolbar parity="nutrition-toolbar" view={tabs} />
          <FoodTable foods={foods} tags={tags} />
        </TabsContent>
        <TabsContent value="recipes">
          <ListingToolbar parity="nutrition-toolbar" view={tabs} />
          <RecipeGrid recipes={recipes} tags={tags} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
