import type { LoaderFunctionArgs } from "react-router";

import { accountResponseSchema } from "~/features/accounts/public/account";
import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";

export class AccountController {
  getCurrentAccount(args: LoaderFunctionArgs): Response {
    const account = requireApiAccount(args);

    return Response.json(accountResponseSchema.parse({ role: account.role }));
  }
}
