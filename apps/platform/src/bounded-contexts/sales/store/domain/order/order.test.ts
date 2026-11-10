import { describe, expect, it } from "vitest";

import { ProductPricing, PublishedProduct } from "../product";

import { DeliveryConsent } from "./delivery-consent";
import { Order } from "./order";
import { OrderCheckout } from "./order-checkout";
import { OrderConsents } from "./order-consents";
import { OrderEmailAttempt } from "./order-email-attempt";
import { OrderPayment } from "./order-payment";
import { OrderRefund } from "./order-refund";
import { OrderRequest } from "./order-request";

const placedAt = new Date("2026-11-09T10:00:00.000Z");
const paidAt = new Date("2026-11-09T10:05:00.000Z");
const refundedAt = new Date("2026-11-10T09:00:00.000Z");

function publishedProduct(options: {
  id: number;
  slug: string;
  title: string;
  pricing: ProductPricing;
}): PublishedProduct {
  return PublishedProduct.reconstitute({
    id: options.id,
    slug: options.slug,
    displayOrder: options.id,
    pricing: options.pricing,
    version: {
      id: options.id * 10,
      sequence: 1,
      title: options.title,
      creatorName: "Eli",
      cardSummary: "Summary.",
      detailDescription: "Description.",
      includedItems: [],
      cover: {
        assetKey: `covers/${options.slug}.webp`,
        alt: "Cover",
        mimeType: "image/webp",
        sizeBytes: 1,
        sha256: "c".repeat(64),
      },
      assets: [],
      types: [],
      goals: [],
      publishedAt: placedAt,
    },
  });
}

const fatLoss = publishedProduct({
  id: 1,
  slug: "fat-loss-30",
  title: "30-Day Fat Loss Plan",
  pricing: ProductPricing.reconstitute({
    kind: "paid",
    eurCents: 3900,
    usdCents: 4500,
  }),
});
const reset = publishedProduct({
  id: 2,
  slug: "nutritional-reset",
  title: "Nutritional Reset Plan",
  pricing: ProductPricing.reconstitute({
    kind: "paid",
    eurCents: 2900,
    usdCents: 3300,
  }),
});
const ebook = publishedProduct({
  id: 3,
  slug: "hormone-harmony",
  title: "Hormone Harmony E-Book",
  pricing: ProductPricing.free(),
});
const catalog = [fatLoss, reset, ebook];

const emailAcceptancePort = {
  normalize: (raw: string) => raw.trim().toLowerCase(),
  accepts: () => true,
};

const consentVersions = {
  termsVersion: "1.0",
  privacyPolicyVersion: "2.3",
  marketingConsentVersion: "store-1",
  paidDeliveryConsentTermsVersion: "1.0",
};

function request(
  overrides: Partial<{
    productSlugs: readonly string[];
    currency: "EUR" | "USD";
    marketingConsent: boolean;
  }> = {},
): OrderRequest {
  return OrderRequest.from(
    {
      email: "woman@example.com",
      idempotencyKey: "5e0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a",
      productSlugs: ["nutritional-reset", "fat-loss-30", "hormone-harmony"],
      currency: "EUR",
      marketingConsent: true,
      ...overrides,
    },
    emailAcceptancePort,
  );
}

function place(orderRequest: OrderRequest = request()) {
  return Order.place({
    id: "order-1",
    request: orderRequest,
    catalog,
    consentVersions,
    payloadDigest: "d".repeat(64),
    placedAt,
  });
}

function placedOrder(orderRequest?: OrderRequest): Order {
  const placement = place(orderRequest);

  if (placement.status !== "placed") {
    throw new Error("Expected the order to be placed.");
  }

  return placement.order;
}

function opened(order: Order): Order {
  return Order.reconstitute({
    id: order.id,
    recipientEmail: order.recipientEmail,
    currency: order.currency,
    items: order.items,
    status: order.status,
    checkout: OrderCheckout.opened({
      sessionId: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    }),
    payment: order.payment,
    refund: order.refund,
    consents: order.consents,
    deliveryConsent: order.deliveryConsent,
    idempotencyKey: order.idempotencyKey,
    payloadDigest: order.payloadDigest,
    placedAt: order.placedAt,
  });
}

describe("Order.place", () => {
  it("prices every item from the catalog in the chosen currency and records free items at zero", () => {
    // arrange
    const usdRequest = request({ currency: "USD" });

    // act
    const order = placedOrder(usdRequest);

    // assert
    expect(order.status).toBe("pending");
    expect(order.currency).toBe("USD");
    expect(order.items.map((item) => item.toSnapshot())).toEqual([
      {
        productId: 1,
        productSlug: "fat-loss-30",
        productVersionId: 10,
        title: "30-Day Fat Loss Plan",
        amountMinorUnits: 4500,
      },
      {
        productId: 3,
        productSlug: "hormone-harmony",
        productVersionId: 30,
        title: "Hormone Harmony E-Book",
        amountMinorUnits: 0,
      },
      {
        productId: 2,
        productSlug: "nutritional-reset",
        productVersionId: 20,
        title: "Nutritional Reset Plan",
        amountMinorUnits: 3300,
      },
    ]);
    expect(order.total()).toBe(7800);
  });

  it("records the consents, the delivery consent and the marketing choice at the moment she placed it", () => {
    // arrange
    const marketingRequest = request({ marketingConsent: true });

    // act
    const order = placedOrder(marketingRequest);

    // assert
    expect(order.consents.toSnapshot()).toEqual({
      termsVersion: "1.0",
      privacyPolicyVersion: "2.3",
      marketingConsentVersion: "store-1",
      marketingConsent: true,
      marketingConsentedAt: placedAt,
    });
    expect(order.deliveryConsent.toSnapshot()).toEqual({
      termsVersion: "1.0",
      consentedAt: placedAt,
    });
  });

  it("records no marketing moment when she declines marketing", () => {
    // arrange
    const declined = request({ marketingConsent: false });

    // act
    const order = placedOrder(declined);

    // assert
    expect(order.consents.marketingConsentedAt).toBeNull();
  });

  it("refuses unavailable products and names the ones still available", () => {
    // arrange
    const withRetired = request({
      productSlugs: ["fat-loss-30", "retired-plan"],
    });

    // act
    const placement = place(withRetired);

    // assert
    expect(placement).toEqual({
      status: "unavailable_products",
      availableProductSlugs: ["fat-loss-30"],
    });
  });

  it("refuses a cart without a paid item", () => {
    // arrange
    const freeOnly = request({ productSlugs: ["hormone-harmony"] });

    // act
    const placement = place(freeOnly);

    // assert
    expect(placement).toEqual({ status: "no_paid_items" });
  });
});

describe("Order", () => {
  it("offers only paid items to the payment page", () => {
    // arrange
    const order = placedOrder();

    // act
    const paidItems = order.paidItems();

    // assert
    expect(paidItems.map((item) => item.productSlug)).toEqual([
      "fat-loss-30",
      "nutritional-reset",
    ]);
  });

  it("shares the delivery limit key of the inbox her address folds onto", () => {
    // arrange
    const order = placedOrder(
      OrderRequest.from(
        {
          email: "woman+shop@example.com",
          idempotencyKey: "5e0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a",
          productSlugs: ["fat-loss-30"],
          currency: "EUR",
          marketingConsent: false,
        },
        emailAcceptancePort,
      ),
    );

    // act
    const deliveryLimitKey = order.deliveryLimitKey;

    // assert
    expect(deliveryLimitKey).toBe("woman@example.com");
  });

  it("replays only the submission it was placed from", () => {
    // arrange
    const order = placedOrder();

    // act
    const sameSubmission = order.replays("d".repeat(64));
    const changedSubmission = order.replays("e".repeat(64));

    // assert
    expect(sameSubmission).toBe(true);
    expect(changedSubmission).toBe(false);
  });

  it("is paid once with the charged amount and stays unchanged when paid again", () => {
    // arrange
    const order = opened(placedOrder());
    const payment = OrderPayment.received({
      checkoutSessionId: "cs_test_1",
      paymentIntentId: "pi_1",
      amountMinorUnits: 6800,
      currency: "eur",
      paidAt,
    });

    // act
    const first = order.markPaid(payment);
    const paidOrder = first.status === "paid" ? first.order : order;
    const second = paidOrder.markPaid(payment);

    // assert
    expect(first.status).toBe("paid");
    expect(paidOrder.status).toBe("paid");
    expect(paidOrder.payment?.toSnapshot()).toEqual({
      checkoutSessionId: "cs_test_1",
      paymentIntentId: "pi_1",
      amountMinorUnits: 6800,
      currency: "EUR",
      paidAt,
    });
    expect(second).toEqual({ status: "already_paid" });
  });

  it("refuses a payment made through a session other than the one opened for it", () => {
    // arrange
    const order = opened(placedOrder());
    const payment = OrderPayment.received({
      checkoutSessionId: "cs_test_another",
      paymentIntentId: "pi_1",
      amountMinorUnits: 6800,
      currency: "eur",
      paidAt,
    });

    // act
    const outcome = order.markPaid(payment);

    // assert
    expect(outcome).toEqual({ status: "session_mismatch" });
  });

  it("refuses a payment before any session was opened for it", () => {
    // arrange
    const order = placedOrder();
    const payment = OrderPayment.received({
      checkoutSessionId: "cs_test_1",
      paymentIntentId: "pi_1",
      amountMinorUnits: 6800,
      currency: "eur",
      paidAt,
    });

    // act
    const outcome = order.markPaid(payment);

    // assert
    expect(outcome).toEqual({ status: "session_mismatch" });
  });

  it("tells when the charged amount or currency differs from the order total", () => {
    // arrange
    const order = placedOrder();
    const exact = OrderPayment.received({
      checkoutSessionId: "cs_test_1",
      paymentIntentId: "pi_1",
      amountMinorUnits: 6800,
      currency: "eur",
      paidAt,
    });
    const short = OrderPayment.received({
      ...exact.toSnapshot(),
      amountMinorUnits: 6700,
    });
    const otherCurrency = OrderPayment.received({
      ...exact.toSnapshot(),
      currency: "usd",
    });

    // act
    const differences = [exact, short, otherCurrency].map((payment) =>
      order.chargeDiffers(payment),
    );

    // assert
    expect(differences).toEqual([false, true, true]);
  });

  it("confirms the order as she bought it, free items without an amount", () => {
    // arrange
    const order = placedOrder();

    // act
    const confirmation = order.confirmation();

    // assert
    expect(confirmation).toEqual({
      email: "woman@example.com",
      currency: "EUR",
      lines: [
        { title: "30-Day Fat Loss Plan", amountMinorUnits: 3900 },
        { title: "Hormone Harmony E-Book", amountMinorUnits: null },
        { title: "Nutritional Reset Plan", amountMinorUnits: 2900 },
      ],
      totalMinorUnits: 6800,
      termsVersion: "1.0",
    });
  });
});

function paidOrder(): Order {
  const outcome = opened(placedOrder()).markPaid(
    OrderPayment.received({
      checkoutSessionId: "cs_test_1",
      paymentIntentId: "pi_1",
      amountMinorUnits: 6800,
      currency: "eur",
      paidAt,
    }),
  );

  if (outcome.status !== "paid") {
    throw new Error("Expected the order to be paid.");
  }

  return outcome.order;
}

function refundedOrder(refundedMinorUnits: number): Order {
  const outcome = paidOrder().refundWith(
    OrderRefund.received({ refundedMinorUnits, refundedAt }),
  );

  if (outcome.status !== "refunded") {
    throw new Error("Expected the order to be refunded.");
  }

  return outcome.order;
}

describe("Order refund", () => {
  it("is refunded with the first refund, keeping its items, amounts, payment and consents", () => {
    // arrange
    const order = paidOrder();
    const refund = OrderRefund.received({
      refundedMinorUnits: 1500,
      refundedAt,
    });

    // act
    const outcome = order.refundWith(refund);

    // assert
    expect(outcome.status).toBe("refunded");
    const refunded = outcome.status === "refunded" ? outcome.order : order;
    expect(outcome).toMatchObject({ firstRefund: true });
    expect(refunded.status).toBe("refunded");
    expect(refunded.refund?.toSnapshot()).toEqual({
      refundedMinorUnits: 1500,
      refundedAt,
    });
    expect(refunded.items).toBe(order.items);
    expect(refunded.payment).toBe(order.payment);
    expect(refunded.consents).toBe(order.consents);
    expect(refunded.deliveryConsent).toBe(order.deliveryConsent);
    expect(refunded.confirmation()).toEqual(order.confirmation());
  });

  it("takes a later refund's cumulative amount and keeps the first refund's moment", () => {
    // arrange
    const order = refundedOrder(1500);
    const later = OrderRefund.received({
      refundedMinorUnits: 6800,
      refundedAt: new Date("2026-11-11T09:00:00.000Z"),
    });

    // act
    const outcome = order.refundWith(later);

    // assert
    expect(outcome).toMatchObject({ status: "refunded", firstRefund: false });
    const refunded = outcome.status === "refunded" ? outcome.order : order;
    expect(refunded.refund?.toSnapshot()).toEqual({
      refundedMinorUnits: 6800,
      refundedAt,
    });
  });

  it("refuses a refund for an order still waiting for its payment", () => {
    // arrange
    const order = opened(placedOrder());

    // act
    const outcome = order.refundWith(
      OrderRefund.received({ refundedMinorUnits: 1500, refundedAt }),
    );

    // assert
    expect(outcome).toEqual({ status: "not_paid" });
  });

  it("ignores a late completion for a refunded order like one for a paid order", () => {
    // arrange
    const order = refundedOrder(6800);

    // act
    const outcome = order.markPaid(order.payment!);

    // assert
    expect(outcome).toEqual({ status: "already_paid" });
  });

  it("is confirmable only while paid", () => {
    // arrange
    const orders = [opened(placedOrder()), paidOrder(), refundedOrder(6800)];

    // act
    const confirmable = orders.map((order) => order.isConfirmable());

    // assert
    expect(confirmable).toEqual([false, true, false]);
  });
});

describe("DeliveryConsent", () => {
  it("keeps the Terms version and the moment she gave it", () => {
    // arrange
    const consentedAt = new Date("2026-11-09T10:00:00.000Z");

    // act
    const consent = DeliveryConsent.given({ termsVersion: "1.0", consentedAt });

    // assert
    expect(consent.toSnapshot()).toEqual({ termsVersion: "1.0", consentedAt });
  });
});

describe("OrderConsents", () => {
  it("records the marketing moment only when she consented to marketing", () => {
    // arrange
    const at = new Date("2026-11-09T10:00:00.000Z");

    // act
    const consented = OrderConsents.given({
      versions: consentVersions,
      marketingConsent: true,
      at,
    });
    const declined = OrderConsents.given({
      versions: consentVersions,
      marketingConsent: false,
      at,
    });

    // assert
    expect(consented.toSnapshot()).toEqual({
      termsVersion: "1.0",
      privacyPolicyVersion: "2.3",
      marketingConsentVersion: "store-1",
      marketingConsent: true,
      marketingConsentedAt: at,
    });
    expect(declined.marketingConsentedAt).toBeNull();
  });
});

describe("OrderCheckout", () => {
  it("holds only the session it was opened with", () => {
    // arrange
    const checkout = OrderCheckout.opened({
      sessionId: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });

    // act
    const holdsOwn = checkout.holdsSession("cs_test_1");
    const holdsOther = checkout.holdsSession("cs_test_2");

    // assert
    expect(holdsOwn).toBe(true);
    expect(holdsOther).toBe(false);
  });
});

describe("OrderEmailAttempt", () => {
  const token = { rawToken: "raw-token", sha256: "f".repeat(64) };
  const orderDeliveryPort = {
    provider: "resend",
    createProviderIdempotencyKey: (key: string) => `store-order-${key}`,
  };

  it("keys the attempt by the order and the token it sends", () => {
    // arrange
    const order = placedOrder();

    // act
    const attempt = OrderEmailAttempt.issue({
      order,
      token,
      orderDeliveryPort,
    });

    // assert
    expect(attempt.toSnapshot()).toEqual({
      orderId: "order-1",
      provider: "resend",
      providerIdempotencyKey: `store-order-order-1-${"f".repeat(24)}`,
      tokenSha256: token.sha256,
    });
  });

  it("sends the stored token for a new grant and a replacement token on a resend", () => {
    // arrange
    const order = placedOrder();
    const recorded = { deliveryAttemptId: 7, at: paidAt };

    // act
    const issued = OrderEmailAttempt.issue({
      order,
      token,
      orderDeliveryPort,
    }).toDelivery(recorded);
    const reissued = OrderEmailAttempt.reissue({
      order,
      token,
      orderDeliveryPort,
    }).toDelivery(recorded);

    // assert
    expect(issued).toEqual({
      order,
      deliveryAttemptId: 7,
      provider: "resend",
      providerIdempotencyKey: `store-order-order-1-${"f".repeat(24)}`,
      rawToken: "raw-token",
      tokenSha256: token.sha256,
      linkIssue: "original",
      at: paidAt,
    });
    expect(reissued.linkIssue).toBe("replacement");
  });
});

describe("OrderRequest", () => {
  it("normalizes the email, sorts and deduplicates the slugs into one canonical payload", () => {
    // arrange
    const command = {
      email: "  Woman@Example.com ",
      idempotencyKey: "5e0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a",
      productSlugs: ["b", "a", "b"],
      currency: "USD" as const,
      marketingConsent: false,
    };

    // act
    const orderRequest = OrderRequest.from(command, emailAcceptancePort);

    // assert
    expect(orderRequest.productSlugs).toEqual(["a", "b"]);
    expect(orderRequest.canonicalPayload()).toBe(
      JSON.stringify({
        currency: "USD",
        email: "woman@example.com",
        marketingConsent: false,
        productSlugs: ["a", "b"],
      }),
    );
  });
});
