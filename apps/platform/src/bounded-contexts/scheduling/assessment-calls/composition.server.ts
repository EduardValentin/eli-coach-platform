import type { AssessmentCallsConfig } from "~/bounded-contexts/scheduling/assessment-calls/config.server";
import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import {
  AssessmentCallBookingWindow,
  BookAssessmentCallUseCase,
  ListAssessmentCallsUseCase,
  ListOpenSlotsUseCase,
  ResolveJoinLinkUseCase,
  type AssessmentCallReader,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type {
  CoachAvailabilitySource,
  CoachCalendar,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { CoachMeetingRoomSource } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type { EmailAcceptance } from "~/bounded-contexts/scheduling/assessment-calls/domain/email-acceptance";
import type { FeatureFlagReader } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import type { Clock } from "~/bounded-contexts/scheduling/assessment-calls/domain/clock";
import type { BotDetectionConfig } from "~/shared/submission-checks/bot-detection";
import type { BotVerifier } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmail } from "~/shared/email/index.server";

import { AssessmentCallsController } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/booking/assessment-calls-controller.server";
import { CoachAssessmentCallsController } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/coach/coach-assessment-calls-controller.server";
import { RandomAssessmentCallIds } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/persistence/random-assessment-call-ids.server";
import {
  PostgresAssessmentCallRepository,
  type AssessmentCallCoachTime,
} from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/persistence/repository.server";
import { createAssessmentCallNotifications } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/email/create-assessment-call-notifications.server";
import type { AssessmentCallsFeature } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createAssessmentCallsIncidents } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/logging/assessment-calls-incidents.server";

type AssessmentCallsComposition = {
  feature: AssessmentCallsFeature;
  handles: { assessmentCallReader: AssessmentCallReader };
};

export type AssessmentCallsFeatureHandles = {
  appBasePath: string;
  assessmentCallsConfig: AssessmentCallsConfig;
  availability: CoachAvailabilitySource;
  botDetection: BotDetectionConfig;
  botVerifier: BotVerifier;
  calendar: CoachCalendar;
  clock: Clock;
  coachTime: AssessmentCallCoachTime;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptance;
  featureFlags: FeatureFlagReader;
  logger: Logger;
  meetingRoom: CoachMeetingRoomSource;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

export function composeAssessmentCallsFeature(
  handles: AssessmentCallsFeatureHandles,
): AssessmentCallsComposition {
  const incidents = createAssessmentCallsIncidents(handles.logger);
  const { availability } = handles;
  const unitOfWork = createUnitOfWork(handles.database);
  const reservations = new PostgresAssessmentCallRepository({
    coachTime: handles.coachTime,
    database: handles.database,
  });
  const bookingWindow = new AssessmentCallBookingWindow({
    featureFlags: handles.featureFlags,
    incidents,
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
          emailAcceptance: handles.emailAcceptance,
          ids: new RandomAssessmentCallIds(),
          incidents,
          notifications: createAssessmentCallNotifications(
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
          calendar: handles.calendar,
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
    handles: {
      assessmentCallReader: {
        findById: async (id) =>
          (await reservations.findById(id))?.toSnapshot() ?? null,
      },
    },
  };
}
