import type { LoaderFunctionArgs } from "react-router";

import { handleHttpErrorResponse } from "~/shared/http/index.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context.get(accountsContext).accountController.getCurrentAccount(args),
  );
}
