import { describe, expect, it } from "vitest";

import {
  STORE_MARKETING_CONSENT,
  STORE_MARKETING_CONSENT_VERSION,
} from "./index";

describe("Store marketing consent", () => {
  it("keeps optional Store marketing consent independently versioned", () => {
    // arrange
    // act
    const consent = STORE_MARKETING_CONSENT;

    // assert
    expect(STORE_MARKETING_CONSENT_VERSION).toBe("1.0");
    expect(consent).toContain("Optional");
    expect(consent).toContain("plans, guides, and offers");
  });
});
