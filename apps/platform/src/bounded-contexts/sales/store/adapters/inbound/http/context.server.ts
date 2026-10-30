import { createContext, type RouterContext } from "react-router";

import type { StoreAcquisitionController } from "~/bounded-contexts/sales/store/adapters/inbound/http/acquisitions/store-acquisition-controller.server";
import type { StoreCatalogController } from "~/bounded-contexts/sales/store/adapters/inbound/http/catalog/store-catalog-controller.server";
import type { StoreCoverAssetController } from "~/bounded-contexts/sales/store/adapters/inbound/http/covers/store-cover-asset-controller.server";
import type { StoreDownloadController } from "~/bounded-contexts/sales/store/adapters/inbound/http/downloads/store-download-controller.server";
import type { StoreProductManagementController } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/store-product-management-controller.server";

export type StoreFeature = {
  acquisitions: StoreAcquisitionController;
  catalog: StoreCatalogController;
  covers: StoreCoverAssetController;
  downloads: StoreDownloadController;
  management: StoreProductManagementController;
};

export const storeContext: RouterContext<StoreFeature> =
  createContext<StoreFeature>();
