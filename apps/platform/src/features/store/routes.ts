import { relative } from "@react-router/dev/routes";

import { STORE_API_PATHS, STORE_ROUTE_SEGMENT } from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const storePublicRoutes = [
  route(STORE_ROUTE_SEGMENT, "./ui/public/catalog-page.tsx"),
  route(`${STORE_ROUTE_SEGMENT}/download`, "./ui/public/download-page.tsx"),
  route(`${STORE_ROUTE_SEGMENT}/:slug`, "./ui/public/product-page.tsx"),
];

export const storeApiRoutes = [
  route(STORE_API_PATHS.catalog.slice(1), "./api/catalog.ts"),
  route(STORE_API_PATHS.acquisitions.slice(1), "./api/acquisitions.ts"),
  route(STORE_API_PATHS.downloads.slice(1), "./api/downloads.ts"),
  route(`${STORE_API_PATHS.covers.slice(1)}/:assetKey`, "./api/covers.ts"),
  route(
    "api/management/store/product-validations",
    "./api/management-product-validations.ts",
  ),
  route("api/management/store/products", "./api/management-products.ts"),
  route(
    "api/management/store/products/:productId",
    "./api/management-product.ts",
  ),
  route(
    "api/management/store/products/:productId/versions",
    "./api/management-product-versions.ts",
  ),
];
