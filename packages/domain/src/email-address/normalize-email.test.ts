import { describe, expect, it } from "vitest";

import { normalizeEmail } from "./normalize-email";

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    // arrange
    const raw = "  Eli@Example.COM ";

    // act
    const normalized = normalizeEmail(raw);

    // assert
    expect(normalized).toBe("eli@example.com");
  });
});
