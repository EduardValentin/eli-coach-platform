import { describe, expect, it } from "vitest";

import { selectBundlePath } from "./paths";

describe("selectBundlePath", () => {
  it("carries the payment link token in the fragment", () => {
    // arrange
    const token = "abc-DEF_123";

    // act
    const path = selectBundlePath({ token });

    // assert
    expect(path).toBe("/select-bundle#abc-DEF_123");
  });

  it("carries the cancelled payment and the chosen bundle and start back without the token", () => {
    // arrange
    const query = {
      payment: "cancelled",
      bundle: "3-months",
      start: "waiting",
    } as const;

    // act
    const path = selectBundlePath(query);

    // assert
    expect(path).toBe(
      "/select-bundle?payment=cancelled&bundle=3-months&start=waiting",
    );
  });

  it("keeps the token in the fragment after the chosen bundle", () => {
    // arrange
    const link = { token: "abc-DEF_123", bundle: "6-months" };

    // act
    const path = selectBundlePath(link);

    // assert
    expect(path).toBe("/select-bundle?bundle=6-months#abc-DEF_123");
  });
});
