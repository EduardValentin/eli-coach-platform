import type { DatabaseClient } from "~/shared/database";
import { buildRedirectPath } from "~/shared/http/base-path";
import type { ProductEmailPort } from "~/shared/email/index.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
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
  type IdentityInvitationsPort,
  type InvitationTokenGeneratorPort,
  type InvitationTokenHasherPort,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { ClockPort } from "~/bounded-contexts/access/accounts/domain/clock-port";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations-facade";
import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/public/paths";
import type { IdentityConfig } from "~/bounded-contexts/access/accounts/config.server";

import { AccountController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-controller.server";
import { InvitationsController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/public-site/invitations-controller.server";
import { AccountWebhookController } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-webhook-controller.server";
import { AccountInvitationsFacadeAdapter } from "~/bounded-contexts/access/accounts/adapters/inbound/facades/account-invitations-facade-adapter.server";
import { EmailAccountInvitationNotificationsAdapter } from "~/bounded-contexts/access/accounts/adapters/outbound/email/email-account-invitation-notifications-adapter.server";
import { createIdentityInvitationsAdapter } from "~/bounded-contexts/access/accounts/adapters/outbound/identity/create-identity-invitations-adapter.server";
import { createInvitationReferencesAdapter } from "~/bounded-contexts/access/accounts/adapters/outbound/identity/create-invitation-references-adapter.server";
import { AccountsIncidentsAdapter } from "~/bounded-contexts/access/accounts/adapters/outbound/logging/accounts-incidents-adapter.server";
import { PostgresAccountInvitationsRepository } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/postgres-account-invitations-repository.server";
import { PostgresAccountRepository } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/postgres-account-repository.server";
import { RandomAccountIdsAdapter } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/random-account-ids-adapter.server";
import { RandomAccountInvitationIdsAdapter } from "~/bounded-contexts/access/accounts/adapters/outbound/persistence/random-account-invitation-ids-adapter.server";
import type { AccountsFeature } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";

export type AccountsFeatureHandles = {
  bootstrapCoachAuthSubjectId: string | undefined;
  clerkWebhookSigningSecret: string | undefined;
  clock: ClockPort;
  contactEmail: string;
  database: DatabaseClient;
  identityConfig: IdentityConfig;
  linkTokens: {
    generator: InvitationTokenGeneratorPort;
    hasher: InvitationTokenHasherPort;
  };
  logger: LoggerPort;
  portal: AccountsFeature["portal"] & { publicAppUrl: string };
  productEmail: ProductEmailPort;
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
  const invitations = new PostgresAccountInvitationsRepository(database);
  const deliveryPorts = {
    clock,
    identity: composeIdentityInvitations(handles),
    incidents: new AccountsIncidentsAdapter(handles.logger),
    invitations,
    notifications: new EmailAccountInvitationNotificationsAdapter(
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
      accountInvitations: new AccountInvitationsFacadeAdapter({
        ensureInvitationDelivered: new EnsureInvitationDeliveredUseCase(
          deliveryPorts,
        ),
        findAcceptedInvitation: new FindAcceptedInvitationUseCase({
          invitations,
        }),
        issueInvitation: new IssueInvitationUseCase({
          clock,
          ids: new RandomAccountInvitationIdsAdapter(),
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
        ids: new RandomAccountIdsAdapter(),
        bootstrapCoachAuthSubjectId: handles.bootstrapCoachAuthSubjectId,
        invitationGate: new AccountInvitationGate({
          clock,
          invitations,
          references: createInvitationReferencesAdapter(handles.identityConfig),
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
): IdentityInvitationsPort {
  return createIdentityInvitationsAdapter(handles.identityConfig, {
    signUpUrl: handles.identityConfig.CLERK_SIGN_UP_URL,
    returnUrl: new URL(
      buildRedirectPath(handles.portal.appBasePath, CLIENT_PORTAL_PATH),
      handles.portal.publicAppUrl,
    ).toString(),
  });
}
