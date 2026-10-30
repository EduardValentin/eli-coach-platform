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
  clockPort: ClockPort;
  contactEmail: string;
  database: DatabaseClient;
  identityConfig: IdentityConfig;
  linkTokens: {
    generator: InvitationTokenGeneratorPort;
    hasher: InvitationTokenHasherPort;
  };
  loggerPort: LoggerPort;
  portal: AccountsFeature["portal"] & { publicAppUrl: string };
  productEmailPort: ProductEmailPort;
};

type AccountsComposition = {
  facades: { accountInvitationsFacade: AccountInvitationsFacade };
  feature: AccountsFeature;
};

export function composeAccountsFeature(
  handles: AccountsFeatureHandles,
): AccountsComposition {
  const { clockPort, database } = handles;
  const postgresAccountRepository = new PostgresAccountRepository(database);
  const postgresAccountInvitationsRepository =
    new PostgresAccountInvitationsRepository(database);
  const deliveryPorts = {
    clockPort,
    identityInvitationsPort: composeIdentityInvitations(handles),
    accountInvitationIncidentsPort: new AccountsIncidentsAdapter(
      handles.loggerPort,
    ),
    accountInvitationsPort: postgresAccountInvitationsRepository,
    accountInvitationNotificationsPort:
      new EmailAccountInvitationNotificationsAdapter(handles.productEmailPort, {
        appBasePath: handles.portal.appBasePath,
        clockPort,
        contactEmail: handles.contactEmail,
        publicAppUrl: handles.portal.publicAppUrl,
      }),
    invitationTokenGeneratorPort: handles.linkTokens.generator,
  };

  return {
    facades: {
      accountInvitationsFacade: new AccountInvitationsFacadeAdapter({
        ensureInvitationDeliveredUseCase: new EnsureInvitationDeliveredUseCase(
          deliveryPorts,
        ),
        findAcceptedInvitationUseCase: new FindAcceptedInvitationUseCase({
          accountInvitationsPort: postgresAccountInvitationsRepository,
        }),
        issueInvitationUseCase: new IssueInvitationUseCase({
          clockPort,
          accountInvitationIdsPort: new RandomAccountInvitationIdsAdapter(),
          accountInvitationsPort: postgresAccountInvitationsRepository,
          invitationTokenGeneratorPort: handles.linkTokens.generator,
        }),
        readInvitationStandingUseCase: new ReadInvitationStandingUseCase({
          clockPort,
          accountInvitationsPort: postgresAccountInvitationsRepository,
        }),
        resendInvitationUseCase: new ResendInvitationUseCase(deliveryPorts),
      }),
    },
    feature: {
      accountController: new AccountController(),
      invitationsController: new InvitationsController({
        resolveInvitationUseCase: new ResolveInvitationUseCase({
          clockPort,
          accountInvitationsPort: postgresAccountInvitationsRepository,
          invitationTokenHasherPort: handles.linkTokens.hasher,
        }),
      }),
      portal: handles.portal,
      provisionAccountUseCase: new ProvisionAccountUseCase({
        accountsPort: postgresAccountRepository,
        accountIdsPort: new RandomAccountIdsAdapter(),
        bootstrapCoachAuthSubjectId: handles.bootstrapCoachAuthSubjectId,
        invitationGate: new AccountInvitationGate({
          clockPort,
          accountInvitationsPort: postgresAccountInvitationsRepository,
          invitationReferencesPort: createInvitationReferencesAdapter(
            handles.identityConfig,
          ),
        }),
      }),
      accountWebhookController: new AccountWebhookController({
        deleteAccountUseCase: new DeleteAccountUseCase({
          accountsPort: postgresAccountRepository,
        }),
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
