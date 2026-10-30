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
  facades: {
    clientCallsFacade: ClientCallsFacade;
    endedCallsFacade: EndedCallsFacade;
  };
};

export type AssessmentCallsFeatureHandles = {
  appBasePath: string;
  assessmentCallsConfig: AssessmentCallsConfig;
  botDetection: BotDetectionConfig;
  botVerifierPort: BotVerifierPort;
  clockPort: ClockPort;
  coachTimeReservationsPort: CoachTimeReservationsPort;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptancePort: EmailAcceptancePort;
  featureFlagsFacade: FeatureFlagsFacade;
  loggerPort: LoggerPort;
  coachMeetingRoomSourcePort: CoachMeetingRoomSourcePort;
  openings: CoachOpenings;
  productEmailPort: ProductEmailPort;
  publicAppUrl: string;
};

export function composeAssessmentCallsFeature(
  handles: AssessmentCallsFeatureHandles,
): AssessmentCallsComposition {
  const assessmentCallsIncidentsAdapter = new AssessmentCallsIncidentsAdapter(
    handles.loggerPort,
  );
  const coachScheduleAvailabilityAdapter = new CoachScheduleAvailabilityAdapter(
    {
      openings: handles.openings,
      rules: ASSESSMENT_CALL_RULES,
    },
  );
  const unitOfWork = createUnitOfWork(handles.database);
  const postgresAssessmentCallRepository = new PostgresAssessmentCallRepository(
    handles.database,
  );
  const bookingWindow = new AssessmentCallBookingWindow({
    assessmentCallIncidentsPort: assessmentCallsIncidentsAdapter,
    waitlistModePort: new OperationsWaitlistModeAdapter(
      handles.featureFlagsFacade,
    ),
  });

  return {
    feature: {
      assessmentCallsController: new AssessmentCallsController({
        botDetection: handles.botDetection,
        botVerifierPort: handles.botVerifierPort,
        bookAssessmentCallUseCase: new BookAssessmentCallUseCase({
          coachAvailabilityPort: coachScheduleAvailabilityAdapter,
          bookingWindow,
          clockPort: handles.clockPort,
          coachTimePort: handles.coachTimeReservationsPort,
          emailAcceptancePort: handles.emailAcceptancePort,
          assessmentCallIdsPort: new RandomAssessmentCallIdsAdapter(),
          assessmentCallIncidentsPort: assessmentCallsIncidentsAdapter,
          assessmentCallNotificationsPort:
            createAssessmentCallNotificationsAdapter(handles.productEmailPort, {
              appBasePath: handles.appBasePath,
              coachEmail:
                handles.assessmentCallsConfig.ASSESSMENT_CALL_COACH_EMAIL,
              contactEmail: handles.contactEmail,
              publicAppUrl: handles.publicAppUrl,
            }),
          assessmentCallReservationsPort: postgresAssessmentCallRepository,
        }),
        clockPort: handles.clockPort,
        listOpenSlotsUseCase: new ListOpenSlotsUseCase({
          coachAvailabilityPort: coachScheduleAvailabilityAdapter,
          bookingWindow,
          clockPort: handles.clockPort,
          assessmentCallIncidentsPort: assessmentCallsIncidentsAdapter,
        }),
        resolveJoinLinkUseCase: new ResolveJoinLinkUseCase({
          meetingRoomPort: handles.coachMeetingRoomSourcePort,
          assessmentCallReservationsPort: postgresAssessmentCallRepository,
        }),
        unitOfWork,
      }),
      coachAssessmentCallsController: new CoachAssessmentCallsController({
        clockPort: handles.clockPort,
        listAssessmentCallsUseCase: new ListAssessmentCallsUseCase({
          coachAvailabilityPort: coachScheduleAvailabilityAdapter,
          assessmentCallIncidentsPort: assessmentCallsIncidentsAdapter,
          assessmentCallReservationsPort: postgresAssessmentCallRepository,
        }),
      }),
    },
    facades: {
      clientCallsFacade: new ClientCallsFacadeAdapter(
        postgresAssessmentCallRepository,
      ),
      endedCallsFacade: new EndedCallsFacadeAdapter(
        postgresAssessmentCallRepository,
      ),
    },
  };
}
