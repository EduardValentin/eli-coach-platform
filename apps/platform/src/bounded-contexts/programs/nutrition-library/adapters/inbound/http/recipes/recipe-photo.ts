import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";

const ALLOWED_METHODS = ["GET"];

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(nutritionLibraryContext)
      .recipeLibraryController.openPhoto(args, {
        recipeId: args.params.recipeId,
        photoId: args.params.photoId,
      }),
  );
}

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}
