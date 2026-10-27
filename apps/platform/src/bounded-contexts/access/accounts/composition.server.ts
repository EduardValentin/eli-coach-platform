import type { DatabaseClient } from "~/shared/database";
import {
  DeleteAccountUseCase,
  ProvisionAccountUseCase,
  type InvitationAcceptance,
} from "~/bounded-contexts/access/accounts/domain/account";

import { AccountController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-controller.server";
import { AccountWebhookController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/webhook-controller.server";
import { PostgresAccountRepository } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/account-repository.server";
import { RandomAccountIds } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/random-account-ids.server";
import type { AccountsFeature } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";

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
