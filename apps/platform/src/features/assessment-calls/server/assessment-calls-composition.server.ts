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
import type {
  CoachAvailabilitySource,
  CoachCalendar,
} from "@eli-coach-platform/domain/coach-availability";
import type { CoachMeetingRoomSource } from "@eli-coach-platform/domain/coach-meeting-room";
import type { EmailSubaddressPolicy } from "@eli-coach-platform/domain/email-address";
import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import type { AssessmentCallReader } from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";
import type { BotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { AssessmentCallsController } from "~/features/assessment-calls/api/booking/assessment-calls-controller.server";
import { CoachAssessmentCallsController } from "~/features/assessment-calls/api/coach/coach-assessment-calls-controller.server";
import {
  PostgresAssessmentCallRepository,
  type AssessmentCallCoachTime,
} from "~/features/assessment-calls/data/repository.server";
import { createAssessmentCallNotifications } from "~/features/assessment-calls/email/create-assessment-call-notifications.server";

export type AssessmentCallsFeature = {
  assessmentCalls: AssessmentCallsController;
  coachAssessmentCalls: CoachAssessmentCallsController;
};

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
  emailSubaddresses: EmailSubaddressPolicy;
  featureFlags: FeatureFlagReader;
  incidents: AssessmentCallIncidents;
  meetingRoom: CoachMeetingRoomSource;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

export function composeAssessmentCallsFeature(
  handles: AssessmentCallsFeatureHandles,
): AssessmentCallsComposition {
  const { availability } = handles;
  const reservations = new PostgresAssessmentCallRepository({
    coachTime: handles.coachTime,
    database: handles.database,
  });
  const bookingWindow = new AssessmentCallBookingWindow({
    featureFlags: handles.featureFlags,
    incidents: handles.incidents,
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
          emailSubaddresses: handles.emailSubaddresses,
          incidents: handles.incidents,
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
          incidents: handles.incidents,
        }),
        resolveJoinLink: new ResolveJoinLinkUseCase({
          meetingRoom: handles.meetingRoom,
          reservations,
        }),
      }),
      coachAssessmentCalls: new CoachAssessmentCallsController({
        clock: handles.clock,
        listAssessmentCalls: new ListAssessmentCallsUseCase({
          availability,
          incidents: handles.incidents,
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
