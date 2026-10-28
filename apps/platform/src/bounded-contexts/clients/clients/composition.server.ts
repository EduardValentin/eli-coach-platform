import type { DatabaseClient } from "~/shared/database";
import { buildRedirectPath } from "~/shared/http/base-path";
import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/public/paths";
import { createUnitOfWork } from "~/shared/database/index.server";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations";
import type { AdmissionsFacade } from "~/bounded-contexts/clients/public/admissions";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup";
import type { ClientCallsFacade } from "~/bounded-contexts/scheduling/public/client-calls";
import {
  AdmitPaidClientUseCase,
  ClientCountries,
  RecordCoachingStandingUseCase,
  UpdateClientIdentityAsCoachUseCase,
  UpdateOwnClientIdentityUseCase,
  type ClientIdentities,
  type ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import {
  AcceptInvitationUseCase,
  InvitePaidClientUseCase,
  ReadClientInvitationUseCase,
  ResendInvitationUseCase,
  ResolveInvitationUseCase,
  type IdentityInvitations,
  type InvitationTokenGenerator,
  type InvitationTokenHasher,
} from "~/bounded-contexts/clients/clients/domain/client-invitation";
import {
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadClientPortalStandingUseCase,
  type OnboardingStandings,
  type OnboardingSubmissionRecorder,
  type ReviewStampRecorder,
} from "~/bounded-contexts/clients/clients/domain/client-journey";
import {
  ListClientsUseCase,
  ReadClientRecordUseCase,
} from "~/bounded-contexts/clients/clients/domain/client-roster";
import type { Clock } from "~/bounded-contexts/clients/clients/domain/clock";
import type { ProductEmail } from "~/shared/email/index.server";

import { COUNTRIES } from "~/shared/contact/countries";
import { phoneNumbers } from "~/shared/contact/phone-numbers";
import { wallClockCalendarDates } from "~/bounded-contexts/clients/clients/adapters/outbound/clock/wall-clock-calendar-dates";
import { SchedulingClientCalls } from "~/bounded-contexts/clients/clients/adapters/outbound/scheduling/client-calls.server";
import { ClientJourneyController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/client-journey-controller.server";
import { OwnClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/own-client-identity-controller.server";
import { CoachClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-client-identity-controller.server";
import { CoachClientsController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-clients-controller.server";
import { InvitationsController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/public/invitations-controller.server";
import { PostgresClientIdentities } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-identities-reader.server";
import { PostgresClientIdentityChanges } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-identity-changes.server";
import { PostgresClientReach } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-reach-reader.server";
import { PostgresClientRoster } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-roster-reader.server";
import { PostgresAdmittedClients } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-writers.server";
import { PostgresOnboardingStandings } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/journeys/onboarding-standings-reader.server";
import { RandomClientIds } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/random-client-ids.server";
import { RandomClientInvitationIds } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/invitations/random-client-invitation-ids.server";
import { PostgresClientInvitations } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/invitations/invitations-repository.server";
import { PostgresInvitedClients } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/invitations/invited-clients-repository.server";
import { PostgresClientJourneys } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/journeys/client-journeys-repository.server";
import { EmailClientInvitationNotifications } from "~/bounded-contexts/clients/clients/adapters/outbound/email/email-client-invitation-notifications.server";
import type { ClientsFeature } from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
import { createAdmissionsFacade } from "~/bounded-contexts/clients/clients/adapters/inbound/facades/admissions.server";
import { createClientLookupFacade } from "~/bounded-contexts/clients/clients/adapters/inbound/facades/client-lookup.server";
import { AccessAccountInvitations } from "~/bounded-contexts/clients/clients/adapters/outbound/access/account-invitations.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createClientsIncidents } from "~/bounded-contexts/clients/clients/adapters/outbound/logging/clients-incidents.server";
import {
  createIdentityInvitations,
  type IdentityConfig,
} from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/identity/create-identity-invitations.server";

type ClientsComposition = {
  facades: {
    admissions: AdmissionsFacade;
    clientLookup: ClientLookupFacade;
  };
  feature: ClientsFeature;
  handles: {
    clientIdentities: ClientIdentities;
    clientReach: ClientReach;
    onboardingStandings: OnboardingStandings;
    onboardingSubmissions: OnboardingSubmissionRecorder;
    reviewStampRecorder: ReviewStampRecorder;
  };
};

export type ClientsFeatureHandles = {
  accountInvitations: AccountInvitationsFacade;
  appBasePath: string;
  clientCalls: ClientCallsFacade;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  identityInvitations: IdentityInvitations;
  logger: Logger;
  linkTokens: {
    generator: InvitationTokenGenerator;
    hasher: InvitationTokenHasher;
  };
  productEmail: ProductEmail;
  publicAppUrl: string;
};

export function composeClientsFeature(
  handles: ClientsFeatureHandles,
): ClientsComposition {
  const incidents = createClientsIncidents(handles.logger);
  const { clock, database } = handles;
  const clientIdentities = new PostgresClientIdentities(database);
  const clientReach = new PostgresClientReach({ clock, database });
  const invitations = new PostgresClientInvitations(database);
  const journeys = new PostgresClientJourneys(database);
  const accountInvitations = new AccessAccountInvitations(
    handles.accountInvitations,
  );
  const admittedClients = new PostgresAdmittedClients(database);
  const roster = new PostgresClientRoster(database);
  const identityChanges = new PostgresClientIdentityChanges(database);
  const countries = ClientCountries.of(COUNTRIES, phoneNumbers);

  const invitationPorts = {
    accountInvitations,
    clients: new PostgresInvitedClients(database),
    clock,
    identity: handles.identityInvitations,
    incidents,
    invitations,
    notifications: new EmailClientInvitationNotifications(
      handles.productEmail,
      {
        appBasePath: handles.appBasePath,
        clock,
        contactEmail: handles.contactEmail,
        publicAppUrl: handles.publicAppUrl,
      },
    ),
    tokenGenerator: handles.linkTokens.generator,
  };

  const readClientPortalStanding = new ReadClientPortalStandingUseCase({
    clock,
    journeys,
  });

  return {
    facades: {
      admissions: createAdmissionsFacade({
        admitPaidClient: new AdmitPaidClientUseCase({
          clients: admittedClients,
          ids: new RandomClientIds(),
        }),
        invitePaidClient: new InvitePaidClientUseCase({
          ...invitationPorts,
          ids: new RandomClientInvitationIds(),
        }),
        recordCoachingStanding: new RecordCoachingStandingUseCase({
          clients: admittedClients,
        }),
        unitOfWork: createUnitOfWork(database),
      }),
      clientLookup: createClientLookupFacade({
        identities: clientIdentities,
        reach: clientReach,
        readClientJourney: new ReadClientJourneyUseCase({ journeys }),
      }),
    },
    feature: {
      acceptInvitation: new AcceptInvitationUseCase({
        accountInvitations,
        clock,
        invitations,
      }),
      clientJourney: new ClientJourneyController({
        markWelcomeSeen: new MarkWelcomeSeenUseCase({ clock, journeys }),
        readClientJourney: new ReadClientJourneyUseCase({ journeys }),
      }),
      coachClientIdentity: new CoachClientIdentityController({
        updateClientIdentityAsCoach: new UpdateClientIdentityAsCoachUseCase({
          changes: identityChanges,
          clients: clientReach,
          clock,
          calendar: wallClockCalendarDates,
          countries,
        }),
      }),
      coachClients: new CoachClientsController({
        listClients: new ListClientsUseCase({
          clock,
          incidents,
          roster,
        }),
        readClientInvitation: new ReadClientInvitationUseCase({
          clock,
          invitations,
        }),
        readClientRecord: new ReadClientRecordUseCase({
          calls: new SchedulingClientCalls(handles.clientCalls),
          clock,
          roster,
        }),
        resendInvitation: new ResendInvitationUseCase(invitationPorts),
      }),
      invitations: new InvitationsController({
        resolveInvitation: new ResolveInvitationUseCase({
          clock,
          invitations,
          tokenHasher: handles.linkTokens.hasher,
        }),
      }),
      ownClientIdentity: new OwnClientIdentityController({
        updateOwnClientIdentity: new UpdateOwnClientIdentityUseCase({
          changes: identityChanges,
          clients: clientReach,
          clock,
          calendar: wallClockCalendarDates,
          countries,
          identities: clientIdentities,
        }),
      }),
      readClientPortalStanding,
    },
    handles: {
      clientIdentities,
      clientReach,
      onboardingStandings: new PostgresOnboardingStandings(database),
      onboardingSubmissions: journeys,
      reviewStampRecorder: journeys,
    },
  };
}

export function composeIdentityInvitations(site: {
  appBasePath: string;
  identityConfig: IdentityConfig & { CLERK_SIGN_UP_URL: string };
  publicAppUrl: string;
}): IdentityInvitations {
  return createIdentityInvitations(site.identityConfig, {
    signUpUrl: site.identityConfig.CLERK_SIGN_UP_URL,
    returnUrl: new URL(
      buildRedirectPath(site.appBasePath, CLIENT_PORTAL_PATH),
      site.publicAppUrl,
    ).toString(),
  });
}
