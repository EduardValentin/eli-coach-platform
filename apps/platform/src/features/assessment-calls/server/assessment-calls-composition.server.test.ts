import type { DatabaseClient } from "@eli-coach-platform/db";
import type { FeatureFlagSet } from "@eli-coach-platform/domain/feature-flag";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import {
  composeAssessmentCallsFeature,
  type AssessmentCallsFeatureHandles,
} from "./assessment-calls-composition.server";

describe("composeAssessmentCallsFeature", () => {
  it("hides the booking page while the site is in waitlist mode", async () => {
    // arrange
    const feature = composeAssessmentCallsFeature(
      createHandles({ WAITLIST_MODE: true }),
    );

    // act
    const loading = feature.assessmentCalls.loadBookingPage();

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("reports unreadable availability when the database is unreachable", async () => {
    // arrange
    const feature = composeAssessmentCallsFeature(
      createHandles({ WAITLIST_MODE: false }),
    );

    // act
    const page = await feature.assessmentCalls.loadBookingPage();

    // assert
    expect(page).toEqual({
      botDetection: { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" },
      status: "unavailable",
    });
  });
});

function createHandles(
  featureFlags: FeatureFlagSet,
): AssessmentCallsFeatureHandles {
  return {
    appBasePath: "/eli-coach-platform",
    assessmentCallsConfig: {
      ASSESSMENT_CALL_COACH_EMAIL: "coach@evoa.fit",
      ASSESSMENT_CALL_MEETING_LINK: "https://meet.example/eli",
    },
    botDetection: { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" },
    botVerifier: { verifySubmission: async () => ({ status: "verified" }) },
    clock: { now: () => new Date("2026-10-19T08:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    database: createDatabaseStub(),
    featureFlags: { execute: async () => featureFlags },
    incidents: {
      bookingModeReadFailed: () => {},
      notificationFailed: () => {},
      slotsReadFailed: () => {},
    },
    productEmail: new InMemoryProductEmail(),
    publicAppUrl: "https://evoa.fit",
  };
}

function createDatabaseStub(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}
