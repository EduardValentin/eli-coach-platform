import type { StorePrice } from "~/bounded-contexts/sales/store/public/store-currency";

import { test } from "../support/fixtures";
import { resolveRunId } from "../support/run-id";
import type { StoreProductFields } from "../support/store-product-requests";

const RUN_ID = resolveRunId();
const PLAN_PRICES: StorePrice = { eurCents: 3900, usdCents: 4500 };
const RAISED_PLAN_PRICES: StorePrice = { eurCents: 4900, usdCents: 5500 };

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
    const plan = storeProductFieldsOf("Glute Plan", scenarioTag, PLAN_PRICES);
    const guide = storeProductFieldsOf("Mobility Guide", scenarioTag, null);
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
    const plan = storeProductFieldsOf("Hormone Plan", scenarioTag, PLAN_PRICES);
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
