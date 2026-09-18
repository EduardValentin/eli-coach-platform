import type { AssessmentCallsConfig } from "@eli-coach-platform/config";
import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  BookAssessmentCallUseCase,
  ListOpenSlotsUseCase,
  ResolveJoinLinkUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import type {
  BotVerifier,
  Clock,
  Logger,
  ProductEmail,
} from "@eli-coach-platform/domain/shared";
import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";

import { AssessmentCallsController } from "~/features/assessment-calls/api/assessment-calls-controller.server";
import { ConfiguredMeetingRoomLink } from "~/features/assessment-calls/data/configured-meeting-room-link.server";
import { PostgresAssessmentCallRepository } from "~/features/assessment-calls/data/repository.server";
import { StaticCoachAvailability } from "~/features/assessment-calls/data/static-coach-availability.server";
import { createAssessmentCallNotifications } from "~/features/assessment-calls/email/create-assessment-call-notifications.server";

export type AssessmentCallsFeature = {
  assessmentCalls: AssessmentCallsController;
};

export type AssessmentCallsFeatureHandles = {
  appBasePath: string;
  assessmentCalls: AssessmentCallsConfig;
  bookingOpen: boolean;
  botDetection: BotDetectionConfig;
  botVerifier: BotVerifier;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  logger: Logger;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

export function composeAssessmentCallsFeature(
  handles: AssessmentCallsFeatureHandles,
): AssessmentCallsFeature {
  const availability = new StaticCoachAvailability();
  const reservations = new PostgresAssessmentCallRepository(handles.database);

  return {
    assessmentCalls: new AssessmentCallsController({
      botDetection: handles.botDetection,
      botVerifier: handles.botVerifier,
      bookAssessmentCall: new BookAssessmentCallUseCase({
        availability,
        bookingOpen: handles.bookingOpen,
        clock: handles.clock,
        coachTimeZone: availability.timeZone,
        logger: handles.logger,
        notifications: createAssessmentCallNotifications(handles.productEmail, {
          appBasePath: handles.appBasePath,
          coachEmail: handles.assessmentCalls.ASSESSMENT_CALL_COACH_EMAIL,
          contactEmail: handles.contactEmail,
          publicAppUrl: handles.publicAppUrl,
        }),
        reservations,
      }),
      listOpenSlots: new ListOpenSlotsUseCase({
        availability,
        bookingOpen: handles.bookingOpen,
        clock: handles.clock,
        logger: handles.logger,
        reservations,
      }),
      resolveJoinLink: new ResolveJoinLinkUseCase({
        meetingRoomLink: new ConfiguredMeetingRoomLink(
          handles.assessmentCalls.ASSESSMENT_CALL_MEETING_LINK,
        ),
        reservations,
      }),
    }),
  };
}
