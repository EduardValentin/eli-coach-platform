import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";
import type { StorePrice } from "~/bounded-contexts/sales/store/public/store-currency";

import { E2E_APP_URL } from "../support/e2e-app";
import {
  emailTo,
  subjectsTo,
  type CapturedEmail,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { resolveRunId } from "../support/run-id";
import type { StoreProductFields } from "../support/store-product-requests";
import { deliverCheckoutCompleted } from "../support/stripe-events";

const RUN_ID = resolveRunId();
const PLAN_PRICES: StorePrice = { eurCents: 3900, usdCents: 4500 };
const CARDHOLDER_NAME = "Ana Buyer";
const ORDER_SUBJECT = "Your order is confirmed";
const TERMS_ATTACHMENT = "terms-and-conditions-1.0.pdf";
const BUNDLE_FILENAME = "eli-resources.zip";
const DOWNLOAD_LINK = /\/store\/download#[\w-]+$/;
const PAYMENT_NOT_COMPLETED = "Payment not completed. Your cart is saved.";
const JOURNEY_TIMEOUT_MS = 180_000;

function storeProductFieldsOf(
  name: string,
  scenarioTag: string,
  prices: StorePrice | null,
): StoreProductFields {
  return {
    slug: `${name.toLowerCase().replaceAll(" ", "-")}-${RUN_ID}-${scenarioTag}`,
    title: `${name} ${scenarioTag}`,
    prices,
  };
}

function downloadLinkIn(email: CapturedEmail): string {
  const link = email.links.find((candidate) => DOWNLOAD_LINK.test(candidate));

  if (!link) {
    throw new Error(`"${email.subject}" carries no store download link.`);
  }

  return link;
}

test(
  "a visitor pays for a plan, gets the free guide with it and downloads both from her order email",
  { tag: "@critical" },
  async ({
    registerCheckoutSessionForCleanup,
    scenarioTag,
    storeCartDrawer,
    storeCatalog,
    storeDownload,
    storeOrderComplete,
    storeProductRequests,
    stripeCheckout,
    visitorEmail,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const plan = storeProductFieldsOf("Sculpt Plan", scenarioTag, PLAN_PRICES);
    const guide = storeProductFieldsOf("Stretch Guide", scenarioTag, null);
    await storeProductRequests.publishAccepted(plan);
    await storeProductRequests.publishAccepted(guide);
    await storeCatalog.open();
    await storeCatalog.addToCart(plan.title);
    await storeCartDrawer.close();
    await storeCatalog.getForFree(guide.title);

    // act
    await storeCartDrawer.continueToPayment(visitorEmail);
    const sessionId = await stripeCheckout.waitForOpenedSessionId();
    registerCheckoutSessionForCleanup(sessionId);

    // assert
    await stripeCheckout.expectLockedEmail(visitorEmail);
    await stripeCheckout.expectLineItem(plan.title, "€39.00");
    await stripeCheckout.expectNoLineItem(guide.title);

    // act
    await stripeCheckout.payStoreOrderWithTestCard(CARDHOLDER_NAME);

    // assert
    await storeOrderComplete.expectConfirmedFor(visitorEmail);
    await storeOrderComplete.expectPaidLine(plan.title, "€39.00");
    await storeOrderComplete.expectFreeLine(guide.title);
    await storeOrderComplete.expectTotal("€39.00");
    expect(await subjectsTo(visitorEmail)).toEqual([]);

    // act
    const delivery = await deliverCheckoutCompleted({
      baseURL: E2E_APP_URL,
      sessionId,
    });
    const orderEmail = await emailTo(visitorEmail, ORDER_SUBJECT);
    await storeDownload.open(downloadLinkIn(orderEmail));
    const download = await storeDownload.download();

    // assert
    expect(delivery.status).toBe(200);
    expect(orderEmail.text).toContain(`${plan.title} — €39.00`);
    expect(orderEmail.text).toContain(guide.title);
    expect(orderEmail.attachmentNames).toEqual([TERMS_ATTACHMENT]);
    expect(download.suggestedFilename).toBe(BUNDLE_FILENAME);
    expect(download.archiveEntryNames).toEqual([
      `${plan.slug}/${plan.slug}.pdf`,
      `${guide.slug}/${guide.slug}.pdf`,
    ]);

    // act
    const redelivery = await deliverCheckoutCompleted({
      baseURL: E2E_APP_URL,
      sessionId,
    });

    // assert
    expect(redelivery.status).toBe(200);
    expect(await subjectsTo(visitorEmail)).toEqual([ORDER_SUBJECT]);
  },
);

test(
  "a visitor who leaves the payment page returns to her saved cart",
  { tag: "@critical" },
  async ({
    page,
    registerCheckoutSessionForCleanup,
    scenarioTag,
    storeCartDrawer,
    storeCatalog,
    storeProductRequests,
    stripeCheckout,
    visitorEmail,
  }) => {
    // arrange
    const plan = storeProductFieldsOf("Core Plan", scenarioTag, PLAN_PRICES);
    const guide = storeProductFieldsOf("Sleep Guide", scenarioTag, null);
    await storeProductRequests.publishAccepted(plan);
    await storeProductRequests.publishAccepted(guide);
    await storeCatalog.open();
    await storeCatalog.chooseCurrency("USD");
    await storeCatalog.addToCart(plan.title);
    await storeCartDrawer.close();
    await storeCatalog.getForFree(guide.title);
    await storeCartDrawer.continueToPayment(visitorEmail);
    registerCheckoutSessionForCleanup(
      await stripeCheckout.waitForOpenedSessionId(),
    );

    // act
    await stripeCheckout.goBack();

    // assert
    await storeCartDrawer.expectOpen();
    await storeCartDrawer.expectNotice(PAYMENT_NOT_COMPLETED);
    await storeCartDrawer.expectLinePrice(plan.title, "$45.00");
    await storeCartDrawer.expectFreeLine(guide.title);
    await expect(page).toHaveURL(new RegExp(`${STORE_PATH}$`));
  },
);
