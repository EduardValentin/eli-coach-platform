import { createContext, type RouterContext } from "react-router";

import type { ProvisionAccountUseCase } from "~/bounded-contexts/access/accounts/domain/account";
import type { PortalLinks } from "~/bounded-contexts/access/public/session";
import type { AccountController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-controller.server";
import type { AccountWebhookController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-webhook-controller.server";
import type { InvitationsController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/public-site/invitations-controller.server";

export type AccountsFeature = {
  accountController: AccountController;
  invitationsController: InvitationsController;
  portal: PortalLinks;
  provisionAccountUseCase: ProvisionAccountUseCase;
  accountWebhookController: AccountWebhookController;
};

export const accountsContext: RouterContext<AccountsFeature> =
  createContext<AccountsFeature>();
