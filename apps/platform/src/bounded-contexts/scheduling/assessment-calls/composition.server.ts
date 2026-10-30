import type { AssessmentCallsConfig } from "~/bounded-contexts/scheduling/assessment-calls/config.server";
import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import {
  ASSESSMENT_CALL_RULES,
  AssessmentCallBookingWindow,
  BookAssessmentCallUseCase,
  ListAssessmentCallsUseCase,
  ListOpenSlotsUseCase,
  ResolveJoinLinkUseCase,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type {
  CoachOpenings,
  CoachTimeReservationsPort,
} from "~/bounded-contexts/scheduling/coach-schedule/public/coach-time";
import type { CoachMeetingRoomSourcePort } from "~/bounded-contexts/scheduling/coach-schedule/public/meeting-room";
import type { ClientCallsFacade } from "~/bounded-contexts/scheduling/public/client-calls-facade";
import type { EndedCallsFacade } from "~/bounded-contexts/scheduling/public/ended-calls-facade";
import type { EmailAcceptancePort } from "~/bounded-contexts/scheduling/assessment-calls/domain/email-acceptance-port";
import type { FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags-facade";
import type { ClockPort } from "~/bounded-contexts/scheduling/assessment-calls/domain/clock-port";
import type { BotDetectionConfig } from "~/shared/submission-checks/bot-detection";
import type { BotVerifierPort } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { AssessmentCallsController } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/booking/assessment-calls-controller.server";
import { CoachAssessmentCallsController } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/coach/coach-assessment-calls-controller.server";
import { RandomAssessmentCallIdsAdapter } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/persistence/random-assessment-call-ids-adapter.server";
import { PostgresAssessmentCallRepository } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/persistence/postgres-assessment-call-repository.server";
import { CoachScheduleAvailabilityAdapter } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/coach-schedule/coach-schedule-availability-adapter.server";
import { OperationsWaitlistModeAdapter } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/operations/operations-waitlist-mode-adapter.server";
import { ClientCallsFacadeAdapter } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/facades/client-calls-facade-adapter.server";
import { EndedCallsFacadeAdapter } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/facades/ended-calls-facade-adapter.server";
import { createAssessmentCallNotificationsAdapter } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/email/create-assessment-call-notifications-adapter.server";
import type { AssessmentCallsFeature } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { AssessmentCallsIncidentsAdapter } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/logging/assessment-calls-incidents-adapter.server";

type AssessmentCallsComposition = {
  feature: AssessmentCallsFeature;
  facades: { clientCalls: ClientCallsFacade; endedCalls: EndedCallsFacade };
};

export type AssessmentCallsFeatureHandles = {
  appBasePath: string;
  assessmentCallsConfig: AssessmentCallsConfig;
  botDetection: BotDetectionConfig;
  botVerifier: BotVerifierPort;
  clock: ClockPort;
  coachTime: CoachTimeReservationsPort;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptancePort;
  featureFlags: FeatureFlagsFacade;
  logger: LoggerPort;
  meetingRoom: CoachMeetingRoomSourcePort;
  openings: CoachOpenings;
  productEmail: ProductEmailPort;
  publicAppUrl: string;
};

export function composeAssessmentCallsFeature(
  handles: AssessmentCallsFeatureHandles,
): AssessmentCallsComposition {
  const incidents = new AssessmentCallsIncidentsAdapter(handles.logger);
  const availability = new CoachScheduleAvailabilityAdapter({
    openings: handles.openings,
    rules: ASSESSMENT_CALL_RULES,
  });
  const unitOfWork = createUnitOfWork(handles.database);
  const reservations = new PostgresAssessmentCallRepository(handles.database);
  const bookingWindow = new AssessmentCallBookingWindow({
    incidents,
    waitlistMode: new OperationsWaitlistModeAdapter(handles.featureFlags),
  });

  return {
    feature: {
      assessmentCalls: new AssessmentCallsController({
        botDetection: handles.botDetection,
        botVerifier: handles.botVerifier,
        bookAssessmentCall: new BookAssessmentCallUseCase({
          availability,
          bookingWindow,
          clock: handles.clock,
          coachTime: handles.coachTime,
          emailAcceptance: handles.emailAcceptance,
          ids: new RandomAssessmentCallIdsAdapter(),
          incidents,
          notifications: createAssessmentCallNotificationsAdapter(
            handles.productEmail,
            {
              appBasePath: handles.appBasePath,
              coachEmail:
                handles.assessmentCallsConfig.ASSESSMENT_CALL_COACH_EMAIL,
              contactEmail: handles.contactEmail,
              publicAppUrl: handles.publicAppUrl,
            },
          ),
          reservations,
        }),
        clock: handles.clock,
        listOpenSlots: new ListOpenSlotsUseCase({
          availability,
          bookingWindow,
          clock: handles.clock,
          incidents,
        }),
        resolveJoinLink: new ResolveJoinLinkUseCase({
          meetingRoom: handles.meetingRoom,
          reservations,
        }),
        unitOfWork,
      }),
      coachAssessmentCalls: new CoachAssessmentCallsController({
        clock: handles.clock,
        listAssessmentCalls: new ListAssessmentCallsUseCase({
          availability,
          incidents,
          reservations,
        }),
      }),
    },
    facades: {
      clientCalls: new ClientCallsFacadeAdapter(reservations),
      endedCalls: new EndedCallsFacadeAdapter(reservations),
    },
  };
}
