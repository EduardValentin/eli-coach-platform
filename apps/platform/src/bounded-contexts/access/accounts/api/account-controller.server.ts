import type { LoaderFunctionArgs } from "react-router";

import { accountResponseSchema } from "~/bounded-contexts/access/accounts/public/account";
import { requireApiAccount } from "~/bounded-contexts/access/accounts/server/guards/require-account.server";

export class AccountController {
  getCurrentAccount(args: LoaderFunctionArgs): Response {
    const account = requireApiAccount(args);

    return Response.json(accountResponseSchema.parse({ role: account.role }));
  }
}
