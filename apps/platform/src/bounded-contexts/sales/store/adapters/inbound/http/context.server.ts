import { createContext, type RouterContext } from "react-router";

import type { StoreAcquisitionController } from "~/bounded-contexts/sales/store/adapters/inbound/http/acquisitions/acquisitions-controller.server";
import type { StoreCatalogController } from "~/bounded-contexts/sales/store/adapters/inbound/http/catalog/catalog-controller.server";
import type { StoreCoverAssetController } from "~/bounded-contexts/sales/store/adapters/inbound/http/covers/covers-controller.server";
import type { StoreDownloadController } from "~/bounded-contexts/sales/store/adapters/inbound/http/downloads/downloads-controller.server";
import type { StoreProductManagementController } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-controller.server";

export type StoreFeature = {
  acquisitions: StoreAcquisitionController;
  catalog: StoreCatalogController;
  covers: StoreCoverAssetController;
  downloads: StoreDownloadController;
  management: StoreProductManagementController;
};

export const storeContext: RouterContext<StoreFeature> =
  createContext<StoreFeature>();
