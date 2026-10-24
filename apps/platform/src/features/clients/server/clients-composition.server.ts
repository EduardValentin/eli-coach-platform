import type { DatabaseClient } from "@eli-coach-platform/db";
import type { InvitationAcceptance } from "@eli-coach-platform/domain/account";
import type { AssessmentCallReader } from "@eli-coach-platform/domain/assessment-call";
import {
  UpdateClientIdentityAsCoachUseCase,
  UpdateOwnClientIdentityUseCase,
  type ClientIdentities,
  type ClientIds,
  type ClientReach,
} from "@eli-coach-platform/domain/client";
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
} from "@eli-coach-platform/domain/client-invitation";
import {
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadClientPortalStandingUseCase,
  type ClientJourneys,
} from "@eli-coach-platform/domain/client-journey";
import type {
  OnboardingClients,
  OnboardingReviewStamps,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  ListClientsUseCase,
  ReadClientRecordUseCase,
  type ClientRosterIncidents,
} from "@eli-coach-platform/domain/client-roster";
import type { PaidClientAdmission } from "@eli-coach-platform/domain/coaching-subscription";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { ClientJourneyController } from "~/features/clients/api/client/client-journey-controller.server";
import { CoachClientsController } from "~/features/clients/api/coach/coach-clients-controller.server";
import { ClientIdentityController } from "~/features/clients/api/identity/client-identity-controller.server";
import { InvitationsController } from "~/features/clients/api/public/invitations-controller.server";
import { PostgresClientIdentities } from "~/features/clients/data/clients/client-identities-reader.server";
import { PostgresClientIdentityChanges } from "~/features/clients/data/clients/client-identity-changes.server";
import { PostgresClientReach } from "~/features/clients/data/clients/client-reach-reader.server";
import { PostgresClientRoster } from "~/features/clients/data/clients/client-roster-reader.server";
import {
  writeClient,
  writeCoachingStanding,
} from "~/features/clients/data/clients/client-writers.server";
import { PostgresOnboardingClients } from "~/features/clients/data/clients/onboarding-clients-reader.server";
import { RandomClientIds } from "~/features/clients/data/clients/random-client-ids.server";
import { RandomClientInvitationIds } from "~/features/clients/data/invitations/random-client-invitation-ids.server";
import { PostgresClientInvitations } from "~/features/clients/data/invitations/invitations-repository.server";
import { PostgresInvitedClients } from "~/features/clients/data/invitations/invited-clients-repository.server";
import { PostgresClientJourneys } from "~/features/clients/data/journeys/client-journeys-repository.server";
import { writeReviewStamps } from "~/features/clients/data/journeys/review-stamps.server";
import { EmailClientInvitationNotifications } from "~/features/clients/email/email-client-invitation-notifications.server";

export type ClientsFeature = {
  clientIdentity: ClientIdentityController;
  clientJourney: ClientJourneyController;
  coachClients: CoachClientsController;
  invitations: InvitationsController;
  readClientPortalStanding: ReadClientPortalStandingUseCase;
};

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
    reviewStampWriter: typeof writeReviewStamps;
    writeClient: typeof writeClient;
    writeCoachingStanding: typeof writeCoachingStanding;
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
      clientIdentity: new ClientIdentityController({
        updateClientIdentityAsCoach: new UpdateClientIdentityAsCoachUseCase({
          changes: identityChanges,
          clients: clientReach,
          clock,
        }),
        updateOwnClientIdentity: new UpdateOwnClientIdentityUseCase({
          changes: identityChanges,
          clients: clientReach,
          clock,
          identities: clientIdentities,
        }),
      }),
      clientJourney: new ClientJourneyController({
        markWelcomeSeen: new MarkWelcomeSeenUseCase({ clock, journeys }),
        readClientJourney: new ReadClientJourneyUseCase({ journeys }),
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
      reviewStampWriter: writeReviewStamps,
      writeClient,
      writeCoachingStanding,
    },
  };
}
