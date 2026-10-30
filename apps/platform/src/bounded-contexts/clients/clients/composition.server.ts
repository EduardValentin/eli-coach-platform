import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations-facade";
import type { AdmissionsFacade } from "~/bounded-contexts/clients/public/admissions-facade";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";
import type { ClientCallsFacade } from "~/bounded-contexts/scheduling/public/client-calls-facade";
import {
  AdmitPaidClientUseCase,
  ClientCountries,
  RecordCoachingStandingUseCase,
  UpdateClientIdentityAsCoachUseCase,
  UpdateOwnClientIdentityUseCase,
  type ClientIdentitiesPort,
  type ClientReachPort,
} from "~/bounded-contexts/clients/clients/domain/client";
import {
  AcceptInvitationUseCase,
  InvitePaidClientUseCase,
  ReadClientInvitationUseCase,
  ResendInvitationUseCase,
} from "~/bounded-contexts/clients/clients/domain/client-invitation";
import {
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadClientPortalStandingUseCase,
  type OnboardingStandingsPort,
  type OnboardingSubmissionRecorderPort,
  type ReviewStampRecorderPort,
} from "~/bounded-contexts/clients/clients/domain/client-journey";
import {
  ListClientsUseCase,
  ReadClientRecordUseCase,
} from "~/bounded-contexts/clients/clients/domain/client-roster";
import type { ClockPort } from "~/bounded-contexts/clients/clients/domain/clock-port";

import { COUNTRIES } from "~/shared/contact/countries";
import { phoneNumbers } from "~/shared/contact/phone-numbers";
import { WallClockCalendarDatesAdapter } from "~/bounded-contexts/clients/clients/adapters/outbound/clock/wall-clock-calendar-dates-adapter";
import { SchedulingClientCallsAdapter } from "~/bounded-contexts/clients/clients/adapters/outbound/scheduling/scheduling-client-calls-adapter.server";
import { ClientJourneyController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/client-journey-controller.server";
import { OwnClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/own-client-identity-controller.server";
import { CoachClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-client-identity-controller.server";
import { CoachClientsController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-clients-controller.server";
import { PostgresClientIdentitiesRepository } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/postgres-client-identities-repository.server";
import { PostgresClientIdentityChangesRepository } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/postgres-client-identity-changes-repository.server";
import { PostgresClientReachRepository } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/postgres-client-reach-repository.server";
import { PostgresClientRosterRepository } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/postgres-client-roster-repository.server";
import { PostgresAdmittedClientsRepository } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/postgres-admitted-clients-repository.server";
import { PostgresOnboardingStandingsRepository } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/journeys/postgres-onboarding-standings-repository.server";
import { RandomClientIdsAdapter } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/random-client-ids-adapter.server";
import { PostgresInvitedClientsRepository } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/invitations/postgres-invited-clients-repository.server";
import { PostgresClientJourneysRepository } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/journeys/postgres-client-journeys-repository.server";
import type { ClientsFeature } from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
import { AdmissionsFacadeAdapter } from "~/bounded-contexts/clients/clients/adapters/inbound/facades/admissions-facade-adapter.server";
import { ClientLookupFacadeAdapter } from "~/bounded-contexts/clients/clients/adapters/inbound/facades/client-lookup-facade-adapter.server";
import { AccessAccountInvitationsAdapter } from "~/bounded-contexts/clients/clients/adapters/outbound/access/access-account-invitations-adapter.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { ClientsIncidentsAdapter } from "~/bounded-contexts/clients/clients/adapters/outbound/logging/clients-incidents-adapter.server";

type ClientsComposition = {
  facades: {
    admissions: AdmissionsFacade;
    clientLookup: ClientLookupFacade;
  };
  feature: ClientsFeature;
  handles: {
    clientIdentities: ClientIdentitiesPort;
    clientReach: ClientReachPort;
    onboardingStandings: OnboardingStandingsPort;
    onboardingSubmissions: OnboardingSubmissionRecorderPort;
    reviewStampRecorder: ReviewStampRecorderPort;
  };
};

export type ClientsFeatureHandles = {
  accountInvitations: AccountInvitationsFacade;
  clientCalls: ClientCallsFacade;
  clock: ClockPort;
  database: DatabaseClient;
  logger: LoggerPort;
};

export function composeClientsFeature(
  handles: ClientsFeatureHandles,
): ClientsComposition {
  const incidents = new ClientsIncidentsAdapter(handles.logger);
  const { clock, database } = handles;
  const clientIdentities = new PostgresClientIdentitiesRepository(database);
  const clientReach = new PostgresClientReachRepository({ clock, database });
  const journeys = new PostgresClientJourneysRepository(database);
  const accountInvitations = new AccessAccountInvitationsAdapter(
    handles.accountInvitations,
  );
  const admittedClients = new PostgresAdmittedClientsRepository(database);
  const roster = new PostgresClientRosterRepository(database);
  const identityChanges = new PostgresClientIdentityChangesRepository(database);
  const countries = ClientCountries.of(COUNTRIES, phoneNumbers);

  const invitationPorts = {
    accountInvitations,
    clients: new PostgresInvitedClientsRepository(database),
  };

  const readClientPortalStanding = new ReadClientPortalStandingUseCase({
    clock,
    journeys,
  });

  return {
    facades: {
      admissions: new AdmissionsFacadeAdapter({
        admitPaidClient: new AdmitPaidClientUseCase({
          clients: admittedClients,
          ids: new RandomClientIdsAdapter(),
        }),
        invitePaidClient: new InvitePaidClientUseCase(invitationPorts),
        recordCoachingStanding: new RecordCoachingStandingUseCase({
          clients: admittedClients,
        }),
        unitOfWork: createUnitOfWork(database),
      }),
      clientLookup: new ClientLookupFacadeAdapter({
        identities: clientIdentities,
        reach: clientReach,
        readClientJourney: new ReadClientJourneyUseCase({ journeys }),
      }),
    },
    feature: {
      acceptInvitation: new AcceptInvitationUseCase(invitationPorts),
      clientJourney: new ClientJourneyController({
        markWelcomeSeen: new MarkWelcomeSeenUseCase({ clock, journeys }),
        readClientJourney: new ReadClientJourneyUseCase({ journeys }),
      }),
      coachClientIdentity: new CoachClientIdentityController({
        updateClientIdentityAsCoach: new UpdateClientIdentityAsCoachUseCase({
          changes: identityChanges,
          clients: clientReach,
          clock,
          calendar: new WallClockCalendarDatesAdapter(),
          countries,
        }),
      }),
      coachClients: new CoachClientsController({
        listClients: new ListClientsUseCase({
          clock,
          incidents,
          roster,
        }),
        readClientInvitation: new ReadClientInvitationUseCase(invitationPorts),
        readClientRecord: new ReadClientRecordUseCase({
          calls: new SchedulingClientCallsAdapter(handles.clientCalls),
          clock,
          roster,
        }),
        resendInvitation: new ResendInvitationUseCase(invitationPorts),
      }),
      ownClientIdentity: new OwnClientIdentityController({
        updateOwnClientIdentity: new UpdateOwnClientIdentityUseCase({
          changes: identityChanges,
          clients: clientReach,
          clock,
          calendar: new WallClockCalendarDatesAdapter(),
          countries,
          identities: clientIdentities,
        }),
      }),
      readClientPortalStanding,
    },
    handles: {
      clientIdentities,
      clientReach,
      onboardingStandings: new PostgresOnboardingStandingsRepository(database),
      onboardingSubmissions: journeys,
      reviewStampRecorder: journeys,
    },
  };
}
