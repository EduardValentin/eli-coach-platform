import { describe, expect, it } from "vitest";

import { ProductPrice, PublishedProduct } from "../product";

import { DeliveryConsent } from "./delivery-consent";
import { Order } from "./order";
import { OrderPayment } from "./order-payment";
import { OrderRequest } from "./order-request";

const placedAt = new Date("2026-11-09T10:00:00.000Z");
const paidAt = new Date("2026-11-09T10:05:00.000Z");

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
      publishedAt: placedAt,
    },
  });
}

const fatLoss = publishedProduct({
  id: 1,
  slug: "fat-loss-30",
  title: "30-Day Fat Loss Plan",
  price: ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 }),
});
const reset = publishedProduct({
  id: 2,
  slug: "nutritional-reset",
  title: "Nutritional Reset Plan",
  price: ProductPrice.reconstitute({ eurCents: 2900, usdCents: 3300 }),
});
const ebook = publishedProduct({
  id: 3,
  slug: "hormone-harmony",
  title: "Hormone Harmony E-Book",
  price: null,
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
    expect(order.consents).toEqual({
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
    const order = placedOrder();
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
