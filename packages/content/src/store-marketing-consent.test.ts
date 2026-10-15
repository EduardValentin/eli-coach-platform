import { describe, expect, it } from "vitest";

import {
  STORE_MARKETING_CONSENT,
  STORE_MARKETING_CONSENT_VERSION,
} from "./index";

describe("Store marketing consent", () => {
  it("keeps Store marketing consent independently versioned", () => {
    // arrange
    // act
    const consent = STORE_MARKETING_CONSENT;

    // assert
    expect(STORE_MARKETING_CONSENT_VERSION).toBe("1.1");
    expect(consent).toBe("Keep me posted about new plans, guides, and offers.");
  });
});
