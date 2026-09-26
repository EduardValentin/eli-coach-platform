import { describe, expect, it, vi } from "vitest";

import { CoachSalesController } from "./coach-sales-controller.server";

describe("CoachSalesController", () => {
  it("reads the sales state of each named call into a plain record", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue(
      new Map([
        ["call-1", "held"],
        ["call-2", "payment-link-sent"],
        ["call-3", "paid"],
      ]),
    );
    const controller = new CoachSalesController({
      readCallSalesStates: { execute } as never,
    });

    // act
    const states = await controller.loadSalesStates([
      "call-1",
      "call-2",
      "call-3",
    ]);

    // assert
    expect(states).toEqual({
      "call-1": "held",
      "call-2": "payment-link-sent",
      "call-3": "paid",
    });
    expect(execute).toHaveBeenCalledWith(["call-1", "call-2", "call-3"]);
  });
});
