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
    admissionsFacade: AdmissionsFacade;
    clientLookupFacade: ClientLookupFacade;
  };
  feature: ClientsFeature;
  handles: {
    clientIdentitiesPort: ClientIdentitiesPort;
    clientReachPort: ClientReachPort;
    onboardingStandingsPort: OnboardingStandingsPort;
    onboardingSubmissionRecorderPort: OnboardingSubmissionRecorderPort;
    reviewStampRecorderPort: ReviewStampRecorderPort;
  };
};

export type ClientsFeatureHandles = {
  accountInvitationsFacade: AccountInvitationsFacade;
  clientCallsFacade: ClientCallsFacade;
  clockPort: ClockPort;
  database: DatabaseClient;
  loggerPort: LoggerPort;
};

export function composeClientsFeature(
  handles: ClientsFeatureHandles,
): ClientsComposition {
  const clientsIncidentsAdapter = new ClientsIncidentsAdapter(
    handles.loggerPort,
  );
  const { clockPort, database } = handles;
  const postgresClientIdentitiesRepository =
    new PostgresClientIdentitiesRepository(database);
  const postgresClientReachRepository = new PostgresClientReachRepository({
    clockPort,
    database,
  });
  const postgresClientJourneysRepository = new PostgresClientJourneysRepository(
    database,
  );
  const accessAccountInvitationsAdapter = new AccessAccountInvitationsAdapter(
    handles.accountInvitationsFacade,
  );
  const postgresAdmittedClientsRepository =
    new PostgresAdmittedClientsRepository(database);
  const postgresClientRosterRepository = new PostgresClientRosterRepository(
    database,
  );
  const postgresClientIdentityChangesRepository =
    new PostgresClientIdentityChangesRepository(database);
  const countries = ClientCountries.of(COUNTRIES, phoneNumbers);

  const invitationPorts = {
    accountInvitationsPort: accessAccountInvitationsAdapter,
    invitedClientsPort: new PostgresInvitedClientsRepository(database),
  };

  const readClientPortalStandingUseCase = new ReadClientPortalStandingUseCase({
    clockPort,
    clientJourneysPort: postgresClientJourneysRepository,
  });

  return {
    facades: {
      admissionsFacade: new AdmissionsFacadeAdapter({
        admitPaidClientUseCase: new AdmitPaidClientUseCase({
          admittedClientsPort: postgresAdmittedClientsRepository,
          clientIdsPort: new RandomClientIdsAdapter(),
        }),
        invitePaidClientUseCase: new InvitePaidClientUseCase(invitationPorts),
        recordCoachingStandingUseCase: new RecordCoachingStandingUseCase({
          admittedClientsPort: postgresAdmittedClientsRepository,
        }),
        unitOfWork: createUnitOfWork(database),
      }),
      clientLookupFacade: new ClientLookupFacadeAdapter({
        clientIdentitiesPort: postgresClientIdentitiesRepository,
        clientReachPort: postgresClientReachRepository,
        readClientJourneyUseCase: new ReadClientJourneyUseCase({
          clientJourneysPort: postgresClientJourneysRepository,
        }),
      }),
    },
    feature: {
      acceptInvitationUseCase: new AcceptInvitationUseCase(invitationPorts),
      clientJourneyController: new ClientJourneyController({
        markWelcomeSeenUseCase: new MarkWelcomeSeenUseCase({
          clockPort,
          clientJourneysPort: postgresClientJourneysRepository,
        }),
        readClientJourneyUseCase: new ReadClientJourneyUseCase({
          clientJourneysPort: postgresClientJourneysRepository,
        }),
      }),
      coachClientIdentityController: new CoachClientIdentityController({
        updateClientIdentityAsCoachUseCase:
          new UpdateClientIdentityAsCoachUseCase({
            clientIdentityChangesPort: postgresClientIdentityChangesRepository,
            clientReachPort: postgresClientReachRepository,
            clockPort,
            calendarDatesPort: new WallClockCalendarDatesAdapter(),
            countries,
          }),
      }),
      coachClientsController: new CoachClientsController({
        listClientsUseCase: new ListClientsUseCase({
          clockPort,
          clientRosterIncidentsPort: clientsIncidentsAdapter,
          clientRosterPort: postgresClientRosterRepository,
        }),
        readClientInvitationUseCase: new ReadClientInvitationUseCase(
          invitationPorts,
        ),
        readClientRecordUseCase: new ReadClientRecordUseCase({
          clientCallsPort: new SchedulingClientCallsAdapter(
            handles.clientCallsFacade,
          ),
          clockPort,
          clientRosterPort: postgresClientRosterRepository,
        }),
        resendInvitationUseCase: new ResendInvitationUseCase(invitationPorts),
      }),
      ownClientIdentityController: new OwnClientIdentityController({
        updateOwnClientIdentityUseCase: new UpdateOwnClientIdentityUseCase({
          clientIdentityChangesPort: postgresClientIdentityChangesRepository,
          clientReachPort: postgresClientReachRepository,
          clockPort,
          calendarDatesPort: new WallClockCalendarDatesAdapter(),
          countries,
          clientIdentitiesPort: postgresClientIdentitiesRepository,
        }),
      }),
      readClientPortalStandingUseCase,
    },
    handles: {
      clientIdentitiesPort: postgresClientIdentitiesRepository,
      clientReachPort: postgresClientReachRepository,
      onboardingStandingsPort: new PostgresOnboardingStandingsRepository(
        database,
      ),
      onboardingSubmissionRecorderPort: postgresClientJourneysRepository,
      reviewStampRecorderPort: postgresClientJourneysRepository,
    },
  };
}
