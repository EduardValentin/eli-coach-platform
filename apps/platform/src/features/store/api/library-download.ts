import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET"] });
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "GET") {
      throwMethodNotAllowedResponse({ allowedMethods: ["GET"] });
    }

    const container = getPlatformContainer();
    const account = container.requireApiAccount(args);

    return container.storeLibraryController.downloadOwnedProduct({
      rawSlug: args.params.slug,
      signedInAccountId: account.id,
    });
  });
}
