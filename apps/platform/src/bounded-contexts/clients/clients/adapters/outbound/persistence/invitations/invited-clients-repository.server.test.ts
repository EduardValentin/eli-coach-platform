import type { DatabaseClient } from "~/shared/database";
import { describe, expect, it } from "vitest";

import { PostgresInvitedClients } from "./invited-clients-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const INVITATION_ID = "5b1c7a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const SUBJECT = "user_invited";

function standingOf(status: string) {
  return {
    status,
    accessEndsAt:
      status === "cancelled" || status === "ended"
        ? new Date("2026-12-26T10:00:00.000Z")
        : null,
    refundDue: false,
    bundleMonths: 3,
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
          accountInvitationId: INVITATION_ID,
          standing: standingOf("not-started"),
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
      accountInvitationId: INVITATION_ID,
      coachingCancelledOrEnded: false,
    });
  });

  it.each([
    ["cancelled", true],
    ["ended", true],
    ["active", false],
    ["not-started", false],
  ] as const)(
    "reads her coaching as closed for a %s standing on her row: %s",
    async (status, expected) => {
      // arrange
      const invitedClients = new PostgresInvitedClients(
        createDatabaseAnswering([
          {
            id: CLIENT_ID,
            email: "ana@example.com",
            firstName: "Ana",
            authSubjectId: null,
            accountInvitationId: null,
            standing: standingOf(status),
          },
        ]),
      );

      // act
      const client = await invitedClients.findById(CLIENT_ID);

      // assert
      expect(client?.coachingCancelledOrEnded).toBe(expected);
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

describe("PostgresInvitedClients#bindAuthSubject", () => {
  it("binds the client to the subject", async () => {
    // arrange
    const database = createDatabaseBinding([{ id: CLIENT_ID }]);
    const invitedClients = new PostgresInvitedClients(database.client);

    // act
    const outcome = await invitedClients.bindAuthSubject({
      clientId: CLIENT_ID,
      authSubjectId: SUBJECT,
    });

    // assert
    expect(outcome).toBe("bound");
    expect(database.writes).toEqual([{ authSubjectId: SUBJECT }]);
  });

  it("answers raced when another request bound the client first", async () => {
    // arrange
    const database = createDatabaseBinding([]);
    const invitedClients = new PostgresInvitedClients(database.client);

    // act
    const outcome = await invitedClients.bindAuthSubject({
      clientId: CLIENT_ID,
      authSubjectId: SUBJECT,
    });

    // assert
    expect(outcome).toBe("raced");
  });

  it("answers raced when the subject is already bound to another client", async () => {
    // arrange
    const invitedClients = new PostgresInvitedClients(
      createDatabaseFailingTransactionWith(
        uniqueViolation("clients_auth_subject_id_unique"),
      ),
    );

    // act
    const outcome = await invitedClients.bindAuthSubject({
      clientId: CLIENT_ID,
      authSubjectId: SUBJECT,
    });

    // assert
    expect(outcome).toBe("raced");
  });

  it("rethrows any other failure", async () => {
    // arrange
    const failure = uniqueViolation("clients_account_invitation_id_unique");
    const invitedClients = new PostgresInvitedClients(
      createDatabaseFailingTransactionWith(failure),
    );

    // act
    const binding = invitedClients.bindAuthSubject({
      clientId: CLIENT_ID,
      authSubjectId: SUBJECT,
    });

    // assert
    await expect(binding).rejects.toBe(failure);
  });
});

function uniqueViolation(constraint: string): Error {
  return Object.assign(new Error("duplicate key value"), {
    cause: { code: "23505", constraint },
  });
}

function createDatabaseBinding(boundRows: readonly unknown[]) {
  const writes: unknown[] = [];
  const transaction = {
    update: () => ({
      set: (values: unknown) => {
        writes.push(values);

        return { where: () => ({ returning: async () => boundRows }) };
      },
    }),
  };
  const client = {
    transaction: (work: (tx: unknown) => Promise<unknown>) => work(transaction),
  } as unknown as DatabaseClient;

  return { client, writes };
}

function createDatabaseFailingTransactionWith(failure: Error): DatabaseClient {
  return {
    transaction: async () => {
      throw failure;
    },
  } as unknown as DatabaseClient;
}

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  const selection = {
    from: () => selection,
    leftJoin: () => selection,
    where: () => selection,
    limit: () => Promise.resolve(rows),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}
