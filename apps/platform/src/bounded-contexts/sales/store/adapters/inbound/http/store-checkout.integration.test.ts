import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  PAID_DIGITAL_DELIVERY_CONSENT,
  PRIVACY_POLICY_VERSION,
  STORE_MARKETING_CONSENT_VERSION,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "~/bounded-contexts/legal/public";
import type { ProductPricingRequest } from "~/bounded-contexts/sales/store/public/store-management";
import { STORE_ACQUISITION_TURNSTILE_ACTION } from "~/shared/submission-checks/bot-detection";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  ApiIntegrationTestSuite,
  type SentEmail,
} from "~integration-test-config/api-integration-test-suite";
import { PlatformRig } from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";
import { stripeWebhook } from "~integration-test-config/stripe-webhook-request";
import {
  resendAcceptsEveryEmail,
  resendFailsWithoutVerdict,
} from "~integration-test-config/wire-mock/expectations/resend-emails";
import {
  STRIPE_CHECKOUT_SESSIONS_PATH,
  STRIPE_STORE_CHECKOUT_SESSION_ID,
  hostedCheckoutUrl,
  paidStoreCheckoutSession,
  paymentIntentOf,
  stripeCreatesStoreCheckoutSession,
  stripeRefusesStoreCheckoutSessions,
  stripeRetrievesStoreSession,
} from "~integration-test-config/wire-mock/expectations/stripe-api";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const MANAGEMENT_SECRET = "integration-management-api-secret-value";
const BUYER = "woman@example.com";
const ORDER_KEY = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const SECOND_ORDER_KEY = "1b2c3d4e-5f60-4b7c-9d8e-0f1a2b3c4d5e";
const PAID_EVENT_ID = "evt_store_order_paid";
const placedAt = new Date("2026-11-09T10:00:00.000Z");
const paidAt = new Date("2026-11-09T10:03:00.000Z");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const PAST_COOLDOWN_MS = 2 * 60 * 1000;
const CHECKOUT_COMPLETE_PAGE = "/store/checkout/complete";
const storeSubmissionToken = turnstileTokenForAction(
  STORE_ACQUISITION_TURNSTILE_ACTION,
);

type SeededProduct = {
  slug: string;
  title: string;
  fileName: string;
  fileBytes: string;
  displayOrder: number;
};

const FAT_LOSS: SeededProduct = {
  slug: "fat-loss-30",
  title: "30-Day Fat Loss Plan",
  fileName: "Fat Loss Plan.pdf",
  fileBytes: "fat-loss-version-one",
  displayOrder: 1,
};
const NUTRITIONAL_RESET: SeededProduct = {
  slug: "nutritional-reset",
  title: "Nutritional Reset Plan",
  fileName: "Nutritional Reset.pdf",
  fileBytes: "reset-version-one",
  displayOrder: 2,
};
const HORMONE_HARMONY: SeededProduct = {
  slug: "hormone-harmony",
  title: "Hormone Harmony E-Book",
  fileName: "Hormone Harmony.pdf",
  fileBytes: "hormone-harmony-version-one",
  displayOrder: 3,
};
const CART = [FAT_LOSS.slug, NUTRITIONAL_RESET.slug, HORMONE_HARMONY.slug];

type StoreOrderRow = {
  id: string;
  email: string;
  status: string;
  currency: string;
  checkoutSessionId: string | null;
  checkoutUrl: string | null;
  paymentIntentId: string | null;
  chargedMinorUnits: number | null;
  chargedCurrency: string | null;
  paidAt: Date | null;
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
  marketingConsent: boolean;
  deliveryConsentTermsVersion: string;
  deliveryConsentedAt: Date;
};

describe("Store checkout integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("opens Stripe with her email locked and only the paid lines in her currency, then fulfils the order from the webhook", async () => {
    // arrange
    await rig.holdClock(placedAt);
    await seedCatalog();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());

    // act
    const placed = await placeOrder({ currency: "USD" });
    const placedBody = (await placed.json()) as { checkoutUrl: string };
    const [sessionRequest] = await requestedStoreSessions();
    await rig.holdClock(paidAt);
    const webhook = await deliverPaidWebhook({ amountTotal: 7800 });

    // assert
    expect(placed.status).toBe(201);
    expect(placedBody).toEqual({
      success: true,
      checkoutUrl: hostedCheckoutUrl(STRIPE_STORE_CHECKOUT_SESSION_ID),
    });
    const orderId = sessionRequest!.form.get("metadata[orderId]");
    expect(Object.fromEntries(sessionRequest!.form)).toEqual({
      mode: "payment",
      customer_email: BUYER,
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": "4500",
      "line_items[0][price_data][product_data][name]": FAT_LOSS.title,
      "line_items[1][quantity]": "1",
      "line_items[1][price_data][currency]": "usd",
      "line_items[1][price_data][unit_amount]": "3300",
      "line_items[1][price_data][product_data][name]": NUTRITIONAL_RESET.title,
      "metadata[purpose]": "store-order",
      "metadata[orderId]": orderId,
      "payment_intent_data[metadata][purpose]": "store-order",
      "payment_intent_data[metadata][orderId]": orderId,
      success_url: `https://localhost:3000${suite.path(CHECKOUT_COMPLETE_PAGE)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://localhost:3000${suite.path("/store")}?payment=cancelled`,
    });
    expect(sessionRequest!.idempotencyKey).toBe(
      `store-order:${orderId}:checkout`,
    );
    expect(webhook.status).toBe(200);
    expect(await readOrders()).toEqual([
      {
        id: orderId,
        email: BUYER,
        status: "paid",
        currency: "USD",
        checkoutSessionId: STRIPE_STORE_CHECKOUT_SESSION_ID,
        checkoutUrl: hostedCheckoutUrl(STRIPE_STORE_CHECKOUT_SESSION_ID),
        paymentIntentId: paymentIntentOf(STRIPE_STORE_CHECKOUT_SESSION_ID),
        chargedMinorUnits: 7800,
        chargedCurrency: "USD",
        paidAt,
        termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
        marketingConsent: false,
        deliveryConsentTermsVersion: PAID_DIGITAL_DELIVERY_CONSENT.termsVersion,
        deliveryConsentedAt: placedAt,
      },
    ]);
    expect(await readOrderItems()).toEqual([
      { title: FAT_LOSS.title, amountMinorUnits: 4500 },
      { title: HORMONE_HARMONY.title, amountMinorUnits: 0 },
      { title: NUTRITIONAL_RESET.title, amountMinorUnits: 3300 },
    ]);
    expect(await readGrants()).toEqual([
      {
        itemCount: 3,
        status: "active",
        expiresAt: new Date(paidAt.getTime() + SEVEN_DAYS_MS),
      },
    ]);
    const emails = await suite.sentEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      to: BUYER,
      subject: "Your order is confirmed",
      attachments: [
        {
          contentType: "application/pdf",
          filename: `terms-and-conditions-${WEBSITE_AND_STORE_TERMS_DOCUMENT.version}.pdf`,
        },
      ],
    });
    expect(emails[0]!.attachments[0]!.contentText.startsWith("%PDF-")).toBe(
      true,
    );
    expect(emails[0]!.text).toContain("TOTAL (USD): $78.00");
    expect(emails[0]!.text).toContain(`- ${HORMONE_HARMONY.title} — FREE`);
    expect(await readAttemptStatuses()).toEqual(["accepted"]);
  });

  it("downloads every item of the paid order, free ones included, from the emailed link", async () => {
    // arrange
    await seedCatalog();
    await placeAndPay();
    const [orderEmail] = await suite.sentEmails();

    // act
    const download = await requestDownload(downloadTokenFrom(orderEmail!));

    // assert
    expect(download.status).toBe(200);
    const archive = Buffer.from(await download.arrayBuffer()).toString(
      "binary",
    );
    expect(archive).toContain(`${FAT_LOSS.slug}/${FAT_LOSS.fileName}`);
    expect(archive).toContain(
      `${NUTRITIONAL_RESET.slug}/${NUTRITIONAL_RESET.fileName}`,
    );
    expect(archive).toContain(
      `${HORMONE_HARMONY.slug}/${HORMONE_HARMONY.fileName}`,
    );
  });

  it("answers a replay of the same submission with the same payment page and keeps one order", async () => {
    // arrange
    await seedCatalog();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
    const first = await placeOrder({});

    // act
    const replay = await placeOrder({});

    // assert
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(await first.json());
    expect(await readOrders()).toHaveLength(1);
    expect(await requestedStoreSessions()).toHaveLength(1);
  });

  it("refuses a changed submission under the same key", async () => {
    // arrange
    await seedCatalog();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
    await placeOrder({});

    // act
    const changed = await placeOrder({ currency: "USD" });

    // assert
    expect(changed.status).toBe(409);
    expect(await changed.json()).toMatchObject({
      error: { code: "idempotency_conflict" },
    });
    expect(await readOrders()).toHaveLength(1);
  });

  it("answers a replay after payment with the order-complete page", async () => {
    // arrange
    await seedCatalog();
    await placeAndPay();

    // act
    const replay = await placeOrder({});

    // assert
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual({
      success: true,
      checkoutUrl: `https://localhost:3000${suite.path(CHECKOUT_COMPLETE_PAGE)}?session_id=${STRIPE_STORE_CHECKOUT_SESSION_ID}`,
    });
  });

  it("names the products still available when one is no longer sold, recording nothing", async () => {
    // arrange
    await seedCatalog();

    // act
    const response = await placeOrder({
      productSlugs: [FAT_LOSS.slug, "retired-plan"],
    });

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: {
        code: "unavailable_products",
        availableProductSlugs: [FAT_LOSS.slug],
      },
    });
    expect(await readOrders()).toEqual([]);
    expect(await requestedStoreSessions()).toEqual([]);
  });

  it("rejects a submission Turnstile does not recognise before recording anything", async () => {
    // arrange
    await seedCatalog();

    // act
    const response = await placeOrder({ turnstileToken: "forged-token" });

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "bot_verification_failed" },
    });
    expect(await readOrders()).toEqual([]);
  });

  it("answers temporary unavailability while Stripe is down and opens the page on the next replay", async () => {
    // arrange
    await seedCatalog();
    await suite.wireMock.stub(stripeRefusesStoreCheckoutSessions());

    // act
    const whileDown = await placeOrder({});
    const ordersWhileDown = await readOrders();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
    const afterRecovery = await placeOrder({});

    // assert
    expect(whileDown.status).toBe(503);
    expect(await whileDown.json()).toMatchObject({
      error: { code: "checkout_unavailable" },
    });
    expect(ordersWhileDown).toEqual([
      expect.objectContaining({ status: "pending", checkoutSessionId: null }),
    ]);
    expect(afterRecovery.status).toBe(201);
    expect(await afterRecovery.json()).toMatchObject({
      checkoutUrl: hostedCheckoutUrl(STRIPE_STORE_CHECKOUT_SESSION_ID),
    });
    expect(await readOrders()).toEqual([
      expect.objectContaining({
        checkoutSessionId: STRIPE_STORE_CHECKOUT_SESSION_ID,
      }),
    ]);
  });

  it("grants and emails once when Stripe delivers the payment twice or a second event follows", async () => {
    // arrange
    await seedCatalog();
    await placeAndPay();

    // act
    const redelivery = await deliverPaidWebhook({});
    const laterEvent = await deliverPaidWebhook({
      eventId: "evt_store_order_paid_again",
      amountTotal: 1,
    });

    // assert
    expect(redelivery.status).toBe(200);
    expect(laterEvent.status).toBe(200);
    expect(await suite.sentEmails()).toHaveLength(1);
    expect(await readGrants()).toHaveLength(1);
    expect(await readOrders()).toEqual([
      expect.objectContaining({ status: "paid", chargedMinorUnits: 6800 }),
    ]);
  });

  it("still fulfils an order charged an amount other than its total", async () => {
    // arrange
    await seedCatalog();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
    await placeOrder({});

    // act
    const webhook = await deliverPaidWebhook({ amountTotal: 100 });

    // assert
    expect(webhook.status).toBe(200);
    expect(await readOrders()).toEqual([
      expect.objectContaining({ status: "paid", chargedMinorUnits: 100 }),
    ]);
    expect(await suite.sentEmails()).toHaveLength(1);
  });

  it("grants nothing for a paid session that is not the one opened for the order", async () => {
    // arrange
    await seedCatalog();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
    await placeOrder({});

    // act
    const webhook = await deliverPaidWebhook({
      sessionId: "cs_test_anotherordersession",
    });

    // assert
    expect(webhook.status).toBe(200);
    expect(await readOrders()).toEqual([
      expect.objectContaining({
        status: "pending",
        checkoutSessionId: STRIPE_STORE_CHECKOUT_SESSION_ID,
        paidAt: null,
      }),
    ]);
    expect(await readGrants()).toEqual([]);
    expect(await suite.sentEmails()).toEqual([]);
  });

  it("leaves store orders untouched by a completed checkout for another purpose", async () => {
    // arrange
    await seedCatalog();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
    await placeOrder({});
    const [sessionRequest] = await requestedStoreSessions();

    // act
    const foreign = await deliverPaidWebhook({
      metadata: {
        purpose: "gift-card",
        orderId: sessionRequest!.form.get("metadata[orderId]")!,
      },
    });

    // assert
    expect(foreign.status).toBe(200);
    expect(await readOrders()).toEqual([
      expect.objectContaining({ status: "pending" }),
    ]);
    expect(await readGrants()).toEqual([]);
    expect(await suite.sentEmails()).toEqual([]);
  });

  it("keeps the order paid when the email fails, and a resend sends a rotated link that replaces the old one", async () => {
    // arrange
    await rig.holdClock(placedAt);
    await seedCatalog();
    await suite.wireMock.stub(resendFailsWithoutVerdict("store-order-"));
    await placeAndPay();
    const [failedSend] = await suite.sentEmails();
    await suite.wireMock.stub({ ...resendAcceptsEveryEmail, priority: 1 });

    // act
    const resend = await requestResend(STRIPE_STORE_CHECKOUT_SESSION_ID);
    const [, resent] = await suite.sentEmails();
    const oldLink = await requestDownload(downloadTokenFrom(failedSend!));
    const newLink = await requestDownload(downloadTokenFrom(resent!));

    // assert
    expect(await readOrders()).toEqual([
      expect.objectContaining({ status: "paid" }),
    ]);
    expect(resend.status).toBe(200);
    expect(await resend.json()).toEqual({ success: true, outcome: "sent" });
    expect(await readAttemptStatuses()).toEqual(["retryable", "accepted"]);
    expect(await readGrants()).toEqual([
      expect.objectContaining({
        expiresAt: new Date(placedAt.getTime() + SEVEN_DAYS_MS),
      }),
    ]);
    expect(oldLink.status).toBe(303);
    expect(oldLink.headers.get("Location")).toBe(
      suite.path("/store/download?unavailable=1"),
    );
    expect(newLink.status).toBe(200);
  });

  it("keeps the emailed link working when a resend cannot reach the email provider", async () => {
    // arrange
    await rig.holdClock(placedAt);
    await seedCatalog();
    await placeAndPay();
    const [orderEmail] = await suite.sentEmails();
    await rig.holdClock(new Date(placedAt.getTime() + PAST_COOLDOWN_MS));
    await suite.wireMock.stub(resendFailsWithoutVerdict("store-order-"));

    // act
    const resend = await requestResend(STRIPE_STORE_CHECKOUT_SESSION_ID);
    const emailedLink = await requestDownload(downloadTokenFrom(orderEmail!));

    // assert
    expect(resend.status).toBe(503);
    expect(await readAttemptStatuses()).toEqual(["accepted", "retryable"]);
    expect(emailedLink.status).toBe(200);
  });

  it("limits resends to the free flow's cooldown, counted per order", async () => {
    // arrange
    await rig.holdClock(placedAt);
    await seedCatalog();
    await placeAndPay();

    // act
    const insideCooldown = await requestResend(
      STRIPE_STORE_CHECKOUT_SESSION_ID,
    );
    await rig.holdClock(new Date(placedAt.getTime() + PAST_COOLDOWN_MS));
    const afterCooldown = await requestResend(STRIPE_STORE_CHECKOUT_SESSION_ID);

    // assert
    expect(await insideCooldown.json()).toEqual({
      success: true,
      outcome: "rate_limited",
    });
    expect(await afterCooldown.json()).toEqual({
      success: true,
      outcome: "sent",
    });
    expect(await suite.sentEmails()).toHaveLength(2);
  });

  it("answers processing for an order still waiting for its payment and not found for an unknown session", async () => {
    // arrange
    await seedCatalog();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
    await placeOrder({});

    // act
    const pending = await requestResend(STRIPE_STORE_CHECKOUT_SESSION_ID);
    const unknown = await requestResend("cs_test_neverissued");

    // assert
    expect(await pending.json()).toEqual({
      success: true,
      outcome: "processing",
    });
    expect(await unknown.json()).toEqual({
      success: true,
      outcome: "not_found",
    });
    expect(await suite.sentEmails()).toEqual([]);
  });

  it("never counts a paid order toward the free flow's delivery limits", async () => {
    // arrange
    await seedCatalog();
    await placeAndPay();

    // act
    const freeRequest = await requestFreeAcquisition();

    // assert
    expect(freeRequest.status).toBe(201);
    expect(await suite.sentEmails()).toHaveLength(2);
  });

  it("confirms the order on its page once the webhook has landed, uncached and unindexed", async () => {
    // arrange
    await seedCatalog();
    await placeAndPay();

    // act
    const response = await requestOrderPage(STRIPE_STORE_CHECKOUT_SESSION_ID);

    // assert
    const page = await visibleDocument(response);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(page).toMatch(/<meta name="robots" content="noindex"\/>/);
    expect(page).toMatch(/<h1[^>]*>Order confirmed<\/h1>/);
    expect(page).toContain(BUYER);
    expect(await stripeSessionReads(STRIPE_STORE_CHECKOUT_SESSION_ID)).toBe(0);
  });

  it("confirms the order on its page from Stripe's paid session when the webhook is late", async () => {
    // arrange
    await seedCatalog();
    await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
    await placeOrder({});
    const [sessionRequest] = await requestedStoreSessions();
    await suite.wireMock.stub(
      stripeRetrievesStoreSession(
        paidStoreCheckoutSession({
          amountTotal: 6800,
          createdAt: new Date(),
          currency: "eur",
          customerEmail: BUYER,
          id: STRIPE_STORE_CHECKOUT_SESSION_ID,
          metadata: {
            purpose: "store-order",
            orderId: sessionRequest!.form.get("metadata[orderId]")!,
          },
        }),
      ),
    );

    // act
    const response = await requestOrderPage(STRIPE_STORE_CHECKOUT_SESSION_ID);

    // assert
    const page = await visibleDocument(response);
    expect(response.status).toBe(200);
    expect(page).toMatch(/<h1[^>]*>Order confirmed<\/h1>/);
    expect(page).toContain(BUYER);
    expect(await readOrders()).toEqual([
      expect.objectContaining({ status: "pending" }),
    ]);
  });

  it("shows payment not completed for a session no order holds, without asking Stripe", async () => {
    // arrange
    await seedCatalog();

    // act
    const response = await requestOrderPage("cs_test_neverissued");

    // assert
    const page = await visibleDocument(response);
    expect(response.status).toBe(200);
    expect(page).toMatch(/<h1[^>]*>Payment not completed<\/h1>/);
    expect(page).not.toContain(BUYER);
    expect(await stripeSessionReads("cs_test_neverissued")).toBe(0);
  });

  it("keeps a paid order and its download intact through a later price change and retirement", async () => {
    // arrange
    await seedCatalog();
    await placeAndPay();
    const [orderEmail] = await suite.sentEmails();

    // act
    const repriced = await changePrice(FAT_LOSS.slug, {
      idempotencyKey: "2c3d4e5f-6071-4c8d-8e9f-1a2b3c4d5e6f",
      pricing: { kind: "paid", eurCents: 9900, usdCents: 9900 },
    });
    const retired = await retireProduct(NUTRITIONAL_RESET.slug);
    const download = await requestDownload(downloadTokenFrom(orderEmail!));

    // assert
    expect(repriced.status).toBe(201);
    expect(retired.status).toBe(200);
    expect(await readOrderItems()).toEqual([
      { title: FAT_LOSS.title, amountMinorUnits: 3900 },
      { title: HORMONE_HARMONY.title, amountMinorUnits: 0 },
      { title: NUTRITIONAL_RESET.title, amountMinorUnits: 2900 },
    ]);
    expect(await readOrders()).toEqual([
      expect.objectContaining({ status: "paid", chargedMinorUnits: 6800 }),
    ]);
    expect(download.status).toBe(200);
    expect(
      Buffer.from(await download.arrayBuffer()).toString("binary"),
    ).toContain(`${NUTRITIONAL_RESET.slug}/${NUTRITIONAL_RESET.fileName}`);
  });

  it("places a second order for the same email under a new key", async () => {
    // arrange
    await seedCatalog();
    await placeAndPay();
    await suite.wireMock.stub(
      stripeCreatesStoreCheckoutSession("cs_test_storeordertwo"),
    );

    // act
    const second = await placeOrder({ idempotencyKey: SECOND_ORDER_KEY });

    // assert
    expect(second.status).toBe(201);
    expect(await second.json()).toMatchObject({
      checkoutUrl: hostedCheckoutUrl("cs_test_storeordertwo"),
    });
    expect(await readOrders()).toHaveLength(2);
  });
});

async function placeOrder(options: {
  idempotencyKey?: string;
  currency?: "EUR" | "USD";
  productSlugs?: readonly string[];
  turnstileToken?: string;
}): Promise<Response> {
  const formData = new FormData();
  formData.set(
    "cf-turnstile-response",
    options.turnstileToken ?? storeSubmissionToken,
  );
  formData.set("idempotencyKey", options.idempotencyKey ?? ORDER_KEY);
  formData.set("email", " Woman@Example.com ");
  formData.set("productSlugs", JSON.stringify(options.productSlugs ?? CART));
  formData.set("currency", options.currency ?? "EUR");
  formData.set("termsAccepted", "true");
  formData.set("deliveryConsent", "true");
  formData.set("marketingConsent", "false");

  return suite.request(
    new Request(suite.url("/api/store/checkouts"), {
      body: formData,
      method: "POST",
    }),
  );
}

async function placeAndPay(): Promise<void> {
  await suite.wireMock.stub(stripeCreatesStoreCheckoutSession());
  const placed = await placeOrder({});

  if (placed.status !== 201) {
    throw new Error(`Placing the order answered ${placed.status}.`);
  }

  const webhook = await deliverPaidWebhook({});

  if (webhook.status !== 200) {
    throw new Error(`The paid webhook answered ${webhook.status}.`);
  }
}

async function deliverPaidWebhook(options: {
  eventId?: string;
  amountTotal?: number;
  metadata?: Record<string, string>;
  sessionId?: string;
}): Promise<Response> {
  const [sessionRequest] = await requestedStoreSessions();

  if (!sessionRequest) {
    throw new Error("No store checkout session reached Stripe.");
  }

  const signedAt = rig.now();

  return suite.request(
    stripeWebhook({
      event: {
        data: {
          object: paidStoreCheckoutSession({
            amountTotal: options.amountTotal ?? 6800,
            createdAt: signedAt,
            currency:
              sessionRequest.form.get("line_items[0][price_data][currency]") ===
              "usd"
                ? "usd"
                : "eur",
            customerEmail: BUYER,
            id: options.sessionId ?? STRIPE_STORE_CHECKOUT_SESSION_ID,
            metadata: options.metadata ?? {
              purpose: "store-order",
              orderId: sessionRequest.form.get("metadata[orderId]")!,
            },
          }),
        },
        id: options.eventId ?? PAID_EVENT_ID,
        type: "checkout.session.completed",
      },
      signedAt,
      url: suite.url("/api/stripe/webhooks"),
    }),
  );
}

async function requestedStoreSessions(): Promise<
  { form: URLSearchParams; idempotencyKey: string | null }[]
> {
  const requests = await suite.wireMock.recordedRequests(
    STRIPE_CHECKOUT_SESSIONS_PATH,
  );

  return requests
    .filter((request) => request.method === "POST")
    .map((request) => ({
      form: new URLSearchParams(request.body),
      idempotencyKey: request.headers["Idempotency-Key"] ?? null,
    }))
    .filter(({ form }) => form.get("metadata[purpose]") === "store-order");
}

async function stripeSessionReads(sessionId: string): Promise<number> {
  const requests = await suite.wireMock.recordedRequests(
    `${STRIPE_CHECKOUT_SESSIONS_PATH}/${sessionId}`,
  );

  return requests.length;
}

async function requestResend(sessionId: string): Promise<Response> {
  const formData = new FormData();
  formData.set("sessionId", sessionId);

  return suite.request(
    new Request(suite.url("/api/store/orders/email"), {
      body: formData,
      method: "POST",
    }),
  );
}

async function requestOrderPage(sessionId: string): Promise<Response> {
  return suite.request(
    new Request(
      suite.url(
        `${CHECKOUT_COMPLETE_PAGE}?${new URLSearchParams({ session_id: sessionId })}`,
      ),
    ),
  );
}

async function requestDownload(token: string): Promise<Response> {
  const formData = new FormData();
  formData.set("token", token);

  return suite.request(
    new Request(suite.url("/api/store/downloads"), {
      body: formData,
      method: "POST",
    }),
  );
}

async function requestFreeAcquisition(): Promise<Response> {
  const formData = new FormData();
  formData.set("cf-turnstile-response", storeSubmissionToken);
  formData.set("email", BUYER);
  formData.set("idempotencyKey", "3d4e5f60-7182-4d9e-9fa0-2b3c4d5e6f70");
  formData.set("marketingConsent", "false");
  formData.set("productSlugs", JSON.stringify([HORMONE_HARMONY.slug]));
  formData.set("termsAccepted", "true");

  return suite.request(
    new Request(suite.url("/api/store/acquisitions"), {
      body: formData,
      method: "POST",
    }),
  );
}

function downloadTokenFrom(email: SentEmail): string {
  const [downloadUrl] = /https?:\/\/\S+\/store\/download#\S+/.exec(
    email.text,
  ) ?? [""];

  return new URL(downloadUrl).hash.slice(1);
}

async function readOrders(): Promise<StoreOrderRow[]> {
  return suite.postgres.queryRows<StoreOrderRow>({
    sql: `
      select
        store_order.id,
        recipient.normalized_email as "email",
        store_order.status,
        store_order.currency,
        store_order.checkout_session_id as "checkoutSessionId",
        store_order.checkout_url as "checkoutUrl",
        store_order.payment_intent_id as "paymentIntentId",
        store_order.charged_minor_units as "chargedMinorUnits",
        store_order.charged_currency as "chargedCurrency",
        store_order.paid_at as "paidAt",
        store_order.terms_version as "termsVersion",
        store_order.privacy_policy_version as "privacyPolicyVersion",
        store_order.marketing_consent_version as "marketingConsentVersion",
        store_order.marketing_consent as "marketingConsent",
        store_order.delivery_consent_terms_version as "deliveryConsentTermsVersion",
        store_order.delivery_consented_at as "deliveryConsentedAt"
      from app.store_orders store_order
      join app.store_recipients recipient
        on recipient.id = store_order.recipient_id
      order by store_order.placed_at, store_order.id
    `,
    values: [],
  });
}

async function readOrderItems(): Promise<
  { title: string; amountMinorUnits: number }[]
> {
  return suite.postgres.queryRows({
    sql: `
      select title, amount_minor_units as "amountMinorUnits"
      from app.store_order_items
      order by position
    `,
    values: [],
  });
}

async function readGrants(): Promise<
  { itemCount: number; status: string; expiresAt: Date }[]
> {
  return suite.postgres.queryRows({
    sql: `
      select
        count(grant_item.product_version_id)::int as "itemCount",
        download_grant.status,
        download_grant.expires_at as "expiresAt"
      from app.download_grants download_grant
      join app.download_grant_items grant_item
        on grant_item.grant_id = download_grant.id
      where download_grant.order_id is not null
      group by download_grant.id
    `,
    values: [],
  });
}

async function readAttemptStatuses(): Promise<string[]> {
  const rows = await suite.postgres.queryRows<{ status: string }>({
    sql: `
      select status
      from app.delivery_attempts
      where order_id is not null
      order by id
    `,
    values: [],
  });

  return rows.map((row) => row.status);
}

async function changePrice(
  slug: string,
  body: {
    idempotencyKey: string;
    pricing: ProductPricingRequest;
  },
): Promise<Response> {
  return suite.request(
    new Request(
      suite.url(
        `/api/management/store/products/${await productIdOf(slug)}/prices`,
      ),
      {
        body: JSON.stringify(body),
        headers: managementHeaders({ "content-type": "application/json" }),
        method: "POST",
      },
    ),
  );
}

async function retireProduct(slug: string): Promise<Response> {
  return suite.request(
    new Request(
      suite.url(`/api/management/store/products/${await productIdOf(slug)}`),
      { headers: managementHeaders({}), method: "PATCH" },
    ),
  );
}

function managementHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return {
    ...headers,
    authorization: `Bearer ${MANAGEMENT_SECRET}`,
    "x-forwarded-proto": "https",
  };
}

async function productIdOf(slug: string): Promise<number> {
  const [product] = await suite.postgres.queryRows<{ id: number }>({
    sql: `select id from app.products where slug = $1`,
    values: [slug],
  });

  return product!.id;
}

async function seedCatalog(): Promise<void> {
  for (const product of [FAT_LOSS, NUTRITIONAL_RESET, HORMONE_HARMONY]) {
    await seedPublishedProduct(product);
  }

  const prices: readonly {
    slug: string;
    idempotencyKey: string;
    pricing: ProductPricingRequest;
  }[] = [
    {
      slug: FAT_LOSS.slug,
      idempotencyKey: "4e5f6071-8293-4eaf-8b01-3c4d5e6f7081",
      pricing: { kind: "paid", eurCents: 3900, usdCents: 4500 },
    },
    {
      slug: NUTRITIONAL_RESET.slug,
      idempotencyKey: "5f607182-93a4-4fb0-9c12-4d5e6f708192",
      pricing: { kind: "paid", eurCents: 2900, usdCents: 3300 },
    },
  ];

  for (const { slug, ...price } of prices) {
    const response = await changePrice(slug, price);

    if (response.status !== 201) {
      throw new Error(`Pricing ${slug} answered ${response.status}.`);
    }
  }
}

async function seedPublishedProduct(product: SeededProduct): Promise<void> {
  const assetRoot = suite.assetRoot();
  const coverAssetKey = `covers/${product.slug}-v1.webp`;
  const assetKey = `products/${product.slug}-v1.pdf`;
  const cover = Buffer.from(`${product.slug}-cover`);
  const asset = Buffer.from(product.fileBytes);

  await mkdir(join(assetRoot, "covers"), { recursive: true });
  await mkdir(join(assetRoot, "products"), { recursive: true });
  await Promise.all([
    writeFile(join(assetRoot, coverAssetKey), cover),
    writeFile(join(assetRoot, assetKey), asset),
  ]);
  await suite.postgres.executeSql({
    sql: `
      insert into app.products (slug, lifecycle_status, display_order)
      values ($1, 'published', $2)
    `,
    values: [product.slug, product.displayOrder],
  });
  await suite.postgres.executeSql({
    sql: `
      insert into app.product_versions (
        product_id,
        sequence,
        title,
        creator_name,
        card_summary,
        detail_description,
        included_items,
        cover_asset_key,
        cover_alt,
        cover_mime_type,
        cover_size_bytes,
        cover_sha256
      )
      select
        id,
        1,
        $2,
        'Eli',
        'A practical plan.',
        'Step-by-step guidance.',
        '["Step-by-step guidance"]'::jsonb,
        $3,
        'Cover',
        'image/webp',
        $4,
        $5
      from app.products
      where slug = $1
    `,
    values: [
      product.slug,
      product.title,
      coverAssetKey,
      cover.byteLength,
      sha256(cover),
    ],
  });
  await suite.postgres.executeSql({
    sql: `
      insert into app.product_version_assets (
        product_version_id,
        asset_key,
        customer_filename,
        mime_type,
        size_bytes,
        sha256
      )
      select version.id, $2, $3, 'application/pdf', $4, $5
      from app.product_versions version
      join app.products product on product.id = version.product_id
      where product.slug = $1
    `,
    values: [
      product.slug,
      assetKey,
      product.fileName,
      asset.byteLength,
      sha256(asset),
    ],
  });
  await suite.postgres.executeSql({
    sql: `
      insert into app.product_version_type_assignments (
        product_version_id,
        product_type_id
      )
      select version.id, type.id
      from app.product_versions version
      join app.products product on product.id = version.product_id
      cross join app.product_types type
      where product.slug = $1 and type.slug = 'e-books'
    `,
    values: [product.slug],
  });
  await suite.postgres.executeSql({
    sql: `
      insert into app.product_version_goal_assignments (
        product_version_id,
        product_goal_id
      )
      select version.id, goal.id
      from app.product_versions version
      join app.products product on product.id = version.product_id
      cross join app.product_goals goal
      where product.slug = $1 and goal.slug = 'wellness'
    `,
    values: [product.slug],
  });
  await suite.postgres.executeSql({
    sql: `
      update app.product_versions version
      set published_at = now()
      from app.products product
      where product.id = version.product_id and product.slug = $1
    `,
    values: [product.slug],
  });
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
