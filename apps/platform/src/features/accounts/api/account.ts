import type { LoaderFunctionArgs } from "react-router";

import { handleHttpErrorResponse } from "@eli-coach-platform/infrastructure/http/server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context.get(accountsContext).account.getCurrentAccount(args),
  );
}
