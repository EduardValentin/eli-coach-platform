import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { storeContext } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";

export async function action({ context, params, request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return context
      .get(storeContext)
      .storeProductManagementController.publishProductVersion(
        request,
        params.productId,
      );
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
  });
}
