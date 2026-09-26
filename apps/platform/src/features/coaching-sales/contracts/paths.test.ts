import { describe, expect, it } from "vitest";

import { selectBundlePath } from "./paths";

describe("selectBundlePath", () => {
  it("carries the payment link token", () => {
    // arrange
    const token = "abc-DEF_123";

    // act
    const path = selectBundlePath({ token });

    // assert
    expect(path).toBe("/select-bundle?token=abc-DEF_123");
  });

  it("carries the cancelled payment and the chosen bundle and start back to the page", () => {
    // arrange
    const query = {
      token: "abc-DEF_123",
      payment: "cancelled",
      bundle: "3-months",
      start: "waiting",
    } as const;

    // act
    const path = selectBundlePath(query);

    // assert
    expect(path).toBe(
      "/select-bundle?token=abc-DEF_123&payment=cancelled&bundle=3-months&start=waiting",
    );
  });

  it("encodes a token that would otherwise break the query", () => {
    // arrange
    const token = "a&b=c d";

    // act
    const path = selectBundlePath({ token });

    // assert
    expect(new URLSearchParams(path.split("?")[1]).get("token")).toBe(token);
  });
});
