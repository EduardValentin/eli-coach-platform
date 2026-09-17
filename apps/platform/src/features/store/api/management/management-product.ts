import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { storeContext } from "~/features/store/server/guards/store-context.server";

export async function action({ context, params, request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "PATCH") {
      throwMethodNotAllowedResponse({ allowedMethods: ["PATCH"] });
    }

    return context
      .get(storeContext)
      .management.retireProduct(request, params.productId);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["PATCH"] });
  });
}
