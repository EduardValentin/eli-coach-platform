import type { DatabaseClient } from "~/shared/database";
import { AccountInvitation } from "~/bounded-contexts/access/accounts/domain/account";
import { describe, expect, it } from "vitest";

import { PostgresAccountInvitations } from "./account-invitations-repository.server";

const NOW = new Date("2026-10-21T09:00:00.000Z");
const INVITATION_ID = "5b1c7a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const SUBJECT = "user_invited";

describe("PostgresAccountInvitations#findByTokenHash", () => {
  it("reconstitutes a stored invitation with the identity invitation it carries", async () => {
    // arrange
    const invitations = new PostgresAccountInvitations(
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
    expect(invitation?.isPending(NOW)).toBe(true);
  });

  it("reconstitutes an invitation Clerk has not created yet without a provider", async () => {
    // arrange
    const invitations = new PostgresAccountInvitations(
      createDatabaseAnswering([invitationRow({})]),
    );

    // act
    const invitation = await invitations.findByTokenHash("a".repeat(64));

    // assert
    expect(invitation?.provider).toBeNull();
  });

  it("answers null for a hash no invitation carries", async () => {
    // arrange
    const invitations = new PostgresAccountInvitations(
      createDatabaseAnswering([]),
    );

    // act
    const invitation = await invitations.findByTokenHash("b".repeat(64));

    // assert
    expect(invitation).toBeNull();
  });
});

describe("PostgresAccountInvitations#insert", () => {
  it("stores the issued invitation as created at the moment it was sent", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const invitations = new PostgresAccountInvitations(database.client);

    // act
    await invitations.insert(issuedInvitation());

    // assert
    expect(database.writes).toEqual([
      expect.objectContaining({
        id: INVITATION_ID,
        role: "CLIENT",
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

describe("PostgresAccountInvitations#reissue", () => {
  it("rewrites the token and its validity and clears the email outcome, leaving the identity invitation alone", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const invitations = new PostgresAccountInvitations(database.client);
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

describe("PostgresAccountInvitations#accept", () => {
  it("marks the invitation accepted by the subject", async () => {
    // arrange
    const database = createDatabaseAccepting([{ id: INVITATION_ID }]);
    const invitations = new PostgresAccountInvitations(database.client);

    // act
    const outcome = await invitations.accept({
      invitationId: INVITATION_ID,
      authSubjectId: SUBJECT,
      at: NOW,
    });

    // assert
    expect(outcome).toBe("accepted");
    expect(database.writes).toEqual([
      { acceptedByAuthSubjectId: SUBJECT, acceptedAt: NOW },
    ]);
  });

  it("answers raced when another request accepted the invitation first", async () => {
    // arrange
    const database = createDatabaseAccepting([]);
    const invitations = new PostgresAccountInvitations(database.client);

    // act
    const outcome = await invitations.accept({
      invitationId: INVITATION_ID,
      authSubjectId: SUBJECT,
      at: NOW,
    });

    // assert
    expect(outcome).toBe("raced");
  });
});

function issuedInvitation(): AccountInvitation {
  return AccountInvitation.issue({
    id: INVITATION_ID,
    email: "ana@example.com",
    role: "CLIENT",
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
    email: "ana@example.com",
    role: "CLIENT",
    tokenHash: "a".repeat(64),
    sentAt: new Date("2026-10-20T09:00:00.000Z"),
    expiresAt: new Date("2026-11-19T09:00:00.000Z"),
    providerInvitationId: provider.providerInvitationId ?? null,
    providerInvitationUrl: provider.providerInvitationUrl ?? null,
    emailSentAt: null,
    emailDeliveryFailedAt: null,
    acceptedByAuthSubjectId: null,
    acceptedAt: null,
    createdAt: new Date("2026-10-20T09:00:00.000Z"),
  };
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
  const client = {
    update: () => ({
      set: (values: unknown) => {
        writes.push(values);

        return {
          where: () => ({ returning: async () => acceptedRows }),
        };
      },
    }),
  } as unknown as DatabaseClient;

  return { client, writes };
}
