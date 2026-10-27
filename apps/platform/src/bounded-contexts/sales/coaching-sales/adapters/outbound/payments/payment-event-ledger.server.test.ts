import { describe, expect, it, vi } from "vitest";

import {
  recordEventOnce,
  recordPaymentEvent,
} from "./payment-event-ledger.server";

type Transaction = Parameters<typeof recordPaymentEvent>[0];
type Database = Parameters<typeof recordEventOnce>[0];

const ENTRY = {
  eventId: "evt_1",
  receivedAt: new Date("2026-09-27T10:00:00.000Z"),
};

describe("recordPaymentEvent", () => {
  it("records an event the ledger has not seen", async () => {
    // arrange
    const ledger = createLedgerInserting([{ id: "evt_1" }]);

    // act
    const outcome = await recordPaymentEvent(ledger.transaction, ENTRY);

    // assert
    expect(outcome).toBe("recorded");
    expect(ledger.values).toHaveBeenCalledWith({
      id: "evt_1",
      receivedAt: ENTRY.receivedAt,
    });
  });

  it("answers duplicate when the ledger already holds the event", async () => {
    // arrange
    const ledger = createLedgerInserting([]);

    // act
    const outcome = await recordPaymentEvent(ledger.transaction, ENTRY);

    // assert
    expect(outcome).toBe("duplicate");
  });

  it("rethrows a failure of the insert", async () => {
    // arrange
    const failure = new Error("connection reset");
    const ledger = createLedgerInserting(Promise.reject(failure));

    // act
    const recording = recordPaymentEvent(ledger.transaction, ENTRY);

    // assert
    await expect(recording).rejects.toBe(failure);
  });
});

describe("recordEventOnce", () => {
  it("records the event and its write together", async () => {
    // arrange
    const ledger = createLedgerInserting([{ id: "evt_1" }]);
    const write = vi.fn(async () => true);

    // act
    const outcome = await recordEventOnce(databaseOver(ledger.transaction), {
      ...ENTRY,
      write,
    });

    // assert
    expect(outcome).toBe("recorded");
    expect(write).toHaveBeenCalledWith(ledger.transaction);
  });

  it("answers duplicate without writing when the ledger already holds the event", async () => {
    // arrange
    const ledger = createLedgerInserting([]);
    const write = vi.fn(async () => true);

    // act
    const outcome = await recordEventOnce(databaseOver(ledger.transaction), {
      ...ENTRY,
      write,
    });

    // assert
    expect(outcome).toBe("duplicate");
    expect(write).not.toHaveBeenCalled();
  });

  it("answers stale and rolls the event back when the write finds the row changed", async () => {
    // arrange
    const ledger = createLedgerInserting([{ id: "evt_1" }]);
    const database = databaseOver(ledger.transaction);

    // act
    const outcome = await recordEventOnce(database, {
      ...ENTRY,
      write: async () => false,
    });

    // assert
    expect(outcome).toBe("stale");
    await expect(
      vi.mocked(database.transaction).mock.results[0]?.value,
    ).rejects.toThrow();
  });

  it("rethrows a failure of the write", async () => {
    // arrange
    const failure = new Error("connection reset");
    const ledger = createLedgerInserting([{ id: "evt_1" }]);

    // act
    const recording = recordEventOnce(databaseOver(ledger.transaction), {
      ...ENTRY,
      write: () => Promise.reject(failure),
    });

    // assert
    await expect(recording).rejects.toBe(failure);
  });
});

function databaseOver(transaction: Transaction): Database {
  return {
    transaction: vi.fn((work: (inner: Transaction) => Promise<unknown>) =>
      work(transaction),
    ),
  } as unknown as Database;
}

function createLedgerInserting(rows: unknown) {
  const returning = vi.fn(() => rows);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const transaction = {
    insert: vi.fn(() => ({ values })),
  } as unknown as Transaction;

  return { transaction, values };
}
