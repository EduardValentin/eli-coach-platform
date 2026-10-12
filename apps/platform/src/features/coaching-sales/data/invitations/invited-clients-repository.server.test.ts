import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { PostgresInvitedClients } from "./invited-clients-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

function currentSubscription(status: string) {
  return {
    id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    clientId: CLIENT_ID,
    bundleId: "3-months",
    months: 3,
    tier: "regular",
    amountCents: 44700,
    currency: "eur",
    paymentCustomerId: "cus_1",
    paymentSubscriptionId: "sub_1",
    checkoutSessionId: "cs_1",
    paidAt: new Date("2026-09-26T10:00:00.000Z"),
    startChoice: "immediate",
    status,
    cancelledAt: null,
    accessEndsAt: null,
    paymentProblemSince: null,
    refundReason: null,
    refundDueCents: null,
    refundDueBy: null,
    refundedCents: null,
    refundedAt: null,
  };
}

describe("PostgresInvitedClients#findById", () => {
  it("answers the paid client with the subject she is bound to", async () => {
    // arrange
    const invitedClients = new PostgresInvitedClients(
      createDatabaseAnswering([
        {
          id: CLIENT_ID,
          email: "ana@example.com",
          firstName: "Ana",
          authSubjectId: null,
          subscription: currentSubscription("not-started"),
        },
      ]),
    );

    // act
    const client = await invitedClients.findById(CLIENT_ID);

    // assert
    expect(client).toEqual({
      id: CLIENT_ID,
      email: "ana@example.com",
      firstName: "Ana",
      authSubjectId: null,
      subscriptionCancelledOrEnded: false,
    });
  });

  it.each([
    ["cancelled", true],
    ["ended", true],
    ["active", false],
    [null, false],
  ] as const)(
    "reads her coaching as closed for a current %s subscription: %s",
    async (status, expected) => {
      // arrange
      const invitedClients = new PostgresInvitedClients(
        createDatabaseAnswering([
          {
            id: CLIENT_ID,
            email: "ana@example.com",
            firstName: "Ana",
            authSubjectId: null,
            subscription: status ? currentSubscription(status) : null,
          },
        ]),
      );

      // act
      const client = await invitedClients.findById(CLIENT_ID);

      // assert
      expect(client?.subscriptionCancelledOrEnded).toBe(expected);
    },
  );

  it("answers null for a client that does not exist", async () => {
    // arrange
    const invitedClients = new PostgresInvitedClients(
      createDatabaseAnswering([]),
    );

    // act
    const client = await invitedClients.findById(CLIENT_ID);

    // assert
    expect(client).toBeNull();
  });
});

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  const selection = {
    from: () => selection,
    leftJoin: () => selection,
    where: () => selection,
    limit: () => Promise.resolve(rows),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}
