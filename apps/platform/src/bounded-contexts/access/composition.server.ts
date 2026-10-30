import type { MiddlewareFunction } from "react-router";

import { createAccountResolutionMiddleware } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-resolution-middleware.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import {
  composeAccountsFeature,
  type AccountsFeatureHandles,
} from "~/bounded-contexts/access/accounts/composition.server";

export type AccessComposition = {
  facades: ReturnType<typeof composeAccountsFeature>["facades"];
  middleware: MiddlewareFunction<Response>;
  sessionMiddleware: MiddlewareFunction<Response>;
};

export function composeAccess(
  handles: AccountsFeatureHandles,
): AccessComposition {
  const { facades, feature: accounts } = composeAccountsFeature(handles);

  return {
    facades,
    middleware: ({ context }, next) => {
      context.set(accountsContext, accounts);
      return next();
    },
    sessionMiddleware: createAccountResolutionMiddleware(accounts),
  };
}
