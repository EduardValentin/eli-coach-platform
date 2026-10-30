import type { DatabaseClient } from "~/shared/database";
import { buildRedirectPath } from "~/shared/http/base-path";
import type { ProductEmail } from "~/shared/email/index.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import {
  AccountInvitationGate,
  DeleteAccountUseCase,
  EnsureInvitationDeliveredUseCase,
  FindAcceptedInvitationUseCase,
  IssueInvitationUseCase,
  ProvisionAccountUseCase,
  ReadInvitationStandingUseCase,
  ResendInvitationUseCase,
  ResolveInvitationUseCase,
  type IdentityInvitations,
  type InvitationTokenGenerator,
  type InvitationTokenHasher,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { Clock } from "~/bounded-contexts/access/accounts/domain/clock";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations";
import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/public/paths";
import type { IdentityConfig } from "~/bounded-contexts/access/accounts/config.server";

import { AccountController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-controller.server";
import { InvitationsController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/public-site/invitations-controller.server";
import { AccountWebhookController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/webhook-controller.server";
import { createAccountInvitationsFacade } from "~/bounded-contexts/access/accounts/adapters/inbound/facades/account-invitations.server";
import { EmailAccountInvitationNotifications } from "~/bounded-contexts/access/accounts/adapters/outbound/email/email-account-invitation-notifications.server";
import { createIdentityInvitations } from "~/bounded-contexts/access/accounts/adapters/outbound/identity/create-identity-invitations.server";
import { createInvitationReferences } from "~/bounded-contexts/access/accounts/adapters/outbound/identity/create-invitation-references.server";
import { createAccountsIncidents } from "~/bounded-contexts/access/accounts/adapters/outbound/logging/accounts-incidents.server";
import { PostgresAccountInvitations } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/account-invitations-repository.server";
import { PostgresAccountRepository } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/account-repository.server";
import { RandomAccountIds } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/random-account-ids.server";
import { RandomAccountInvitationIds } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/random-account-invitation-ids.server";
import type { AccountsFeature } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";

export type AccountsFeatureHandles = {
  bootstrapCoachAuthSubjectId: string | undefined;
  clerkWebhookSigningSecret: string | undefined;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  identityConfig: IdentityConfig;
  linkTokens: {
    generator: InvitationTokenGenerator;
    hasher: InvitationTokenHasher;
  };
  logger: Logger;
  portal: AccountsFeature["portal"] & { publicAppUrl: string };
  productEmail: ProductEmail;
};

type AccountsComposition = {
  facades: { accountInvitations: AccountInvitationsFacade };
  feature: AccountsFeature;
};

export function composeAccountsFeature(
  handles: AccountsFeatureHandles,
): AccountsComposition {
  const { clock, database } = handles;
  const repository = new PostgresAccountRepository(database);
  const invitations = new PostgresAccountInvitations(database);
  const deliveryPorts = {
    clock,
    identity: composeIdentityInvitations(handles),
    incidents: createAccountsIncidents(handles.logger),
    invitations,
    notifications: new EmailAccountInvitationNotifications(
      handles.productEmail,
      {
        appBasePath: handles.portal.appBasePath,
        clock,
        contactEmail: handles.contactEmail,
        publicAppUrl: handles.portal.publicAppUrl,
      },
    ),
    tokenGenerator: handles.linkTokens.generator,
  };

  return {
    facades: {
      accountInvitations: createAccountInvitationsFacade({
        ensureInvitationDelivered: new EnsureInvitationDeliveredUseCase(
          deliveryPorts,
        ),
        findAcceptedInvitation: new FindAcceptedInvitationUseCase({
          invitations,
        }),
        issueInvitation: new IssueInvitationUseCase({
          clock,
          ids: new RandomAccountInvitationIds(),
          invitations,
          tokenGenerator: handles.linkTokens.generator,
        }),
        readInvitationStanding: new ReadInvitationStandingUseCase({
          clock,
          invitations,
        }),
        resendInvitation: new ResendInvitationUseCase(deliveryPorts),
      }),
    },
    feature: {
      account: new AccountController(),
      invitations: new InvitationsController({
        resolveInvitation: new ResolveInvitationUseCase({
          clock,
          invitations,
          tokenHasher: handles.linkTokens.hasher,
        }),
      }),
      portal: handles.portal,
      provisioning: new ProvisionAccountUseCase({
        accounts: repository,
        ids: new RandomAccountIds(),
        bootstrapCoachAuthSubjectId: handles.bootstrapCoachAuthSubjectId,
        invitationGate: new AccountInvitationGate({
          clock,
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

function composeIdentityInvitations(
  handles: AccountsFeatureHandles,
): IdentityInvitations {
  return createIdentityInvitations(handles.identityConfig, {
    signUpUrl: handles.identityConfig.CLERK_SIGN_UP_URL,
    returnUrl: new URL(
      buildRedirectPath(handles.portal.appBasePath, CLIENT_PORTAL_PATH),
      handles.portal.publicAppUrl,
    ).toString(),
  });
}
