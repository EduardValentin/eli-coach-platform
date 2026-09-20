import type { AssessmentCallsConfig } from "@eli-coach-platform/config";
import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  AssessmentCallBookingWindow,
  BookAssessmentCallUseCase,
  ListAssessmentCallsUseCase,
  ListOpenSlotsUseCase,
  ResolveJoinLinkUseCase,
  type AssessmentCallIncidents,
} from "@eli-coach-platform/domain/assessment-call";
import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";
import type { BotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";
import { PostgresCoachCalendar } from "@eli-coach-platform/infrastructure/coach-calendar/server";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { AssessmentCallsController } from "~/features/assessment-calls/api/assessment-calls-controller.server";
import { CoachAssessmentCallsController } from "~/features/assessment-calls/api/coach-assessment-calls-controller.server";
import { ConfiguredMeetingRoomLink } from "~/features/assessment-calls/data/configured-meeting-room-link.server";
import { PostgresAssessmentCallRepository } from "~/features/assessment-calls/data/repository.server";
import { StaticCoachAvailability } from "~/features/assessment-calls/data/static-coach-availability.server";
import { createAssessmentCallNotifications } from "~/features/assessment-calls/email/create-assessment-call-notifications.server";

export type AssessmentCallsFeature = {
  assessmentCalls: AssessmentCallsController;
  coachAssessmentCalls: CoachAssessmentCallsController;
};

export type AssessmentCallsFeatureHandles = {
  appBasePath: string;
  assessmentCallsConfig: AssessmentCallsConfig;
  botDetection: BotDetectionConfig;
  botVerifier: BotVerifier;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  featureFlags: FeatureFlagReader;
  incidents: AssessmentCallIncidents;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

export function composeAssessmentCallsFeature(
  handles: AssessmentCallsFeatureHandles,
): AssessmentCallsFeature {
  const availability = new StaticCoachAvailability();
  const reservations = new PostgresAssessmentCallRepository(handles.database);
  const bookingWindow = new AssessmentCallBookingWindow({
    featureFlags: handles.featureFlags,
    incidents: handles.incidents,
  });

  return {
    assessmentCalls: new AssessmentCallsController({
      botDetection: handles.botDetection,
      botVerifier: handles.botVerifier,
      bookAssessmentCall: new BookAssessmentCallUseCase({
        availability,
        bookingWindow,
        clock: handles.clock,
        incidents: handles.incidents,
        notifications: createAssessmentCallNotifications(handles.productEmail, {
          appBasePath: handles.appBasePath,
          coachEmail: handles.assessmentCallsConfig.ASSESSMENT_CALL_COACH_EMAIL,
          contactEmail: handles.contactEmail,
          publicAppUrl: handles.publicAppUrl,
        }),
        reservations,
      }),
      listOpenSlots: new ListOpenSlotsUseCase({
        availability,
        bookingWindow,
        calendar: new PostgresCoachCalendar(handles.database),
        clock: handles.clock,
        incidents: handles.incidents,
      }),
      resolveJoinLink: new ResolveJoinLinkUseCase({
        meetingRoomLink: new ConfiguredMeetingRoomLink(
          handles.assessmentCallsConfig.ASSESSMENT_CALL_MEETING_LINK,
        ),
        reservations,
      }),
    }),
    coachAssessmentCalls: new CoachAssessmentCallsController({
      clock: handles.clock,
      listAssessmentCalls: new ListAssessmentCallsUseCase({
        availability,
        reservations,
      }),
    }),
  };
}
