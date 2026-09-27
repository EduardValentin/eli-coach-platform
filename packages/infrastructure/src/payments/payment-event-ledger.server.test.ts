import { describe, expect, it, vi } from "vitest";

import { recordPaymentEvent } from "./payment-event-ledger.server";

type Transaction = Parameters<typeof recordPaymentEvent>[0];

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

function createLedgerInserting(rows: unknown) {
  const returning = vi.fn(() => rows);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const transaction = {
    insert: vi.fn(() => ({ values })),
  } as unknown as Transaction;

  return { transaction, values };
}
