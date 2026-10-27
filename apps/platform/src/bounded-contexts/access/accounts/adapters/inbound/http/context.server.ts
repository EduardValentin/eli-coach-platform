import { createContext, type RouterContext } from "react-router";

import type { ProvisionAccountUseCase } from "~/bounded-contexts/access/accounts/domain/account";
import type { AccountController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-controller.server";
import type { AccountWebhookController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/webhook-controller.server";

export type AccountsFeature = {
  account: AccountController;
  portal: {
    appBasePath: string;
    publicAppUrl: string | undefined;
    signInUrl: string;
  };
  provisioning: ProvisionAccountUseCase;
  webhooks: AccountWebhookController;
};

export const accountsContext: RouterContext<AccountsFeature> =
  createContext<AccountsFeature>();
