import type { DatabaseClient } from "~/shared/database";
import {
  DeleteAccountUseCase,
  ProvisionAccountUseCase,
  type InvitationAcceptance,
} from "~/bounded-contexts/access/accounts/domain/account";

import { AccountController } from "~/bounded-contexts/access/accounts/api/account-controller.server";
import { AccountWebhookController } from "~/bounded-contexts/access/accounts/api/webhook-controller.server";
import { PostgresAccountRepository } from "~/bounded-contexts/access/accounts/data/account-repository.server";
import { RandomAccountIds } from "~/bounded-contexts/access/accounts/data/random-account-ids.server";

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

export type AccountsFeatureHandles = {
  bootstrapCoachAuthSubjectId: string | undefined;
  clerkWebhookSigningSecret: string | undefined;
  database: DatabaseClient;
  invitationAcceptance: InvitationAcceptance;
  portal: AccountsFeature["portal"];
};

export function composeAccountsFeature(
  handles: AccountsFeatureHandles,
): AccountsFeature {
  const repository = new PostgresAccountRepository(handles.database);

  return {
    account: new AccountController(),
    portal: handles.portal,
    provisioning: new ProvisionAccountUseCase({
      accounts: repository,
      ids: new RandomAccountIds(),
      bootstrapCoachAuthSubjectId: handles.bootstrapCoachAuthSubjectId,
      invitationAcceptance: handles.invitationAcceptance,
    }),
    webhooks: new AccountWebhookController({
      deletion: new DeleteAccountUseCase({ accounts: repository }),
      signingSecret: handles.clerkWebhookSigningSecret,
    }),
  };
}
