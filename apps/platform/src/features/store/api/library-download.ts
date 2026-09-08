import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { productSlugSchema } from "~/features/store/contracts/store";
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

    const slug = productSlugSchema.safeParse(args.params.slug);

    if (!slug.success) {
      return Response.json(
        { error: "not_found" },
        { headers: { "Cache-Control": "private, no-store" }, status: 404 },
      );
    }

    return getPlatformContainer().storeLibraryController.downloadOwnedProduct(
      args,
      slug.data,
    );
  });
}
