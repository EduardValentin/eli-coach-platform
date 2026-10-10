import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it, vi } from "vitest";

import { PostgresCheckIns } from "./postgres-check-ins.server";

const PENDING_ROW = {
  id: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
  clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
  startsAt: new Date("2026-10-22T14:00:00.000Z"),
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  status: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: "Can we talk about my knees?",
  requestedAt: new Date("2026-10-19T08:00:00.000Z"),
  answeredAt: null,
};

const APPROVED_ROW = {
  ...PENDING_ROW,
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  startsAt: new Date("2026-10-23T14:00:00.000Z"),
  status: "approved",
  note: null,
  answeredAt: new Date("2026-10-19T09:00:00.000Z"),
};

describe("PostgresCheckIns#find", () => {
  it("maps a stored row into the check-in the domain reads", async () => {
    // arrange
    const checkIns = new PostgresCheckIns(
      repositoryOptions(createDatabaseReturning([PENDING_ROW])),
    );

    // act
    const checkIn = await checkIns.find(PENDING_ROW.id);

    // assert
    expect(checkIn?.toSnapshot()).toEqual({
      id: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
      startsAt: new Date("2026-10-22T14:00:00.000Z"),
      endsAt: new Date("2026-10-22T15:00:00.000Z"),
      joinEmphasisFrom: new Date("2026-10-22T13:50:00.000Z"),
      clientTimeZone: "Europe/London",
      coachTimeZone: "Europe/Bucharest",
      kind: "ad_hoc",
      recordedStatus: "pending",
      initiatedBy: "client",
      proposedBy: "client",
      note: "Can we talk about my knees?",
      requestedAt: new Date("2026-10-19T08:00:00.000Z"),
      answeredAt: null,
    });
  });

  it("finds no check-in for an identifier that matches no row", async () => {
    // arrange
    const checkIns = new PostgresCheckIns(
      repositoryOptions(createDatabaseReturning([])),
    );

    // act
    const checkIn = await checkIns.find(PENDING_ROW.id);

    // assert
    expect(checkIn).toBeNull();
  });
});

describe("PostgresCheckIns#listForClient", () => {
  it("maps every stored row of the client into the check-ins the domain reads", async () => {
    // arrange
    const checkIns = new PostgresCheckIns(
      repositoryOptions(createDatabaseReturning([PENDING_ROW, APPROVED_ROW])),
    );

    // act
    const listed = await checkIns.listForClient(PENDING_ROW.clientId);

    // assert
    expect(
      listed.map((checkIn) => {
        const { id, recordedStatus, note, answeredAt } = checkIn.toSnapshot();

        return { id, recordedStatus, note, answeredAt };
      }),
    ).toEqual([
      {
        id: PENDING_ROW.id,
        recordedStatus: "pending",
        note: "Can we talk about my knees?",
        answeredAt: null,
      },
      {
        id: APPROVED_ROW.id,
        recordedStatus: "approved",
        note: null,
        answeredAt: new Date("2026-10-19T09:00:00.000Z"),
      },
    ]);
  });
});

describe("PostgresCheckIns#listAll", () => {
  it("lists nothing when no check-in is stored", async () => {
    // arrange
    const checkIns = new PostgresCheckIns(
      repositoryOptions(createDatabaseReturning([])),
    );

    // act
    const listed = await checkIns.listAll();

    // assert
    expect(listed).toEqual([]);
  });

  it("maps every stored row into the check-ins the domain reads", async () => {
    // arrange
    const checkIns = new PostgresCheckIns(
      repositoryOptions(createDatabaseReturning([PENDING_ROW, APPROVED_ROW])),
    );

    // act
    const listed = await checkIns.listAll();

    // assert
    expect(listed.map((checkIn) => checkIn.id)).toEqual([
      PENDING_ROW.id,
      APPROVED_ROW.id,
    ]);
  });
});

function repositoryOptions(database: DatabaseClient) {
  return {
    coachTime: {
      release: vi.fn(),
      reserve: vi.fn(),
    },
    database,
  };
}

function createDatabaseReturning(rows: readonly unknown[]): DatabaseClient {
  return {
    select: vi.fn().mockReturnValue(createQueryChain(rows)),
  } as unknown as DatabaseClient;
}

function createQueryChain(rows: readonly unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };

  return chain;
}
