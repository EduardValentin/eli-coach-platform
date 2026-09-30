import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { PostgresOnboardingClients } from "./onboarding-clients-reader.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const SUBMITTED_AT = new Date("2026-10-23T09:00:00.000Z");
const REVIEW_OPENED_AT = new Date("2026-10-24T09:00:00.000Z");

const CLIENT_ROW = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  gender: "female",
  dateOfBirth: "1994-03-14",
  country: "RO",
  phone: "+40712345678",
  submittedAt: SUBMITTED_AT,
  reviewOpenedAt: REVIEW_OPENED_AT,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

const ONBOARDING_CLIENT = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  gender: "female",
  dateOfBirth: "1994-03-14",
  country: "RO",
  phone: "+40712345678",
  submittedAt: SUBMITTED_AT,
  reviewStamps: {
    reviewOpenedAt: REVIEW_OPENED_AT,
    detailsRequestedAt: null,
    detailsAnsweredAt: null,
    answersApprovedAt: null,
  },
};

describe("PostgresOnboardingClients#findByAuthSubjectId", () => {
  it("reads the client bound to the subject with her identity, submission and review stamps", async () => {
    // arrange
    const clients = new PostgresOnboardingClients(
      createDatabaseAnswering([CLIENT_ROW]),
    );

    // act
    const client = await clients.findByAuthSubjectId("user_ana");

    // assert
    expect(client).toEqual(ONBOARDING_CLIENT);
  });

  it("answers null for a subject no client is bound to", async () => {
    // arrange
    const clients = new PostgresOnboardingClients(createDatabaseAnswering([]));

    // act
    const client = await clients.findByAuthSubjectId("user_unknown");

    // assert
    expect(client).toBeNull();
  });
});

describe("PostgresOnboardingClients#findByClientId", () => {
  it("reads the client with her submission and review stamps", async () => {
    // arrange
    const clients = new PostgresOnboardingClients(
      createDatabaseAnswering([CLIENT_ROW]),
    );

    // act
    const client = await clients.findByClientId(CLIENT_ID);

    // assert
    expect(client).toEqual(ONBOARDING_CLIENT);
  });

  it("reads no submission moment before she sent her onboarding", async () => {
    // arrange
    const clients = new PostgresOnboardingClients(
      createDatabaseAnswering([
        { ...CLIENT_ROW, submittedAt: null, reviewOpenedAt: null },
      ]),
    );

    // act
    const client = await clients.findByClientId(CLIENT_ID);

    // assert
    expect(client?.submittedAt).toBeNull();
    expect(client?.reviewStamps.reviewOpenedAt).toBeNull();
  });

  it("answers null for an unknown client", async () => {
    // arrange
    const clients = new PostgresOnboardingClients(createDatabaseAnswering([]));

    // act
    const client = await clients.findByClientId(CLIENT_ID);

    // assert
    expect(client).toBeNull();
  });
});

function createDatabaseAnswering(
  rows: readonly Record<string, unknown>[],
): DatabaseClient {
  return {
    select: (columns: Record<string, unknown>) => {
      const selection = {
        from: () => selection,
        where: () => selection,
        limit: () =>
          Promise.resolve(
            rows.map((row) =>
              Object.fromEntries(
                Object.keys(columns).map((column) => [column, row[column]]),
              ),
            ),
          ),
      };

      return selection;
    },
  } as unknown as DatabaseClient;
}
