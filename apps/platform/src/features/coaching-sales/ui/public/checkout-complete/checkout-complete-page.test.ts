import { describe, expect, it } from "vitest";

import { meta } from "./checkout-complete-page";

describe("the checkout confirmation page title", () => {
  it("names the call-first state, not a payment, for a checkout that is not paid", () => {
    // arrange
    const data = { state: "call-first" } as const;

    // act
    const descriptors = meta({ data } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toContainEqual({ title: "A Call Comes First | Evoa" });
  });
});
