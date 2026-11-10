import { describe, expect, it, vi } from "vitest";

import type { OrderEmail } from "~/bounded-contexts/sales/store/domain/order";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { EmailOrderDeliveryAdapter } from "./email-order-delivery-adapter.server";

const terms = {
  version: "1.0",
  document: {
    filename: "terms-and-conditions-1.0.pdf",
    contentType: "application/pdf",
    content: new Uint8Array([37, 80, 68, 70]),
  },
  deliveryConfirmationNotice:
    "You asked us to deliver right away and confirmed that this ends your 14-day right to withdraw.",
};

const orderEmail: OrderEmail = {
  email: "woman@example.com",
  idempotencyKey: "store-order-order-1-ffff",
  rawToken: "opaque-token",
  currency: "EUR",
  lines: [
    { title: "30-Day Fat Loss Plan", amountMinorUnits: 3900 },
    { title: "Nutritional Reset Plan", amountMinorUnits: 2900 },
    { title: "Hormone Harmony E-Book", amountMinorUnits: null },
  ],
  totalMinorUnits: 6800,
  terms,
  sentAt: new Date("2026-11-09T10:05:00.000Z"),
};

function createProductEmail(
  result: Awaited<ReturnType<ProductEmailPort["send"]>> = {
    kind: "sent",
    providerMessageId: "email_123",
  },
) {
  return {
    provider: "resend",
    send: vi.fn().mockResolvedValue(result),
  } satisfies ProductEmailPort;
}

function createAdapter(productEmailPort: ProductEmailPort) {
  return new EmailOrderDeliveryAdapter(productEmailPort, {
    appBasePath: "/eli",
    contactEmail: "contact@evoa.fit",
    publicAppUrl: "https://eli.example",
  });
}

describe("EmailOrderDeliveryAdapter", () => {
  it("sends one download action, the order lines, the consent and the Terms PDF", async () => {
    // arrange
    const productEmailPort = createProductEmail();
    const adapter = createAdapter(productEmailPort);

    // act
    const result = await adapter.deliver(orderEmail);

    // assert
    expect(result).toEqual({
      kind: "delivered",
      provider: "resend",
      providerMessageId: "email_123",
    });
    const sent = productEmailPort.send.mock.calls[0]![0];
    expect(sent).toMatchObject({
      to: "woman@example.com",
      idempotencyKey: "store-order-order-1-ffff",
      subject: "Your order is confirmed",
      attachments: [
        {
          filename: "terms-and-conditions-1.0.pdf",
          contentType: "application/pdf",
          content: terms.document.content,
        },
      ],
    });
    expect(sent.html).toContain(
      'href="https://eli.example/eli/store/download#opaque-token"',
    );
    expect(sent.html).toContain("Download your order");
    expect(sent.html).toContain("30-Day Fat Loss Plan");
    expect(sent.html).toContain("€39.00");
    expect(sent.html).toContain("FREE");
    expect(sent.html).toContain("TOTAL (EUR)");
    expect(sent.html).toContain("€68.00");
    expect(sent.html).toContain(
      "You asked us to deliver right away and confirmed that this ends your 14-day right to withdraw. Your Terms &amp; Conditions (version 1.0) are attached.",
    );
    expect(sent.html).not.toContain('href="https://eli.example/eli/terms"');
    expect(sent.html).toContain(
      "Stripe sends your payment receipt in a separate email.",
    );
    expect(sent.text).toContain(
      "Download your order: https://eli.example/eli/store/download#opaque-token",
    );
    expect(sent.text).toContain("- Hormone Harmony E-Book — FREE");
    expect(sent.text).toContain("TOTAL (EUR): €68.00");
    expect(sent.text).toContain(
      "You asked us to deliver right away and confirmed that this ends your 14-day right to withdraw. Your Terms & Conditions (version 1.0) are attached.",
    );
  });

  it("names the provider's key after the order attempt", () => {
    // arrange
    const adapter = createAdapter(createProductEmail());

    // act
    const key = adapter.createProviderIdempotencyKey("order-1-ffff");

    // assert
    expect(key).toBe("store-order-order-1-ffff");
  });

  it("passes on a provider rejection and an unconfirmed send", async () => {
    // arrange
    const rejecting = createAdapter(
      createProductEmail({ kind: "rejected", reason: "invalid_to" }),
    );
    const unconfirmed = createAdapter(
      createProductEmail({ kind: "unconfirmed" }),
    );

    // act
    const results = await Promise.all([
      rejecting.deliver(orderEmail),
      unconfirmed.deliver(orderEmail),
    ]);

    // assert
    expect(results).toEqual([
      { kind: "rejected", reason: "invalid_to" },
      { kind: "unconfirmed" },
    ]);
  });
});
