import type { DatabaseClient } from "@eli-coach-platform/db";
import { ClientInvitation } from "@eli-coach-platform/domain/client-invitation";
import { describe, expect, it } from "vitest";

import { PostgresClientInvitations } from "./invitations-repository.server";

const NOW = new Date("2026-10-21T09:00:00.000Z");
const INVITATION_ID = "5b1c7a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const SUBJECT = "user_invited";

describe("PostgresClientInvitations#findByTokenHash", () => {
  it("reconstitutes a stored invitation with the identity invitation it carries", async () => {
    // arrange
    const invitations = new PostgresClientInvitations(
      createDatabaseAnswering([
        invitationRow({
          providerInvitationId: "inv_1",
          providerInvitationUrl: "https://accounts.evoa.fit/sign-up?ticket=1",
        }),
      ]),
    );

    // act
    const invitation = await invitations.findByTokenHash("a".repeat(64));

    // assert
    expect(invitation?.id).toBe(INVITATION_ID);
    expect(invitation?.provider).toEqual({
      id: "inv_1",
      url: "https://accounts.evoa.fit/sign-up?ticket=1",
    });
    expect(invitation?.resolve(NOW)).toBe("valid");
  });

  it("reconstitutes an invitation Clerk has not created yet without a provider", async () => {
    // arrange
    const invitations = new PostgresClientInvitations(
      createDatabaseAnswering([invitationRow({})]),
    );

    // act
    const invitation = await invitations.findByTokenHash("a".repeat(64));

    // assert
    expect(invitation?.provider).toBeNull();
  });

  it("answers null for a hash no invitation carries", async () => {
    // arrange
    const invitations = new PostgresClientInvitations(
      createDatabaseAnswering([]),
    );

    // act
    const invitation = await invitations.findByTokenHash("b".repeat(64));

    // assert
    expect(invitation).toBeNull();
  });
});

describe("PostgresClientInvitations#insert", () => {
  it("stores the issued invitation as created at the moment it was sent", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const invitations = new PostgresClientInvitations(database.client);

    // act
    await invitations.insert(issuedInvitation());

    // assert
    expect(database.writes).toEqual([
      expect.objectContaining({
        id: INVITATION_ID,
        clientId: CLIENT_ID,
        tokenHash: "a".repeat(64),
        sentAt: NOW,
        createdAt: NOW,
        providerInvitationId: null,
        providerInvitationUrl: null,
        emailSentAt: null,
      }),
    ]);
  });
});

describe("PostgresClientInvitations#reissue", () => {
  it("rewrites the token and its validity and clears the email outcome, leaving the identity invitation alone", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const invitations = new PostgresClientInvitations(database.client);
    const later = new Date("2026-10-22T09:00:00.000Z");
    const reissued = issuedInvitation().reissue({
      tokenHash: "c".repeat(64),
      sentAt: later,
    });

    // act
    await invitations.reissue(reissued);

    // assert
    expect(database.writes).toEqual([
      {
        tokenHash: "c".repeat(64),
        sentAt: later,
        expiresAt: new Date("2026-11-21T09:00:00.000Z"),
        emailSentAt: null,
        emailDeliveryFailedAt: null,
      },
    ]);
  });
});

describe("PostgresClientInvitations#accept", () => {
  it("marks the invitation used by the subject and binds the client to it", async () => {
    // arrange
    const database = createDatabaseAccepting([{ clientId: CLIENT_ID }]);
    const invitations = new PostgresClientInvitations(database.client);

    // act
    const outcome = await invitations.accept({
      invitationId: INVITATION_ID,
      authSubjectId: SUBJECT,
      now: NOW,
    });

    // assert
    expect(outcome).toBe("accepted");
    expect(database.writes).toEqual([
      { usedAt: NOW, acceptedByAuthSubjectId: SUBJECT },
      { authSubjectId: SUBJECT },
    ]);
  });

  it("answers raced and binds nothing when another request used the invitation first", async () => {
    // arrange
    const database = createDatabaseAccepting([]);
    const invitations = new PostgresClientInvitations(database.client);

    // act
    const outcome = await invitations.accept({
      invitationId: INVITATION_ID,
      authSubjectId: SUBJECT,
      now: NOW,
    });

    // assert
    expect(outcome).toBe("raced");
    expect(database.writes).toEqual([
      { usedAt: NOW, acceptedByAuthSubjectId: SUBJECT },
    ]);
  });

  it("answers raced when the subject is already bound to another client", async () => {
    // arrange
    const invitations = new PostgresClientInvitations(
      createDatabaseFailingTransactionWith(
        uniqueViolation("clients_auth_subject_id_unique"),
      ),
    );

    // act
    const outcome = await invitations.accept({
      invitationId: INVITATION_ID,
      authSubjectId: SUBJECT,
      now: NOW,
    });

    // assert
    expect(outcome).toBe("raced");
  });

  it("rethrows any other failure", async () => {
    // arrange
    const failure = uniqueViolation("client_invitations_token_hash_unique");
    const invitations = new PostgresClientInvitations(
      createDatabaseFailingTransactionWith(failure),
    );

    // act
    const accepting = invitations.accept({
      invitationId: INVITATION_ID,
      authSubjectId: SUBJECT,
      now: NOW,
    });

    // assert
    await expect(accepting).rejects.toBe(failure);
  });
});

function issuedInvitation(): ClientInvitation {
  return ClientInvitation.issue({
    id: INVITATION_ID,
    clientId: CLIENT_ID,
    email: "ana@example.com",
    tokenHash: "a".repeat(64),
    sentAt: NOW,
  });
}

function invitationRow(provider: {
  providerInvitationId?: string;
  providerInvitationUrl?: string;
}) {
  return {
    id: INVITATION_ID,
    clientId: CLIENT_ID,
    email: "ana@example.com",
    tokenHash: "a".repeat(64),
    sentAt: new Date("2026-10-20T09:00:00.000Z"),
    expiresAt: new Date("2026-11-19T09:00:00.000Z"),
    usedAt: null,
    acceptedByAuthSubjectId: null,
    providerInvitationId: provider.providerInvitationId ?? null,
    providerInvitationUrl: provider.providerInvitationUrl ?? null,
    emailSentAt: null,
    emailDeliveryFailedAt: null,
    createdAt: new Date("2026-10-20T09:00:00.000Z"),
  };
}

function uniqueViolation(constraint: string): Error {
  return Object.assign(new Error("duplicate key value"), {
    cause: { code: "23505", constraint },
  });
}

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  const selection = {
    from: () => selection,
    where: () => selection,
    limit: () => Promise.resolve(rows),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}

function createDatabaseRecordingWrites() {
  const writes: unknown[] = [];
  const client = {
    insert: () => ({
      values: async (row: unknown) => {
        writes.push(row);
      },
    }),
    update: () => ({
      set: (values: unknown) => {
        writes.push(values);

        return { where: async () => undefined };
      },
    }),
  } as unknown as DatabaseClient;

  return { client, writes };
}

function createDatabaseAccepting(acceptedRows: readonly unknown[]) {
  const writes: unknown[] = [];
  const transaction = {
    update: () => ({
      set: (values: unknown) => {
        writes.push(values);

        return {
          where: () =>
            Object.assign(Promise.resolve(), {
              returning: async () => acceptedRows,
            }),
        };
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
