import { relative } from "@react-router/dev/routes";

import { STORE_API_PATHS, STORE_ROUTE_SEGMENT } from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const storePublicRoutes = [
  route(STORE_ROUTE_SEGMENT, "./ui/public/catalog/catalog-page.tsx"),
  route(
    `${STORE_ROUTE_SEGMENT}/download`,
    "./ui/public/download/download-page.tsx",
  ),
  route(`${STORE_ROUTE_SEGMENT}/:slug`, "./ui/public/product/product-page.tsx"),
];

export const storeApiRoutes = [
  route(STORE_API_PATHS.catalog.slice(1), "./api/catalog/catalog.ts"),
  route(
    STORE_API_PATHS.acquisitions.slice(1),
    "./api/acquisitions/acquisitions.ts",
  ),
  route(STORE_API_PATHS.downloads.slice(1), "./api/downloads/downloads.ts"),
  route(
    `${STORE_API_PATHS.covers.slice(1)}/:assetKey`,
    "./api/covers/covers.ts",
  ),
  route(
    "api/management/store/product-validations",
    "./api/management/management-product-validations.ts",
  ),
  route(
    "api/management/store/products",
    "./api/management/management-products.ts",
  ),
  route(
    "api/management/store/products/:productId",
    "./api/management/management-product.ts",
  ),
  route(
    "api/management/store/products/:productId/versions",
    "./api/management/management-product-versions.ts",
  ),
];
