import { describe, expect, it } from "vitest";

import { createRefundDueEmailContent } from "./refund-due-email.server";

describe("createRefundDueEmailContent", () => {
  it("collapses line breaks and runs of whitespace in her name before naming her in the subject", () => {
    // arrange
    const notice = {
      subscriptionId: "subscription-1",
      client: {
        clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
        firstName: "Ana\r\nBcc: someone@example.com",
        lastName: "  Popescu\t",
        email: "ana@example.com",
      },
      paid: {
        amountCents: 44700,
        currency: "eur",
        at: new Date("2026-09-28T09:30:00.000Z"),
      },
      cancelledAt: new Date("2026-10-02T16:10:00.000Z"),
      refund: {
        reason: "full-refund" as const,
        amountCents: 44700,
        dueBy: new Date("2026-10-16T16:10:00.000Z"),
        refundedCents: 0,
        refundedAt: null,
      },
    };

    // act
    const content = createRefundDueEmailContent({
      notice,
      clientPageUrl: "https://evoa.fit/coach/clients/client-1",
      currentYear: 2026,
    });

    // assert
    expect(content.subject).toBe(
      "Ana Bcc: someone@example.com Popescu cancelled — refund due €447 by 16 October",
    );
  });
});
