import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { RECIPE_BUILDER_ROUTE_HANDLE } from "~/bounded-contexts/programs/nutrition-library/public/paths";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";

import { RecipeBuilder } from "./recipe-builder";

export async function loader(args: LoaderFunctionArgs) {
  const { recipeLibrary } = args.context.get(nutritionLibraryContext);
  const { recipeId } = args.params;

  return recipeId === undefined
    ? recipeLibrary.loadNew(args)
    : recipeLibrary.load(args, recipeId);
}

export const handle = RECIPE_BUILDER_ROUTE_HANDLE;

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: `${loaderData?.recipe ? "Edit recipe" : "New recipe"} | Evoa` },
];

export default function RecipeBuilderRoute() {
  const view = useLoaderData<typeof loader>();

  return <RecipeBuilder key={view.recipe?.id ?? "new"} view={view} />;
}
