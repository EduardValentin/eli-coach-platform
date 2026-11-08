import type { StorePrice } from "~/bounded-contexts/sales/store/public/store-currency";

import { subjectsTo } from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { resolveRunId } from "../support/run-id";
import type { StoreProductListing } from "../support/store-product-requests";

const RUN_ID = resolveRunId();
const PLAN_PRICES: StorePrice = { eurCents: 3900, usdCents: 4500 };
const RAISED_PLAN_PRICES: StorePrice = { eurCents: 4900, usdCents: 5500 };
const NOT_SENT =
  "We couldn't send your resources right now. Your cart is saved, so please try again.";

function listingOf(
  name: string,
  scenarioTag: string,
  prices: StorePrice | null,
): StoreProductListing {
  return {
    slug: `${name.toLowerCase().replaceAll(" ", "-")}-${RUN_ID}-${scenarioTag}`,
    title: `${name} ${scenarioTag}`,
    prices,
  };
}

test(
  "a visitor sees a paid plan in her chosen currency across the store, the product page and the cart",
  { tag: "@critical" },
  async ({
    page,
    scenarioTag,
    storeCartDrawer,
    storeCatalog,
    storeProduct,
    storeProductRequests,
  }) => {
    // arrange
    const plan = listingOf("Glute Plan", scenarioTag, PLAN_PRICES);
    const guide = listingOf("Mobility Guide", scenarioTag, null);
    await storeProductRequests.publishAccepted(plan);
    await storeProductRequests.publishAccepted(guide);

    // act
    await storeCatalog.open();

    // assert
    await storeCatalog.expectPlanAt(plan.title, "€39.00");

    // act
    await storeCatalog.chooseCurrency("USD");

    // assert
    await storeCatalog.expectPlanAt(plan.title, "$45.00");

    // act
    await page.reload();

    // assert
    await storeCatalog.expectPlanAt(plan.title, "$45.00");

    // act
    await storeProduct.open(plan.slug);

    // assert
    await storeProduct.expectPrice("$45.00");

    // act
    await storeProduct.addToCart(plan.title);
    await storeCartDrawer.close();
    await storeCatalog.open();
    await storeCatalog.getForFree(guide.title);

    // assert
    await storeCartDrawer.expectLinePrice(plan.title, "$45.00");
    await storeCartDrawer.expectFreeLine(guide.title);
    await storeCartDrawer.expectTotal("$45.00");
  },
);

test(
  "a price change moves a product from the plans to the free resources and back",
  { tag: "@completeness" },
  async ({ page, scenarioTag, storeCatalog, storeProductRequests }) => {
    // arrange
    const plan = listingOf("Hormone Plan", scenarioTag, PLAN_PRICES);
    const productId = await storeProductRequests.publishAccepted(plan);

    // act
    await storeCatalog.open();

    // assert
    await storeCatalog.expectPlanAt(plan.title, "€39.00");

    // act
    await storeProductRequests.changePricesAccepted(productId, null);
    await page.reload();

    // assert
    await storeCatalog.expectFreeResource(plan.title);

    // act
    await storeProductRequests.changePricesAccepted(
      productId,
      RAISED_PLAN_PRICES,
    );
    await page.reload();

    // assert
    await storeCatalog.expectPlanAt(plan.title, "€49.00");
  },
);

test(
  "a free request whose cart holds a paid plan is refused and sends no email",
  { tag: "@completeness" },
  async ({
    scenarioTag,
    storeCartDrawer,
    storeCatalog,
    storeProductRequests,
    visitorEmail,
  }) => {
    // arrange
    const plan = listingOf("Strength Plan", scenarioTag, PLAN_PRICES);
    const guide = listingOf("Recovery Guide", scenarioTag, null);
    await storeProductRequests.publishAccepted(plan);
    await storeProductRequests.publishAccepted(guide);
    await storeCatalog.open();
    await storeCatalog.addToCart(plan.title);
    await storeCartDrawer.close();
    await storeCatalog.getForFree(guide.title);

    // act
    await storeCartDrawer.completeOrder(visitorEmail);

    // assert
    await storeCartDrawer.expectAlert(NOT_SENT);
    expect(await subjectsTo(visitorEmail)).toEqual([]);
  },
);
