import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { PostgresInvitedClients } from "./invited-clients-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

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
    });
  });

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
    where: () => selection,
    limit: () => Promise.resolve(rows),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}
