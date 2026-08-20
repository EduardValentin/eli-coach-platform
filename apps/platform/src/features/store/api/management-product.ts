import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

export async function action({ params, request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "PATCH") {
      throwMethodNotAllowedResponse({ allowedMethods: ["PATCH"] });
    }

    return getPlatformContainer().storeProductManagementController.retireProduct(
      request,
      params.productId,
    );
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["PATCH"] });
  });
}
