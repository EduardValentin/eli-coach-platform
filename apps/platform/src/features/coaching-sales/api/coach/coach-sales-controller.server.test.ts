import { EmailAddress } from "@eli-coach-platform/domain/email-address";
import { describe, expect, it, vi } from "vitest";

import { CoachSalesController } from "./coach-sales-controller.server";

const CLIENT_ID = "2d3e4f50-6172-4839-9a0b-1c2d3e4f5061";

describe("CoachSalesController", () => {
  it("reads the sales state of each named call, and the client a paid one created, into a plain record", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue(
      new Map([
        ["call-1", { state: "held", clientId: null }],
        ["call-2", { state: "payment-link-sent", clientId: null }],
        ["call-3", { state: "paid", clientId: CLIENT_ID }],
      ]),
    );
    const controller = new CoachSalesController({
      readCallSalesStates: { execute } as never,
      readPricingTiers: { execute: vi.fn() } as never,
    });

    // act
    const states = await controller.loadCallSales([
      "call-1",
      "call-2",
      "call-3",
    ]);

    // assert
    expect(states).toEqual({
      "call-1": { state: "held", clientId: null },
      "call-2": { state: "payment-link-sent", clientId: null },
      "call-3": { state: "paid", clientId: CLIENT_ID },
    });
    expect(execute).toHaveBeenCalledWith(["call-1", "call-2", "call-3"]);
  });

  it("reads the price tier each call's email holds, keyed by the call", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue(
      new Map([
        ["ana@example.com", "reduced"],
        ["bea@example.com", "regular"],
      ]),
    );
    const controller = new CoachSalesController({
      readCallSalesStates: { execute: vi.fn() } as never,
      readPricingTiers: { execute } as never,
    });

    // act
    const tiers = await controller.loadPricingTiers([
      { email: " Ana@Example.com ", id: "call-1" },
      { email: "bea@example.com", id: "call-2" },
      { email: "ana@example.com", id: "call-3" },
    ]);

    // assert
    expect(tiers).toEqual({
      "call-1": "reduced",
      "call-2": "regular",
      "call-3": "reduced",
    });
    expect(execute).toHaveBeenCalledWith([
      EmailAddress.normalize("ana@example.com"),
      EmailAddress.normalize("bea@example.com"),
      EmailAddress.normalize("ana@example.com"),
    ]);
  });
});
