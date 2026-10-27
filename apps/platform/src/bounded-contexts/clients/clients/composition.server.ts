import type { DatabaseClient } from "~/shared/database";
import type { InvitationAcceptance } from "~/bounded-contexts/access/accounts/domain/account";
import {
  VisitorCountries,
  type AssessmentCallReader,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import {
  UpdateClientIdentityAsCoachUseCase,
  UpdateOwnClientIdentityUseCase,
  type ClientIdentities,
  type ClientIds,
  type ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import {
  AcceptInvitationUseCase,
  AdmitPaidClientUseCase,
  ReadClientInvitationUseCase,
  ResendInvitationUseCase,
  ResolveInvitationUseCase,
  type ClientInvitationIncidents,
  type IdentityInvitations,
  type InvitationTokenGenerator,
  type InvitationTokenHasher,
} from "~/bounded-contexts/clients/clients/domain/client-invitation";
import {
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadClientPortalStandingUseCase,
  type ClientJourneys,
} from "~/bounded-contexts/clients/clients/domain/client-journey";
import type {
  OnboardingClients,
  OnboardingReviewStamps,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import {
  ListClientsUseCase,
  ReadClientRecordUseCase,
  type ClientRosterIncidents,
} from "~/bounded-contexts/clients/clients/domain/client-roster";
import type { PaidClientAdmission } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { Clock } from "~/bounded-contexts/clients/clients/domain/clock";
import type { ProductEmail } from "~/shared/email/index.server";

import { COUNTRIES } from "~/bounded-contexts/scheduling/assessment-calls/public/countries";
import { ClientJourneyController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/client-journey-controller.server";
import { OwnClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/own-client-identity-controller.server";
import { CoachClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-client-identity-controller.server";
import { CoachClientsController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-clients-controller.server";
import { InvitationsController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/public/invitations-controller.server";
import { PostgresClientIdentities } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-identities-reader.server";
import { PostgresClientIdentityChanges } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-identity-changes.server";
import { PostgresClientReach } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-reach-reader.server";
import { PostgresClientRoster } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-roster-reader.server";
import {
  writeClient,
  writeCoachingStanding,
} from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/client-writers.server";
import { PostgresOnboardingClients } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/onboarding-clients-reader.server";
import { RandomClientIds } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/clients/random-client-ids.server";
import { RandomClientInvitationIds } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/invitations/random-client-invitation-ids.server";
import { PostgresClientInvitations } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/invitations/invitations-repository.server";
import { PostgresInvitedClients } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/invitations/invited-clients-repository.server";
import { PostgresClientJourneys } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/journeys/client-journeys-repository.server";
import { writeReviewStamps } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/journeys/review-stamps.server";
import { EmailClientInvitationNotifications } from "~/bounded-contexts/clients/clients/adapters/outbound/email/email-client-invitation-notifications.server";
import type { ClientsFeature } from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";

type ClientsComposition = {
  feature: ClientsFeature;
  handles: {
    clientIdentities: ClientIdentities;
    clientIds: ClientIds;
    clientJourneys: ClientJourneys;
    clientReach: ClientReach;
    invitationAcceptance: InvitationAcceptance;
    onboardingClients: OnboardingClients;
    onboardingReviewStamps: OnboardingReviewStamps;
    paidClientAdmission: PaidClientAdmission;
    reviewStampWriter: (
      input: Parameters<typeof writeReviewStamps>[1],
    ) => Promise<void>;
    writeClient: (
      client: Parameters<typeof writeClient>[1],
    ) => ReturnType<typeof writeClient>;
    writeCoachingStanding: (
      input: Parameters<typeof writeCoachingStanding>[1],
    ) => Promise<void>;
  };
};

export type ClientsFeatureHandles = {
  appBasePath: string;
  assessmentCallReader: AssessmentCallReader;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  identityInvitations: IdentityInvitations;
  incidents: ClientInvitationIncidents & ClientRosterIncidents;
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
  const { clock, database } = handles;
  const clientIdentities = new PostgresClientIdentities(database);
  const clientReach = new PostgresClientReach({ clock, database });
  const invitations = new PostgresClientInvitations(database);
  const journeys = new PostgresClientJourneys(database);
  const onboardingClients = new PostgresOnboardingClients(database);
  const roster = new PostgresClientRoster(database);
  const identityChanges = new PostgresClientIdentityChanges(database);
  const countries = VisitorCountries.of(COUNTRIES);

  const invitationPorts = {
    clients: new PostgresInvitedClients(database),
    clock,
    identity: handles.identityInvitations,
    incidents: handles.incidents,
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

  const acceptInvitation = new AcceptInvitationUseCase({
    clock,
    identity: handles.identityInvitations,
    invitations,
  });
  const admitPaidClient = new AdmitPaidClientUseCase({
    ...invitationPorts,
    ids: new RandomClientInvitationIds(),
  });
  const readClientPortalStanding = new ReadClientPortalStandingUseCase({
    clock,
    journeys,
  });

  return {
    feature: {
      clientJourney: new ClientJourneyController({
        markWelcomeSeen: new MarkWelcomeSeenUseCase({ clock, journeys }),
        readClientJourney: new ReadClientJourneyUseCase({ journeys }),
      }),
      coachClientIdentity: new CoachClientIdentityController({
        updateClientIdentityAsCoach: new UpdateClientIdentityAsCoachUseCase({
          changes: identityChanges,
          clients: clientReach,
          clock,
          countries,
        }),
      }),
      coachClients: new CoachClientsController({
        listClients: new ListClientsUseCase({
          clock,
          incidents: handles.incidents,
          roster,
        }),
        readClientInvitation: new ReadClientInvitationUseCase({
          clock,
          invitations,
        }),
        readClientRecord: new ReadClientRecordUseCase({
          calls: handles.assessmentCallReader,
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
          countries,
          identities: clientIdentities,
        }),
      }),
      readClientPortalStanding,
    },
    handles: {
      clientIdentities,
      clientIds: new RandomClientIds(),
      clientJourneys: journeys,
      clientReach,
      invitationAcceptance: {
        accept: (input) => acceptInvitation.execute(input),
      },
      onboardingClients,
      onboardingReviewStamps: journeys,
      paidClientAdmission: {
        admit: (input) => admitPaidClient.execute(input).then(() => undefined),
      },
      reviewStampWriter: (input) => writeReviewStamps(database, input),
      writeClient: (client) => writeClient(database, client),
      writeCoachingStanding: (input) => writeCoachingStanding(database, input),
    },
  };
}
