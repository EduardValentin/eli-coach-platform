import { describe, expect, it } from "vitest";

import { waitlistJoinRequestSchema } from "./waitlist-contracts";

describe("waitlistJoinRequestSchema", () => {
  it("normalizes waitlist emails at the request boundary", () => {
    const result = waitlistJoinRequestSchema.safeParse({
      email: "  ELI@Example.COM  ",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "eli@example.com",
      intent: "join",
    });
  });

  it("accepts notify intent for full waitlist follow-up emails", () => {
    const result = waitlistJoinRequestSchema.safeParse({
      email: "notify@example.com",
      intent: "notify",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "notify@example.com",
      intent: "notify",
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
