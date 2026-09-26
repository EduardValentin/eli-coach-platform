import type { DatabaseClient } from "@eli-coach-platform/db";
import type { FeatureFlagSet } from "@eli-coach-platform/domain/feature-flag";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import { assessmentCallsTable } from "~/features/assessment-calls/data/schema.server";

import {
  composeAssessmentCallsFeature,
  type AssessmentCallsFeatureHandles,
} from "./assessment-calls-composition.server";

const BOOKED_ROW = {
  id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training three times a week.",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  startsAt: new Date("2026-10-20T14:00:00.000Z"),
  visitorTimeZone: "Europe/Chisinau",
  coachTimeZone: "Europe/Chisinau",
  bookedAt: new Date("2026-10-18T09:30:00.000Z"),
};

describe("composeAssessmentCallsFeature", () => {
  it("hides the booking page while the site is in waitlist mode", async () => {
    // arrange
    const { feature } = composeAssessmentCallsFeature(
      createHandles({ WAITLIST_MODE: true }),
    );

    // act
    const loading = feature.assessmentCalls.loadBookingPage();

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("reports unreadable availability when the database is unreachable", async () => {
    // arrange
    const { feature } = composeAssessmentCallsFeature(
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

  it("serves the coach every booked call in her own time zone", async () => {
    // arrange
    const { feature } = composeAssessmentCallsFeature({
      ...createHandles({ WAITLIST_MODE: false }),
      database: createDatabaseWithoutSavedAvailability([BOOKED_ROW]),
    });

    // act
    const listing = await feature.coachAssessmentCalls.loadCalls();

    // assert
    expect(listing.calls.map((call) => call.id)).toEqual([
      "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
    ]);
    expect(listing.coachTimeZone).toBe("Europe/Bucharest");
    expect(listing.now).toBe("2026-10-19T08:00:00.000Z");
  });
});

describe("composeAssessmentCallsFeature assessment call reader", () => {
  it("reads a booked call as a snapshot for coaching sales", async () => {
    // arrange
    const { handles } = composeAssessmentCallsFeature({
      ...createHandles({ WAITLIST_MODE: false }),
      database: createDatabaseWithoutSavedAvailability([BOOKED_ROW]),
    });

    // act
    const call = await handles.assessmentCallReader.findById(BOOKED_ROW.id);

    // assert
    expect(call).toMatchObject({
      endsAt: new Date("2026-10-20T14:30:00.000Z"),
      fullName: "Ana Popescu",
      id: BOOKED_ROW.id,
      visitorEmail: "ana@example.com",
    });
  });

  it("answers null for a call that was never booked", async () => {
    // arrange
    const { handles } = composeAssessmentCallsFeature({
      ...createHandles({ WAITLIST_MODE: false }),
      database: createDatabaseWithoutSavedAvailability([]),
    });

    // act
    const call = await handles.assessmentCallReader.findById(BOOKED_ROW.id);

    // assert
    expect(call).toBeNull();
  });
});

function createHandles(
  featureFlags: FeatureFlagSet,
): AssessmentCallsFeatureHandles {
  return {
    appBasePath: "/eli-coach-platform",
    assessmentCallsConfig: {
      ASSESSMENT_CALL_COACH_EMAIL: "coach@evoa.fit",
    },
    botDetection: { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" },
    botVerifier: { verifySubmission: async () => ({ status: "verified" }) },
    clock: { now: () => new Date("2026-10-19T08:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    database: createDatabaseStub(),
    featureFlags: { execute: async () => featureFlags },
    incidents: {
      bookingModeReadFailed: () => {},
      callsReadFailed: () => {},
      notificationFailed: () => {},
      slotsReadFailed: () => {},
    },
    productEmail: new InMemoryProductEmail(),
    publicAppUrl: "https://evoa.fit",
  };
}

function createDatabaseWithoutSavedAvailability(
  bookedCallRows: readonly unknown[],
): DatabaseClient {
  function chainResolving(resolvedRows: readonly unknown[]) {
    return {
      orderBy: () => chainResolving(resolvedRows),
      where: () => chainResolving(resolvedRows),
      limit: () => chainResolving(resolvedRows),
      then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
        Promise.resolve(resolvedRows).then(onFulfilled),
    };
  }

  return {
    select: () => ({
      from: (table: unknown) =>
        chainResolving(table === assessmentCallsTable ? bookedCallRows : []),
    }),
  } as unknown as DatabaseClient;
}

function createDatabaseStub(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}
