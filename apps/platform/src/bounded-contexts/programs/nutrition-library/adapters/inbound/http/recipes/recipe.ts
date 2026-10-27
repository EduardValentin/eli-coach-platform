import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf } from "~/shared/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";

const ALLOWED_METHODS = ["PUT"];

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "PUT") {
      throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }

    return args.context
      .get(nutritionLibraryContext)
      .recipeLibrary.edit(args, args.params.recipeId);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}

export function clientAction({ serverAction }: ClientActionFunctionArgs) {
  return fetcherOutcomeOf(serverAction);
}
