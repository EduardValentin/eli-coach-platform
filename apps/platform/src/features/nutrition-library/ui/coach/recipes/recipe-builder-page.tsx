import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { RECIPE_BUILDER_ROUTE_HANDLE } from "~/features/nutrition-library/public/paths";
import { nutritionLibraryContext } from "~/features/nutrition-library/server/guards/nutrition-library-context.server";

import { RecipeBuilder } from "./recipe-builder";

export async function loader(args: LoaderFunctionArgs) {
  const { recipeLibrary } = args.context.get(nutritionLibraryContext);
  const { recipeId } = args.params;

  return recipeId === undefined
    ? recipeLibrary.loadNew(args)
    : recipeLibrary.load(args, recipeId);
}

export const handle = RECIPE_BUILDER_ROUTE_HANDLE;

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.recipe ? "Edit recipe" : "New recipe"} | Evoa` },
];

export default function RecipeBuilderRoute() {
  const view = useLoaderData<typeof loader>();

  return <RecipeBuilder key={view.recipe?.id ?? "new"} view={view} />;
}
