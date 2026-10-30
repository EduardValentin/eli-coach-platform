import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { coachingSalesContext } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/context.server";

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return args.context
      .get(coachingSalesContext)
      .checkoutsController.startCheckout(args);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
  });
}
