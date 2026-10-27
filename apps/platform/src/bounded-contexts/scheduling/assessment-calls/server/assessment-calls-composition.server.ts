import type { AssessmentCallsConfig } from "~/bounded-contexts/scheduling/assessment-calls/config.server";
import type { DatabaseClient } from "~/shared/database";
import {
  AssessmentCallBookingWindow,
  BookAssessmentCallUseCase,
  ListAssessmentCallsUseCase,
  ListOpenSlotsUseCase,
  ResolveJoinLinkUseCase,
  type AssessmentCallIncidents,
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

import { AssessmentCallsController } from "~/bounded-contexts/scheduling/assessment-calls/api/booking/assessment-calls-controller.server";
import { CoachAssessmentCallsController } from "~/bounded-contexts/scheduling/assessment-calls/api/coach/coach-assessment-calls-controller.server";
import { RandomAssessmentCallIds } from "~/bounded-contexts/scheduling/assessment-calls/data/random-assessment-call-ids.server";
import {
  PostgresAssessmentCallRepository,
  type AssessmentCallCoachTime,
} from "~/bounded-contexts/scheduling/assessment-calls/data/repository.server";
import { createAssessmentCallNotifications } from "~/bounded-contexts/scheduling/assessment-calls/email/create-assessment-call-notifications.server";

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
  emailAcceptance: EmailAcceptance;
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
          emailAcceptance: handles.emailAcceptance,
          ids: new RandomAssessmentCallIds(),
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
