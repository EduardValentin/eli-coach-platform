import { describe, expect, it } from "vitest";

import {
  waitlistJoinRequestSchema,
  waitlistJoinResponseSchema,
  waitlistSchema,
} from "./waitlist";

const ERROR_MESSAGE_SENTINEL = "opaque-error";

describe("waitlistSchema", () => {
  it.each(["available", "limited", "closed", null] as const)(
    "accepts %s availability and exposes only qualitative public data",
    (availability) => {
      // arrange
      const publicWaitlistResponse = {
        enabled: true,
        cap: 10,
        offer: {
          plan: "all-bundles",
          campaignSlug: "all-bundles-launch-1",
        },
        availability,
        spotsRemaining: 2,
      };

      // act
      const result = waitlistSchema.safeParse(publicWaitlistResponse);

      // assert
      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error("Expected public waitlist runtime data to be valid.");
      }
      expect(result.data).toEqual({
        enabled: true,
        offer: {
          plan: "all-bundles",
          campaignSlug: "all-bundles-launch-1",
        },
        availability,
      });
    },
  );

  it("rejects unknown qualitative availability", () => {
    // arrange
    const publicWaitlistResponse = {
      enabled: true,
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
      availability: "nearly-full",
    };

    // act
    const result = waitlistSchema.safeParse(publicWaitlistResponse);

    // assert
    expect(result.success).toBe(false);
  });

  it("rejects retired annual waitlist offers", () => {
    // arrange
    const annualOffer = {
      enabled: true,
      offer: {
        plan: "12-months",
        campaignSlug: "12-months-launch-1",
      },
      availability: "available",
    };

    // act
    const result = waitlistSchema.safeParse(annualOffer);

    // assert
    expect(result.success).toBe(false);
  });

  it("requires an availability observation", () => {
    // arrange
    const waitlistWithoutAvailability = {
      enabled: true,
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
    };

    // act
    const result = waitlistSchema.safeParse(waitlistWithoutAvailability);

    // assert
    expect(result.success).toBe(false);
  });
});

describe("waitlistJoinRequestSchema", () => {
  it("normalizes waitlist emails at the request boundary", () => {
    // arrange
    const request = {
      email: "  ELI@Example.COM  ",
    };

    // act
    const result = waitlistJoinRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "eli@example.com",
    });
  });

  it("ignores extra request fields because pricing eligibility is decided by the domain", () => {
    // arrange
    const request = {
      email: "regular@example.com",
      source: "hero",
    };

    // act
    const result = waitlistJoinRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "regular@example.com",
    });
  });

  it("rejects invalid and overly long waitlist emails", () => {
    // arrange
    const invalidRequest = {
      email: "not-an-email",
    };
    const overlyLongRequest = {
      email: `${"a".repeat(310)}@example.com`,
    };

    // act
    const invalidResult = waitlistJoinRequestSchema.safeParse(invalidRequest);
    const longResult = waitlistJoinRequestSchema.safeParse(overlyLongRequest);

    // assert
    expect(invalidResult.success).toBe(false);
    expect(longResult.success).toBe(false);
  });
});

describe("waitlistJoinResponseSchema", () => {
  it("parses a generic successful signup response without allocation metadata", () => {
    // arrange
    const response = { success: true };

    // act
    const result = waitlistJoinResponseSchema.parse(response);

    // assert
    expect(result).toEqual({ success: true });
  });

  it("does not expose spots-full as a signup error", () => {
    // arrange
    const response = {
      success: false,
      error: {
        code: "spots_full",
        message: ERROR_MESSAGE_SENTINEL,
      },
    };

    // act
    const result = waitlistJoinResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(false);
  });

  it("does not expose duplicate signup as a public error outcome", () => {
    // arrange
    const response = {
      success: false,
      error: {
        code: "already_registered",
        message: ERROR_MESSAGE_SENTINEL,
      },
    };

    // act
    const result = waitlistJoinResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(false);
  });

  it("accepts server failure as a signup error outcome", () => {
    // arrange
    const response = {
      success: false,
      error: {
        code: "server_error",
        message: ERROR_MESSAGE_SENTINEL,
      },
    };

    // act
    const result = waitlistJoinResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
  });

  it("accepts bot verification failure as a signup error outcome", () => {
    // arrange
    const response = {
      success: false,
      error: {
        code: "bot_verification_failed",
        message: ERROR_MESSAGE_SENTINEL,
      },
    };

    // act
    const result = waitlistJoinResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
  });

  it("rejects empty public error messages", () => {
    // arrange
    const response = {
      success: false,
      error: {
        code: "server_error",
        message: "",
      },
    };

    // act
    const result = waitlistJoinResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(false);
  });
});
