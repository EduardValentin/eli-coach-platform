import type { DatabaseClient } from "~/shared/database";
import {
  AccountInvitationGate,
  AllowAccountUseCase,
  DeleteAccountUseCase,
  FindAcceptedInvitationUseCase,
  ProvisionAccountUseCase,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { Clock } from "~/bounded-contexts/access/accounts/domain/clock";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations";

import { AccountController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-controller.server";
import { AccountWebhookController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/webhook-controller.server";
import { createAccountInvitationsFacade } from "~/bounded-contexts/access/accounts/adapters/inbound/facades/account-invitations.server";
import {
  createInvitationReferences,
  type IdentityReadConfig,
} from "~/bounded-contexts/access/accounts/adapters/outbound/identity/create-invitation-references.server";
import { PostgresAccountInvitations } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/account-invitations-repository.server";
import { PostgresAccountRepository } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/account-repository.server";
import { RandomAccountIds } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/random-account-ids.server";
import type { AccountsFeature } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";

export type AccountsFeatureHandles = {
  bootstrapCoachAuthSubjectId: string | undefined;
  clerkWebhookSigningSecret: string | undefined;
  clock: Clock;
  database: DatabaseClient;
  identityConfig: IdentityReadConfig;
  portal: AccountsFeature["portal"];
};

type AccountsComposition = {
  facades: { accountInvitations: AccountInvitationsFacade };
  feature: AccountsFeature;
};

export function composeAccountsFeature(
  handles: AccountsFeatureHandles,
): AccountsComposition {
  const repository = new PostgresAccountRepository(handles.database);
  const invitations = new PostgresAccountInvitations(handles.database);

  return {
    facades: {
      accountInvitations: createAccountInvitationsFacade({
        allowAccount: new AllowAccountUseCase({ invitations }),
        findAcceptedInvitation: new FindAcceptedInvitationUseCase({
          invitations,
        }),
      }),
    },
    feature: {
      account: new AccountController(),
      portal: handles.portal,
      provisioning: new ProvisionAccountUseCase({
        accounts: repository,
        ids: new RandomAccountIds(),
        bootstrapCoachAuthSubjectId: handles.bootstrapCoachAuthSubjectId,
        invitationGate: new AccountInvitationGate({
          clock: handles.clock,
          invitations,
          references: createInvitationReferences(handles.identityConfig),
        }),
      }),
      webhooks: new AccountWebhookController({
        deletion: new DeleteAccountUseCase({ accounts: repository }),
        signingSecret: handles.clerkWebhookSigningSecret,
      }),
    },
  };
}
