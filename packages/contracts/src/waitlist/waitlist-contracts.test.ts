import { describe, expect, it } from "vitest";

import {
  waitlistJoinRequestSchema,
  waitlistJoinResponseSchema,
  waitlistSchema,
} from "./waitlist-contracts";

describe("waitlistSchema", () => {
  it("accepts the public waitlist runtime data", () => {
    const result = waitlistSchema.safeParse({
      enabled: true,
      cap: 10,
      spotsRemaining: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("waitlistJoinRequestSchema", () => {
  it("normalizes waitlist emails at the request boundary", () => {
    const result = waitlistJoinRequestSchema.safeParse({
      email: "  ELI@Example.COM  ",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "eli@example.com",
    });
  });

  it("ignores extra request fields because pricing eligibility is decided by the domain", () => {
    const result = waitlistJoinRequestSchema.safeParse({
      email: "regular@example.com",
      source: "hero",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "regular@example.com",
    });
  });

  it("rejects invalid and overly long waitlist emails", () => {
    const invalidResult = waitlistJoinRequestSchema.safeParse({
      email: "not-an-email",
    });
    const longResult = waitlistJoinRequestSchema.safeParse({
      email: `${"a".repeat(310)}@example.com`,
    });

    expect(invalidResult.success).toBe(false);
    expect(longResult.success).toBe(false);
  });
});

describe("waitlistJoinResponseSchema", () => {
  it("accepts reduced and regular pricing signup outcomes", () => {
    expect(
      waitlistJoinResponseSchema.safeParse({
        pricing: "reduced",
        spotsRemaining: 9,
        success: true,
      }).success,
    ).toBe(true);
    expect(
      waitlistJoinResponseSchema.safeParse({
        pricing: "regular",
        spotsRemaining: 0,
        success: true,
      }).success,
    ).toBe(true);
  });

  it("does not expose spots-full as a signup error", () => {
    const result = waitlistJoinResponseSchema.safeParse({
      success: false,
      error: {
        code: "spots_full",
        message: "All spots have been claimed.",
      },
    });

    expect(result.success).toBe(false);
  });

  it("does not expose duplicate signup as a public error outcome", () => {
    const result = waitlistJoinResponseSchema.safeParse({
      success: false,
      error: {
        code: "already_registered",
        message: "Unable to process waitlist signup.",
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts server failure as a signup error outcome", () => {
    const result = waitlistJoinResponseSchema.safeParse({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts bot verification failure as a signup error outcome", () => {
    const result = waitlistJoinResponseSchema.safeParse({
      success: false,
      error: {
        code: "bot_verification_failed",
        message: "Unable to process waitlist signup.",
      },
    });

    expect(result.success).toBe(true);
  });
});
