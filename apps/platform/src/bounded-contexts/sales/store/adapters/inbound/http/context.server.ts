import { createContext, type RouterContext } from "react-router";

import type { StoreAcquisitionController } from "~/bounded-contexts/sales/store/adapters/inbound/http/acquisitions/store-acquisition-controller.server";
import type { StoreCheckoutController } from "~/bounded-contexts/sales/store/adapters/inbound/http/checkouts/store-checkout-controller.server";
import type { StoreCatalogController } from "~/bounded-contexts/sales/store/adapters/inbound/http/catalog/store-catalog-controller.server";
import type { StoreCoverAssetController } from "~/bounded-contexts/sales/store/adapters/inbound/http/covers/store-cover-asset-controller.server";
import type { StoreDownloadController } from "~/bounded-contexts/sales/store/adapters/inbound/http/downloads/store-download-controller.server";
import type { StoreOrderController } from "~/bounded-contexts/sales/store/adapters/inbound/http/orders/store-order-controller.server";
import type { StoreProductManagementController } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/store-product-management-controller.server";

export type StoreFeature = {
  storeAcquisitionController: StoreAcquisitionController;
  storeCatalogController: StoreCatalogController;
  storeCheckoutController: StoreCheckoutController;
  storeCoverAssetController: StoreCoverAssetController;
  storeDownloadController: StoreDownloadController;
  storeOrderController: StoreOrderController;
  storeProductManagementController: StoreProductManagementController;
};

export const storeContext: RouterContext<StoreFeature> =
  createContext<StoreFeature>();
