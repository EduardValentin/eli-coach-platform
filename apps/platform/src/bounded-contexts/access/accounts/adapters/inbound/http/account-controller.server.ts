import type { LoaderFunctionArgs } from "react-router";

import { accountResponseSchema } from "~/bounded-contexts/access/accounts/public/account";
import { accessContext } from "~/bounded-contexts/access/public/session";

export class AccountController {
  getCurrentAccount(args: LoaderFunctionArgs): Response {
    const account = args.context.get(accessContext).requireAccount();

    return Response.json(accountResponseSchema.parse({ role: account.role }));
  }
}
