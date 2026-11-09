import { describe, expect, it, vi } from "vitest";

import {
  ProductPrice,
  PublishedProduct,
  type StoreCatalogPort,
} from "../product";

import { CompleteOrderUseCase } from "./complete-order-use-case";
import { DeliverOrderEmailUseCase } from "./deliver-order-email-use-case";
import { Order } from "./order";
import { OrderCheckout } from "./order-checkout";
import type { OrderDeliveryPort } from "./order-delivery-port";
import type { OrderEmailDelivery } from "./order-email-delivery";
import { OrderPayment } from "./order-payment";
import { OrderRequest } from "./order-request";
import { PlaceOrderUseCase } from "./place-order-use-case";
import { PrepareOrderEmailResendUseCase } from "./prepare-order-email-resend-use-case";
import { ReadOrderConfirmationUseCase } from "./read-order-confirmation-use-case";
import type { StoreCheckoutPort } from "./store-checkout-port";
import type { StoreOrdersPort } from "./store-orders-port";
import type { OrderTermsPort } from "./order-terms-port";

const now = new Date("2026-11-09T10:00:00.000Z");
const paidAt = new Date("2026-11-09T10:05:00.000Z");
const IDEMPOTENCY_KEY = "5e0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a";
const SUCCESS_URL =
  "https://evoa.fit/store/checkout/complete?session_id={CHECKOUT_SESSION_ID}";
const CANCEL_URL = "https://evoa.fit/store?payment=cancelled";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function publishedProduct(options: {
  id: number;
  slug: string;
  title: string;
  price: ProductPrice | null;
}): PublishedProduct {
  return PublishedProduct.reconstitute({
    id: options.id,
    slug: options.slug,
    displayOrder: options.id,
    price: options.price,
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
      publishedAt: now,
    },
  });
}

const fatLoss = publishedProduct({
  id: 1,
  slug: "fat-loss-30",
  title: "30-Day Fat Loss Plan",
  price: ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 }),
});
const ebook = publishedProduct({
  id: 3,
  slug: "hormone-harmony",
  title: "Hormone Harmony E-Book",
  price: null,
});

const emailAcceptancePort = {
  normalize: (raw: string) => raw.trim().toLowerCase(),
  accepts: (email: string) => !email.includes("+"),
};

const consentVersions = {
  termsVersion: "1.0",
  privacyPolicyVersion: "2.3",
  marketingConsentVersion: "store-1",
  paidDeliveryConsentTermsVersion: "1.0",
};

const command = {
  email: " Woman@Example.com",
  idempotencyKey: IDEMPOTENCY_KEY,
  productSlugs: ["fat-loss-30", "hormone-harmony"],
  currency: "EUR" as const,
  marketingConsent: false,
  successUrl: SUCCESS_URL,
  cancelUrl: CANCEL_URL,
};

function pendingOrder(payloadDigest = "digest-of-submission"): Order {
  const placement = Order.place({
    id: "order-1",
    request: OrderRequest.from(command, emailAcceptancePort),
    catalog: [fatLoss, ebook],
    consentVersions,
    payloadDigest,
    placedAt: now,
  });

  if (placement.status !== "placed") {
    throw new Error("Expected the order to be placed.");
  }

  return placement.order;
}

function withCheckout(order: Order): Order {
  return Order.reconstitute({
    ...propsOf(order),
    checkout: OrderCheckout.opened({
      sessionId: "cs_test_order",
      url: "https://checkout.stripe.com/c/pay/cs_test_order",
    }),
  });
}

function paidOrder(): Order {
  const outcome = withCheckout(pendingOrder()).markPaid(
    OrderPayment.received({
      checkoutSessionId: "cs_test_order",
      paymentIntentId: "pi_order",
      amountMinorUnits: 3900,
      currency: "eur",
      paidAt,
    }),
  );

  if (outcome.status !== "paid") {
    throw new Error("Expected the order to be paid.");
  }

  return outcome.order;
}

function propsOf(order: Order): Parameters<typeof Order.reconstitute>[0] {
  return {
    id: order.id,
    recipientEmail: order.recipientEmail,
    currency: order.currency,
    items: order.items,
    status: order.status,
    checkout: order.checkout,
    payment: order.payment,
    consents: order.consents,
    deliveryConsent: order.deliveryConsent,
    idempotencyKey: order.idempotencyKey,
    payloadDigest: order.payloadDigest,
    placedAt: order.placedAt,
  };
}

function createStoreOrders(
  overrides: Partial<StoreOrdersPort> = {},
): StoreOrdersPort {
  return {
    findByIdempotencyKey: vi.fn().mockResolvedValue(null),
    findByCheckoutSession: vi.fn().mockResolvedValue(null),
    lockForPayment: vi.fn().mockResolvedValue(null),
    place: vi.fn().mockResolvedValue({ status: "placed" }),
    attachCheckout: vi.fn().mockResolvedValue(undefined),
    recordPaymentWithGrant: vi
      .fn()
      .mockResolvedValue({ deliveryAttemptId: 51 }),
    prepareResend: vi
      .fn()
      .mockResolvedValue({ status: "prepared", deliveryAttemptId: 52 }),
    rotateGrantToken: vi.fn().mockResolvedValue(undefined),
    recordEmailAccepted: vi.fn().mockResolvedValue(undefined),
    recordEmailRejected: vi.fn().mockResolvedValue(undefined),
    recordEmailRetryable: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createCheckout(
  overrides: Partial<StoreCheckoutPort> = {},
): StoreCheckoutPort {
  return {
    open: vi.fn().mockResolvedValue({
      sessionId: "cs_test_order",
      url: "https://checkout.stripe.com/c/pay/cs_test_order",
    }),
    isPaid: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function createCatalog(
  products: readonly PublishedProduct[] = [fatLoss, ebook],
): StoreCatalogPort {
  return {
    getPublishedCatalog: vi.fn().mockResolvedValue(products),
    getPublishedProductBySlug: vi.fn(),
    getPublishedCoverByAssetKey: vi.fn(),
  };
}

function createOrderDelivery(
  overrides: Partial<OrderDeliveryPort> = {},
): OrderDeliveryPort {
  return {
    provider: "resend",
    createProviderIdempotencyKey: (key: string) => `store-order-${key}`,
    deliver: vi.fn().mockResolvedValue({
      kind: "delivered",
      provider: "resend",
      providerMessageId: "email-1",
    }),
    ...overrides,
  };
}

function createIncidents() {
  return {
    paymentAmountMismatch: vi.fn(),
    paidOrderUnknown: vi.fn(),
    paidSessionMismatch: vi.fn(),
    orderEmailRejected: vi.fn(),
    orderEmailAuditPending: vi.fn(),
    orderLinkRotationPending: vi.fn(),
    termsDocumentMissing: vi.fn(),
  };
}

const token = { rawToken: "raw-token", sha256: "f".repeat(64) };
const orderTerms = {
  version: "1.0",
  document: {
    filename: "terms-and-conditions-1.0.pdf",
    contentType: "application/pdf",
    content: new Uint8Array([37, 80, 68, 70]),
  },
  linkLabel: "Terms & Conditions version 1.0",
  path: "/terms",
  deliveryConsentStatement: "I expressly request immediate supply.",
  deliveryConfirmationNotice: "Evoa Fitness confirms this request.",
};

function createPlaceOrderUseCase(options: {
  storeOrdersPort?: StoreOrdersPort;
  storeCheckoutPort?: StoreCheckoutPort;
  storeCatalogPort?: StoreCatalogPort;
}) {
  return new PlaceOrderUseCase({
    storeOrdersPort: options.storeOrdersPort ?? createStoreOrders(),
    storeCatalogPort: options.storeCatalogPort ?? createCatalog(),
    storeCheckoutPort: options.storeCheckoutPort ?? createCheckout(),
    clockPort: { now: () => now },
    consentVersionsPort: { current: () => consentVersions },
    emailAcceptancePort,
    payloadDigestGeneratorPort: { digest: () => "digest-of-submission" },
    orderIdsPort: { generate: () => "order-1" },
  });
}

describe("PlaceOrderUseCase", () => {
  it("places a pending order and opens a payment page for its paid items only", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const storeCheckoutPort = createCheckout();
    const useCase = createPlaceOrderUseCase({
      storeOrdersPort,
      storeCheckoutPort,
    });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result).toEqual({
      status: "opened",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_order",
    });
    const placed = vi.mocked(storeOrdersPort.place).mock.calls[0]![0];
    expect(placed.email).toBe("woman@example.com");
    expect(placed.items.map((item) => item.productSlug)).toEqual([
      "fat-loss-30",
      "hormone-harmony",
    ]);
    expect(storeCheckoutPort.open).toHaveBeenCalledWith({
      orderId: "order-1",
      email: "woman@example.com",
      currency: "EUR",
      lines: [{ title: "30-Day Fat Loss Plan", amountMinorUnits: 3900 }],
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
    });
    expect(storeOrdersPort.attachCheckout).toHaveBeenCalledWith({
      orderId: "order-1",
      checkout: OrderCheckout.opened({
        sessionId: "cs_test_order",
        url: "https://checkout.stripe.com/c/pay/cs_test_order",
      }),
    });
  });

  it("refuses a sub-addressed email before anything is recorded", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const useCase = createPlaceOrderUseCase({ storeOrdersPort });

    // act
    const result = await useCase.execute({
      ...command,
      email: "woman+shop@example.com",
    });

    // assert
    expect(result).toEqual({ status: "subaddress_refused" });
    expect(storeOrdersPort.findByIdempotencyKey).not.toHaveBeenCalled();
    expect(storeOrdersPort.place).not.toHaveBeenCalled();
  });

  it("names the available products when one is no longer sold", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const useCase = createPlaceOrderUseCase({
      storeOrdersPort,
      storeCatalogPort: createCatalog([fatLoss]),
    });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result).toEqual({
      status: "unavailable_products",
      availableProductSlugs: ["fat-loss-30"],
    });
    expect(storeOrdersPort.place).not.toHaveBeenCalled();
  });

  it("names the available products when one is retired while the order is recorded", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      place: vi.fn().mockResolvedValue({
        status: "unavailable_products",
        availableProductSlugs: ["hormone-harmony"],
      }),
    });
    const storeCheckoutPort = createCheckout();
    const useCase = createPlaceOrderUseCase({
      storeOrdersPort,
      storeCheckoutPort,
    });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result).toEqual({
      status: "unavailable_products",
      availableProductSlugs: ["hormone-harmony"],
    });
    expect(storeCheckoutPort.open).not.toHaveBeenCalled();
  });

  it("refuses a cart without a paid item", async () => {
    // arrange
    const useCase = createPlaceOrderUseCase({});

    // act
    const result = await useCase.execute({
      ...command,
      productSlugs: ["hormone-harmony"],
    });

    // assert
    expect(result).toEqual({ status: "no_paid_items" });
  });

  it("answers a replay of a pending order with its stored payment page", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      findByIdempotencyKey: vi
        .fn()
        .mockResolvedValue(withCheckout(pendingOrder())),
    });
    const storeCheckoutPort = createCheckout();
    const useCase = createPlaceOrderUseCase({
      storeOrdersPort,
      storeCheckoutPort,
    });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result).toEqual({
      status: "opened",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_order",
    });
    expect(storeOrdersPort.place).not.toHaveBeenCalled();
    expect(storeCheckoutPort.open).not.toHaveBeenCalled();
  });

  it("opens the payment page on a replay of a pending order that never got one", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      findByIdempotencyKey: vi.fn().mockResolvedValue(pendingOrder()),
    });
    const storeCheckoutPort = createCheckout();
    const useCase = createPlaceOrderUseCase({
      storeOrdersPort,
      storeCheckoutPort,
    });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result.status).toBe("opened");
    expect(storeOrdersPort.place).not.toHaveBeenCalled();
    expect(storeCheckoutPort.open).toHaveBeenCalledTimes(1);
    expect(storeOrdersPort.attachCheckout).toHaveBeenCalledTimes(1);
  });

  it("answers a replay after payment with the paid session", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      findByIdempotencyKey: vi.fn().mockResolvedValue(paidOrder()),
    });
    const useCase = createPlaceOrderUseCase({ storeOrdersPort });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result).toEqual({
      status: "paid",
      checkoutSessionId: "cs_test_order",
    });
  });

  it("refuses a changed submission under the same key", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      findByIdempotencyKey: vi
        .fn()
        .mockResolvedValue(withCheckout(pendingOrder("another-submission"))),
    });
    const useCase = createPlaceOrderUseCase({ storeOrdersPort });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
  });

  it("resolves a concurrent placement under the same key as a replay", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      place: vi.fn().mockResolvedValue({
        status: "exists",
        order: withCheckout(pendingOrder()),
      }),
    });
    const storeCheckoutPort = createCheckout();
    const useCase = createPlaceOrderUseCase({
      storeOrdersPort,
      storeCheckoutPort,
    });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result.status).toBe("opened");
    expect(storeCheckoutPort.open).not.toHaveBeenCalled();
  });

  it("answers temporary unavailability when the payment page cannot be opened, leaving the order pending", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const useCase = createPlaceOrderUseCase({
      storeOrdersPort,
      storeCheckoutPort: createCheckout({
        open: vi.fn().mockRejectedValue(new Error("Stripe down")),
      }),
    });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result).toEqual({ status: "checkout_unavailable" });
    expect(storeOrdersPort.place).toHaveBeenCalledTimes(1);
    expect(storeOrdersPort.attachCheckout).not.toHaveBeenCalled();
  });

  it("answers temporary unavailability when the catalog cannot be read", async () => {
    // arrange
    const storeCatalogPort = createCatalog();
    vi.mocked(storeCatalogPort.getPublishedCatalog).mockRejectedValue(
      new Error("database down"),
    );
    const useCase = createPlaceOrderUseCase({ storeCatalogPort });

    // act
    const result = await useCase.execute(command);

    // assert
    expect(result).toEqual({ status: "checkout_unavailable" });
  });
});

function createCompleteOrderUseCase(options: {
  storeOrdersPort?: StoreOrdersPort;
  ledgerOutcome?: "recorded" | "duplicate";
  incidents?: ReturnType<typeof createIncidents>;
}) {
  return new CompleteOrderUseCase({
    storeOrdersPort: options.storeOrdersPort ?? createStoreOrders(),
    paymentEventLedgerPort: {
      record: vi.fn().mockResolvedValue(options.ledgerOutcome ?? "recorded"),
    },
    orderIncidentsPort: options.incidents ?? createIncidents(),
    clockPort: { now: () => paidAt },
    downloadTokenGeneratorPort: { create: () => token },
    orderDeliveryPort: createOrderDelivery(),
  });
}

const paymentEvent = {
  eventId: "evt_order_paid",
  orderId: "order-1",
  payment: {
    checkoutSessionId: "cs_test_order",
    paymentIntentId: "pi_order",
    amountMinorUnits: 3900,
    currency: "eur",
    paidAt,
  },
};

describe("CompleteOrderUseCase", () => {
  it("marks the order paid, issues one seven-day grant over every item and records a pending email", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      lockForPayment: vi.fn().mockResolvedValue(withCheckout(pendingOrder())),
    });
    const useCase = createCompleteOrderUseCase({ storeOrdersPort });

    // act
    const result = await useCase.execute(paymentEvent);

    // assert
    expect(result.status).toBe("completed");
    const recorded = vi.mocked(storeOrdersPort.recordPaymentWithGrant).mock
      .calls[0]![0];
    expect(recorded.attempt.order.status).toBe("paid");
    expect(recorded.attempt.order.payment?.toSnapshot()).toEqual({
      ...paymentEvent.payment,
      currency: "EUR",
    });
    expect(recorded.attempt.toSnapshot()).toEqual({
      orderId: "order-1",
      provider: "resend",
      providerIdempotencyKey: `store-order-order-1-${"f".repeat(24)}`,
      tokenSha256: token.sha256,
    });
    expect(recorded.grantExpiresAt).toEqual(
      new Date(paidAt.getTime() + SEVEN_DAYS_MS),
    );
    expect(result).toMatchObject({
      delivery: {
        deliveryAttemptId: 51,
        rawToken: "raw-token",
        provider: "resend",
        grantToken: "stored",
      },
    });
  });

  it("does nothing more for an event it already recorded", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const useCase = createCompleteOrderUseCase({
      storeOrdersPort,
      ledgerOutcome: "duplicate",
    });

    // act
    const result = await useCase.execute(paymentEvent);

    // assert
    expect(result).toEqual({ status: "duplicate" });
    expect(storeOrdersPort.lockForPayment).not.toHaveBeenCalled();
    expect(storeOrdersPort.recordPaymentWithGrant).not.toHaveBeenCalled();
  });

  it("leaves a paid order unchanged when another payment event arrives for it", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      lockForPayment: vi.fn().mockResolvedValue(paidOrder()),
    });
    const useCase = createCompleteOrderUseCase({ storeOrdersPort });

    // act
    const result = await useCase.execute({
      ...paymentEvent,
      eventId: "evt_second",
    });

    // assert
    expect(result).toEqual({ status: "already_paid" });
    expect(storeOrdersPort.recordPaymentWithGrant).not.toHaveBeenCalled();
  });

  it("raises an incident for a payment of an unknown order", async () => {
    // arrange
    const incidents = createIncidents();
    const useCase = createCompleteOrderUseCase({ incidents });

    // act
    const result = await useCase.execute(paymentEvent);

    // assert
    expect(result).toEqual({ status: "unknown_order" });
    expect(incidents.paidOrderUnknown).toHaveBeenCalledWith({
      eventId: "evt_order_paid",
      orderId: "order-1",
    });
  });

  it("grants nothing for a payment through a session other than the order's and raises an incident", async () => {
    // arrange
    const incidents = createIncidents();
    const storeOrdersPort = createStoreOrders({
      lockForPayment: vi.fn().mockResolvedValue(withCheckout(pendingOrder())),
    });
    const useCase = createCompleteOrderUseCase({ storeOrdersPort, incidents });

    // act
    const result = await useCase.execute({
      ...paymentEvent,
      payment: { ...paymentEvent.payment, checkoutSessionId: "cs_test_other" },
    });

    // assert
    expect(result).toEqual({ status: "session_mismatch" });
    expect(storeOrdersPort.recordPaymentWithGrant).not.toHaveBeenCalled();
    expect(incidents.paidSessionMismatch).toHaveBeenCalledWith({
      eventId: "evt_order_paid",
      orderId: "order-1",
    });
  });

  it("still completes an order charged a different amount and raises an incident", async () => {
    // arrange
    const incidents = createIncidents();
    const storeOrdersPort = createStoreOrders({
      lockForPayment: vi.fn().mockResolvedValue(withCheckout(pendingOrder())),
    });
    const useCase = createCompleteOrderUseCase({ storeOrdersPort, incidents });

    // act
    const result = await useCase.execute({
      ...paymentEvent,
      payment: { ...paymentEvent.payment, amountMinorUnits: 100 },
    });

    // assert
    expect(result.status).toBe("completed");
    expect(incidents.paymentAmountMismatch).toHaveBeenCalledWith({
      orderId: "order-1",
      expectedMinorUnits: 3900,
      expectedCurrency: "EUR",
      chargedMinorUnits: 100,
      chargedCurrency: "EUR",
    });
  });
});

function emailDelivery(
  grantToken: OrderEmailDelivery["grantToken"] = "stored",
): OrderEmailDelivery {
  return {
    order: paidOrder(),
    deliveryAttemptId: 51,
    provider: "resend",
    providerIdempotencyKey: "store-order-order-1-ffff",
    rawToken: "raw-token",
    tokenSha256: token.sha256,
    grantToken,
    at: paidAt,
  };
}

function createDeliverUseCase(options: {
  storeOrdersPort?: StoreOrdersPort;
  orderDeliveryPort?: OrderDeliveryPort;
  orderTermsPort?: OrderTermsPort;
  incidents?: ReturnType<typeof createIncidents>;
}) {
  return new DeliverOrderEmailUseCase({
    storeOrdersPort: options.storeOrdersPort ?? createStoreOrders(),
    orderDeliveryPort: options.orderDeliveryPort ?? createOrderDelivery(),
    orderTermsPort: options.orderTermsPort ?? { find: () => orderTerms },
    orderIncidentsPort: options.incidents ?? createIncidents(),
  });
}

describe("DeliverOrderEmailUseCase", () => {
  it("sends the order email with its lines, the download link token and the Terms she accepted", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const orderDeliveryPort = createOrderDelivery();
    const useCase = createDeliverUseCase({
      storeOrdersPort,
      orderDeliveryPort,
    });

    // act
    const result = await useCase.execute(emailDelivery());

    // assert
    expect(result).toBe("sent");
    expect(orderDeliveryPort.deliver).toHaveBeenCalledWith({
      email: "woman@example.com",
      idempotencyKey: "store-order-order-1-ffff",
      rawToken: "raw-token",
      currency: "EUR",
      lines: [
        { title: "30-Day Fat Loss Plan", amountMinorUnits: 3900 },
        { title: "Hormone Harmony E-Book", amountMinorUnits: null },
      ],
      totalMinorUnits: 3900,
      terms: orderTerms,
      sentAt: paidAt,
    });
    expect(storeOrdersPort.recordEmailAccepted).toHaveBeenCalledWith({
      deliveryAttemptId: 51,
      provider: "resend",
      providerMessageId: "email-1",
    });
    expect(storeOrdersPort.rotateGrantToken).not.toHaveBeenCalled();
  });

  it("replaces the grant's token with the resent one once the provider accepted the email", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const useCase = createDeliverUseCase({ storeOrdersPort });

    // act
    const result = await useCase.execute(emailDelivery("replacement"));

    // assert
    expect(result).toBe("sent");
    expect(storeOrdersPort.rotateGrantToken).toHaveBeenCalledWith({
      orderId: "order-1",
      tokenSha256: token.sha256,
    });
  });

  it.each<[string, OrderDeliveryPort["deliver"]]>([
    ["cannot be reached", () => Promise.reject(new Error("down"))],
    ["gives no verdict", () => Promise.resolve({ kind: "unconfirmed" })],
    [
      "rejects the email",
      () => Promise.resolve({ kind: "rejected", reason: "invalid_to" }),
    ],
    [
      "answers as another provider",
      () =>
        Promise.resolve({
          kind: "delivered",
          provider: "postmark",
          providerMessageId: "email-1",
        }),
    ],
  ])(
    "keeps the stored token working when the provider %s on a resend",
    async (_case, deliver) => {
      // arrange
      const storeOrdersPort = createStoreOrders();
      const useCase = createDeliverUseCase({
        storeOrdersPort,
        orderDeliveryPort: createOrderDelivery({ deliver }),
      });

      // act
      const result = await useCase.execute(emailDelivery("replacement"));

      // assert
      expect(result).toBe("not_sent");
      expect(storeOrdersPort.rotateGrantToken).not.toHaveBeenCalled();
    },
  );

  it("answers sent and raises an incident when the resent token cannot be stored", async () => {
    // arrange
    const incidents = createIncidents();
    const storeOrdersPort = createStoreOrders({
      rotateGrantToken: vi.fn().mockRejectedValue(new Error("db down")),
    });
    const useCase = createDeliverUseCase({ storeOrdersPort, incidents });

    // act
    const result = await useCase.execute(emailDelivery("replacement"));

    // assert
    expect(result).toBe("sent");
    expect(incidents.orderLinkRotationPending).toHaveBeenCalledWith({
      orderId: "order-1",
    });
    expect(storeOrdersPort.recordEmailAccepted).toHaveBeenCalledTimes(1);
  });

  it("records a retryable attempt when the provider cannot be reached", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const useCase = createDeliverUseCase({
      storeOrdersPort,
      orderDeliveryPort: createOrderDelivery({
        deliver: vi.fn().mockRejectedValue(new Error("provider down")),
      }),
    });

    // act
    const result = await useCase.execute(emailDelivery());

    // assert
    expect(result).toBe("not_sent");
    expect(storeOrdersPort.recordEmailRetryable).toHaveBeenCalledWith({
      deliveryAttemptId: 51,
    });
  });

  it("records a retryable attempt when the provider gives no verdict", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const useCase = createDeliverUseCase({
      storeOrdersPort,
      orderDeliveryPort: createOrderDelivery({
        deliver: vi.fn().mockResolvedValue({ kind: "unconfirmed" }),
      }),
    });

    // act
    const result = await useCase.execute(emailDelivery());

    // assert
    expect(result).toBe("not_sent");
    expect(storeOrdersPort.recordEmailRetryable).toHaveBeenCalledTimes(1);
  });

  it("records a rejection and raises an incident without touching the grant", async () => {
    // arrange
    const incidents = createIncidents();
    const storeOrdersPort = createStoreOrders();
    const useCase = createDeliverUseCase({
      storeOrdersPort,
      incidents,
      orderDeliveryPort: createOrderDelivery({
        deliver: vi
          .fn()
          .mockResolvedValue({ kind: "rejected", reason: "invalid_to" }),
      }),
    });

    // act
    const result = await useCase.execute(emailDelivery());

    // assert
    expect(result).toBe("not_sent");
    expect(storeOrdersPort.recordEmailRejected).toHaveBeenCalledWith({
      deliveryAttemptId: 51,
    });
    expect(incidents.orderEmailRejected).toHaveBeenCalledWith({
      orderId: "order-1",
      reason: "invalid_to",
    });
  });

  it("sends nothing when the Terms she accepted cannot be found", async () => {
    // arrange
    const incidents = createIncidents();
    const storeOrdersPort = createStoreOrders();
    const orderDeliveryPort = createOrderDelivery();
    const useCase = createDeliverUseCase({
      storeOrdersPort,
      orderDeliveryPort,
      incidents,
      orderTermsPort: { find: () => null },
    });

    // act
    const result = await useCase.execute(emailDelivery());

    // assert
    expect(result).toBe("not_sent");
    expect(orderDeliveryPort.deliver).not.toHaveBeenCalled();
    expect(storeOrdersPort.recordEmailRetryable).toHaveBeenCalledWith({
      deliveryAttemptId: 51,
    });
    expect(incidents.termsDocumentMissing).toHaveBeenCalledWith({
      orderId: "order-1",
      termsVersion: "1.0",
    });
  });

  it("raises an incident when an unsent attempt cannot be recorded", async () => {
    // arrange
    const incidents = createIncidents();
    const useCase = createDeliverUseCase({
      incidents,
      orderDeliveryPort: createOrderDelivery({
        deliver: vi.fn().mockResolvedValue({ kind: "unconfirmed" }),
      }),
      storeOrdersPort: createStoreOrders({
        recordEmailRetryable: vi.fn().mockRejectedValue(new Error("db down")),
      }),
    });

    // act
    const result = await useCase.execute(emailDelivery());

    // assert
    expect(result).toBe("not_sent");
    expect(incidents.orderEmailAuditPending).toHaveBeenCalledWith({
      orderId: "order-1",
    });
  });

  it("answers sent and raises an incident when the accepted send cannot be recorded", async () => {
    // arrange
    const incidents = createIncidents();
    const useCase = createDeliverUseCase({
      incidents,
      storeOrdersPort: createStoreOrders({
        recordEmailAccepted: vi.fn().mockRejectedValue(new Error("db down")),
      }),
    });

    // act
    const result = await useCase.execute(emailDelivery());

    // assert
    expect(result).toBe("sent");
    expect(incidents.orderEmailAuditPending).toHaveBeenCalledWith({
      orderId: "order-1",
    });
  });
});

function createResendUseCase(storeOrdersPort: StoreOrdersPort) {
  return new PrepareOrderEmailResendUseCase({
    storeOrdersPort,
    clockPort: { now: () => paidAt },
    downloadTokenGeneratorPort: { create: () => token },
    orderDeliveryPort: createOrderDelivery(),
  });
}

describe("PrepareOrderEmailResendUseCase", () => {
  it("prepares a new email with a replacement token, leaving the stored one in place", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      findByCheckoutSession: vi.fn().mockResolvedValue(paidOrder()),
    });
    const useCase = createResendUseCase(storeOrdersPort);

    // act
    const result = await useCase.execute("cs_test_order");

    // assert
    const prepared = vi.mocked(storeOrdersPort.prepareResend).mock.calls[0]![0];
    expect(prepared.attempt.toSnapshot()).toEqual({
      orderId: "order-1",
      provider: "resend",
      providerIdempotencyKey: `store-order-order-1-${"f".repeat(24)}`,
      tokenSha256: token.sha256,
    });
    expect(prepared.at).toEqual(paidAt);
    expect(prepared.windows).toMatchObject({
      cooldownSince: new Date(paidAt.getTime() - 60 * 1000),
      dailyWindowSince: new Date(paidAt.getTime() - 24 * 60 * 60 * 1000),
    });
    expect(prepared.dailyLimit).toBe(10);
    expect(storeOrdersPort.rotateGrantToken).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "prepared",
      delivery: {
        deliveryAttemptId: 52,
        rawToken: "raw-token",
        grantToken: "replacement",
      },
    });
  });

  it("answers not found for a session no order holds", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders();
    const useCase = createResendUseCase(storeOrdersPort);

    // act
    const result = await useCase.execute("cs_test_unknown");

    // assert
    expect(result).toEqual({ status: "not_found" });
    expect(storeOrdersPort.prepareResend).not.toHaveBeenCalled();
  });

  it("answers processing while the order still waits for its payment", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      findByCheckoutSession: vi
        .fn()
        .mockResolvedValue(withCheckout(pendingOrder())),
    });
    const useCase = createResendUseCase(storeOrdersPort);

    // act
    const result = await useCase.execute("cs_test_order");

    // assert
    expect(result).toEqual({ status: "processing" });
    expect(storeOrdersPort.prepareResend).not.toHaveBeenCalled();
  });

  it("answers rate limited inside the order's cooldown or daily cap", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      findByCheckoutSession: vi.fn().mockResolvedValue(paidOrder()),
      prepareResend: vi
        .fn()
        .mockResolvedValue({ status: "rate_limited", window: "cooldown" }),
    });
    const useCase = createResendUseCase(storeOrdersPort);

    // act
    const result = await useCase.execute("cs_test_order");

    // assert
    expect(result).toEqual({ status: "rate_limited" });
  });

  it("answers not found once the order's download link has expired or been revoked", async () => {
    // arrange
    const storeOrdersPort = createStoreOrders({
      findByCheckoutSession: vi.fn().mockResolvedValue(paidOrder()),
      prepareResend: vi.fn().mockResolvedValue({ status: "grant_unavailable" }),
    });
    const useCase = createResendUseCase(storeOrdersPort);

    // act
    const result = await useCase.execute("cs_test_order");

    // assert
    expect(result).toEqual({ status: "not_found" });
  });
});

function createReadUseCase(
  storeOrdersPort: StoreOrdersPort,
  storeCheckoutPort: StoreCheckoutPort = createCheckout(),
) {
  return new ReadOrderConfirmationUseCase({
    storeOrdersPort,
    storeCheckoutPort,
  });
}

describe("ReadOrderConfirmationUseCase", () => {
  it("confirms a paid order without asking the payment provider", async () => {
    // arrange
    const storeCheckoutPort = createCheckout();
    const useCase = createReadUseCase(
      createStoreOrders({
        findByCheckoutSession: vi.fn().mockResolvedValue(paidOrder()),
      }),
      storeCheckoutPort,
    );

    // act
    const result = await useCase.execute("cs_test_order");

    // assert
    expect(result).toEqual({
      status: "confirmed",
      confirmation: {
        email: "woman@example.com",
        currency: "EUR",
        lines: [
          { title: "30-Day Fat Loss Plan", amountMinorUnits: 3900 },
          { title: "Hormone Harmony E-Book", amountMinorUnits: null },
        ],
        totalMinorUnits: 3900,
        termsVersion: "1.0",
      },
    });
    expect(storeCheckoutPort.isPaid).not.toHaveBeenCalled();
  });

  it("confirms a pending order the payment provider reports paid", async () => {
    // arrange
    const useCase = createReadUseCase(
      createStoreOrders({
        findByCheckoutSession: vi
          .fn()
          .mockResolvedValue(withCheckout(pendingOrder())),
      }),
      createCheckout({ isPaid: vi.fn().mockResolvedValue(true) }),
    );

    // act
    const result = await useCase.execute("cs_test_order");

    // assert
    expect(result.status).toBe("confirmed");
  });

  it("answers not completed for a pending order the provider has not been paid for", async () => {
    // arrange
    const useCase = createReadUseCase(
      createStoreOrders({
        findByCheckoutSession: vi
          .fn()
          .mockResolvedValue(withCheckout(pendingOrder())),
      }),
    );

    // act
    const result = await useCase.execute("cs_test_order");

    // assert
    expect(result).toEqual({ status: "not_completed" });
  });

  it("answers not completed for a session no order holds, without asking the provider", async () => {
    // arrange
    const storeCheckoutPort = createCheckout();
    const useCase = createReadUseCase(createStoreOrders(), storeCheckoutPort);

    // act
    const result = await useCase.execute("cs_test_unknown");

    // assert
    expect(result).toEqual({ status: "not_completed" });
    expect(storeCheckoutPort.isPaid).not.toHaveBeenCalled();
  });
});
