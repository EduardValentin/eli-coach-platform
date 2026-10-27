import type { SalesCall } from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import {
  InMemoryProductEmail,
  type ProductEmail,
} from "~/shared/email/index.server";
import { describe, expect, it, vi } from "vitest";

import { EmailCoachingSalesNotifications } from "./email-coaching-sales-notifications.server";

function createCall(overrides: Partial<SalesCall> = {}): SalesCall {
  return {
    id: "ac-demo",
    firstName: "Ana",
    lastName: "Popescu",
    visitorEmail: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    primaryGoal: "build_strength",
    country: "RO",
    phone: null,
    endsAt: new Date("2026-09-25T15:30:00.000Z"),
    visitorTimeZone: "Europe/Bucharest",
    ...overrides,
  };
}

function clockAt(now: Date) {
  return { now: () => now };
}

function createNotifications(productEmail: ProductEmail) {
  return new EmailCoachingSalesNotifications(productEmail, {
    appBasePath: "/eli-coach-platform",
    clock: clockAt(new Date("2026-09-26T10:00:00.000Z")),
    contactEmail: "contact@evoa.fit",
    publicAppUrl: "https://evoa.fit",
  });
}

describe("EmailCoachingSalesNotifications", () => {
  it("emails the visitor with the coach's contact address as the reply-to", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.sendPaymentLink({
      call: createCall(),
      paymentLinkId: "link-1",
      rawToken: "raw-token-value",
      tier: "regular",
    });

    // assert
    expect(result).toBe("sent");
    expect(productEmail.sent).toHaveLength(1);
    expect(productEmail.sent[0]?.to).toBe("ana@example.com");
    expect(productEmail.sent[0]?.replyTo).toBe("contact@evoa.fit");
  });

  it("keys the send by the payment link id so a retry cannot double-send", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.sendPaymentLink({
      call: createCall(),
      paymentLinkId: "link-42",
      rawToken: "raw-token-value",
      tier: "regular",
    });

    // assert
    expect(productEmail.sent[0]?.idempotencyKey).toBe("payment-link:link-42");
  });

  it("builds an absolute choose-bundle link under the app base path carrying the raw token", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);
    const expectedUrl =
      "https://evoa.fit/eli-coach-platform/select-bundle#raw-token-value";

    // act
    await notifications.sendPaymentLink({
      call: createCall(),
      paymentLinkId: "link-1",
      rawToken: "raw-token-value",
      tier: "regular",
    });

    // assert
    const sent = productEmail.sent[0];

    expect(sent?.html).toContain(`href="${expectedUrl}"`);
    expect(sent?.text).toContain(`Choose your bundle: ${expectedUrl}`);
  });

  it("never exposes the raw token outside the choose-bundle link", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);
    const rawToken = "raw-token-value";

    // act
    await notifications.sendPaymentLink({
      call: createCall(),
      paymentLinkId: "link-1",
      rawToken,
      tier: "regular",
    });

    // assert
    const sent = productEmail.sent[0];
    const htmlOccurrences = (sent?.html.split(rawToken).length ?? 1) - 1;
    const textOccurrences = (sent?.text.split(rawToken).length ?? 1) - 1;

    expect(htmlOccurrences).toBe(1);
    expect(textOccurrences).toBe(1);
  });

  it("reports a rejected send as failed", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi
        .fn()
        .mockResolvedValue({ kind: "rejected", reason: "invalid_to" }),
    } satisfies ProductEmail;
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.sendPaymentLink({
      call: createCall(),
      paymentLinkId: "link-1",
      rawToken: "raw-token-value",
      tier: "regular",
    });

    // assert
    expect(result).toBe("failed");
  });

  it("reports an unconfirmed send as sent", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi.fn().mockResolvedValue({ kind: "unconfirmed" }),
    } satisfies ProductEmail;
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.sendPaymentLink({
      call: createCall(),
      paymentLinkId: "link-1",
      rawToken: "raw-token-value",
      tier: "regular",
    });

    // assert
    expect(result).toBe("sent");
  });
});
