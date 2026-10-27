import type { MiddlewareFunction } from "react-router";

import { createAccountResolutionMiddleware } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-resolution-middleware.server";
import {
  accountsContext,
  type AccountsFeature,
} from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import {
  composeAccountsFeature,
  type AccountsFeatureHandles,
} from "~/bounded-contexts/access/accounts/composition.server";

export type AccessComposition = {
  components: { accounts: AccountsFeature };
  middleware: MiddlewareFunction<Response>;
  sessionMiddleware: MiddlewareFunction<Response>;
};

export function composeAccess(
  handles: AccountsFeatureHandles,
): AccessComposition {
  const accounts = composeAccountsFeature(handles);

  return {
    components: { accounts },
    middleware: ({ context }, next) => {
      context.set(accountsContext, accounts);
      return next();
    },
    sessionMiddleware: createAccountResolutionMiddleware(accounts),
  };
}
