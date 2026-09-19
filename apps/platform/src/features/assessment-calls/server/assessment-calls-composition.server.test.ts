import type { DatabaseClient } from "@eli-coach-platform/db";
import type { FeatureFlagSet } from "@eli-coach-platform/domain/feature-flag";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import {
  composeAssessmentCallsFeature,
  type AssessmentCallsFeatureHandles,
} from "./assessment-calls-composition.server";

const BOOKED_ROW = {
  id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
  visitorName: "Ana Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training three times a week.",
  startsAt: new Date("2026-10-20T14:00:00.000Z"),
  visitorTimeZone: "Europe/Chisinau",
  coachTimeZone: "Europe/Chisinau",
  bookedAt: new Date("2026-10-18T09:30:00.000Z"),
};

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

  it("serves the coach dashboard every booked call in her own time zone", async () => {
    // arrange
    const feature = composeAssessmentCallsFeature({
      ...createHandles({ WAITLIST_MODE: false }),
      database: createDatabaseReturning([BOOKED_ROW]),
    });

    // act
    const dashboard = await feature.coachAssessmentCalls.loadDashboard();

    // assert
    expect(dashboard.calls.map((call) => call.id)).toEqual([
      "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
    ]);
    expect(dashboard.coachTimeZone).toBe("Europe/Bucharest");
    expect(dashboard.now).toBe("2026-10-19T08:00:00.000Z");
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

function createDatabaseReturning(rows: readonly unknown[]): DatabaseClient {
  const chain = {
    from: () => chain,
    orderBy: () => chain,
    then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };

  return { select: () => chain } as unknown as DatabaseClient;
}

function createDatabaseStub(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}
