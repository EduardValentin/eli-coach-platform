import { haveOnlyListingParamsChanged } from "~/shared/design-system/lib";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { NUTRITION_TAB_PARAM } from "~/bounded-contexts/programs/nutrition-library/public/paths";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";

import { NutritionHub } from "./nutrition-hub";

export async function loader(args: LoaderFunctionArgs) {
  const { foodLibraryController, recipeLibraryController } = args.context.get(
    nutritionLibraryContext,
  );
  const [{ foods, tags }, { recipes }] = await Promise.all([
    foodLibraryController.list(args),
    recipeLibraryController.list(args),
  ]);

  return { foods, tags, recipes };
}

export const meta: MetaFunction = () => [{ title: "Nutrition | Evoa" }];

export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return haveOnlyListingParamsChanged(currentUrl, nextUrl, [
    NUTRITION_TAB_PARAM,
  ])
    ? false
    : defaultShouldRevalidate;
}

export default function NutritionRoute() {
  const library = useLoaderData<typeof loader>();

  return <NutritionHub {...library} />;
}
