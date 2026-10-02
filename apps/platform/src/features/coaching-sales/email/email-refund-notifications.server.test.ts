import type { RefundDueNotice } from "@eli-coach-platform/domain/coaching-subscription";
import {
  InMemoryProductEmail,
  type ProductEmail,
} from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it, vi } from "vitest";

import { EmailRefundNotifications } from "./email-refund-notifications.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

function refundNotice(
  overrides: Partial<RefundDueNotice["refund"]> = {},
): RefundDueNotice {
  return {
    subscriptionId: "subscription-1",
    client: {
      clientId: CLIENT_ID,
      firstName: "Ana",
      lastName: "Popescu",
      email: "ana@example.com",
    },
    paid: {
      amountCents: 44700,
      currency: "eur",
      at: new Date("2026-09-28T09:30:00.000Z"),
    },
    cancelledAt: new Date("2026-10-02T16:10:00.000Z"),
    refund: {
      reason: "full-refund",
      amountCents: 44700,
      dueBy: new Date("2026-10-16T16:10:00.000Z"),
      refundedCents: 0,
      refundedAt: null,
      ...overrides,
    },
  };
}

function createNotifications(productEmail: ProductEmail) {
  return new EmailRefundNotifications(productEmail, {
    appBasePath: "/eli-coach-platform",
    clock: { now: () => new Date("2026-10-02T16:10:00.000Z") },
    coachEmail: "eli@evoa.fit",
    publicAppUrl: "https://evoa.fit",
  });
}

describe("EmailRefundNotifications", () => {
  it("tells the coach who cancelled, what to refund and by when, with replies going to the client", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.notifyRefundDue(refundNotice());

    // assert
    expect(result).toBe("sent");
    expect(productEmail.sent).toHaveLength(1);
    expect(productEmail.sent[0]).toMatchObject({
      to: "eli@evoa.fit",
      replyTo: "ana@example.com",
      subject: "Ana Popescu cancelled — refund due €447.00 by 16 October",
      idempotencyKey: "refund-due:subscription-1",
    });
  });

  it("words the reason, the payment and the cancellation, and links to her client page", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.notifyRefundDue(
      refundNotice({ reason: "proportional-refund", amountCents: 42271 }),
    );

    // assert
    const text = productEmail.sent[0]?.text ?? "";
    expect(text).toContain("Refund due: €422.71");
    expect(text).toContain("Refund by: 16 October");
    expect(text).toContain(
      "Why: Proportional refund: cancelled within 14 days of paying, for the unused part of the first term.",
    );
    expect(text).toContain("Paid: €447.00 on 28 September");
    expect(text).toContain("Cancelled: 2 October");
    expect(text).toContain(
      `Open her client page: https://evoa.fit/eli-coach-platform/coach/clients/${CLIENT_ID}`,
    );
    expect(productEmail.sent[0]?.html).toContain(
      `href="https://evoa.fit/eli-coach-platform/coach/clients/${CLIENT_ID}"`,
    );
  });

  it("answers failed when the email provider refuses the message", async () => {
    // arrange
    const productEmail: ProductEmail = {
      provider: "memory",
      send: vi.fn().mockResolvedValue({ kind: "rejected", reason: "refused" }),
    };
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.notifyRefundDue(refundNotice());

    // assert
    expect(result).toBe("failed");
  });
});
