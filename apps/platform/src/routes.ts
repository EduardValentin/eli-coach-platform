import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("./surfaces/public-site/shell/layout.tsx", [
    index("./surfaces/public-site/pages/home.tsx"),
    route("blog", "./surfaces/public-site/pages/blog.tsx"),
    route("pricing", "./surfaces/public-site/pages/pricing.tsx"),
    route("privacy", "./surfaces/public-site/pages/privacy.tsx"),
    route("terms", "./surfaces/public-site/pages/terms.tsx"),
    route(
      "sign-in-failed",
      "./features/accounts/ui/public/sign-in-failed-page.tsx",
    ),
    route("store", "./features/store/ui/public/catalog-page.tsx"),
    route("store/download", "./features/store/ui/public/download-page.tsx"),
    route("store/:slug", "./features/store/ui/public/product-page.tsx"),
  ]),
  route("readyz", "./server/api/readyz.ts"),
  route("api/meta", "./server/api/meta.ts"),
  route("api/feature-flags", "./server/api/feature-flags.ts"),
  route(
    "api/bot-detection",
    "./server/api/bot-detection.ts",
  ),
  route("api/waitlist", "./features/waitlist/api/waitlist.ts"),
  route("api/store/catalog", "./features/store/api/catalog.ts"),
  route("api/store/acquisitions", "./features/store/api/acquisitions.ts"),
  route("api/store/downloads", "./features/store/api/downloads.ts"),
  route("api/store/covers/:assetKey", "./features/store/api/covers.ts"),
  route(
    "api/management/store/product-validations",
    "./features/store/api/management-product-validations.ts",
  ),
  route(
    "api/management/store/products",
    "./features/store/api/management-products.ts",
  ),
  route(
    "api/management/store/products/:productId",
    "./features/store/api/management-product.ts",
  ),
  route(
    "api/management/store/products/:productId/versions",
    "./features/store/api/management-product-versions.ts",
  ),
  route("client", "./surfaces/client-portal/shell/layout.tsx", [
    index("./surfaces/client-portal/pages/home.tsx"),
  ]),
  // Deploy healthchecks and PWA installs read these without a session, so
  // they sit outside the guarded "client" route rather than as its children
  // — nesting them there would run the portal's access-guard loader first.
  route(
    "client/manifest.webmanifest",
    "./surfaces/client-portal/api/manifest.ts",
  ),
  route("client/readyz", "./surfaces/client-portal/api/readyz.ts"),
  route("coach", "./surfaces/coach-portal/shell/layout.tsx", [
    index("./surfaces/coach-portal/pages/home.tsx"),
  ]),
  route(
    "coach/manifest.webmanifest",
    "./surfaces/coach-portal/api/manifest.ts",
  ),
  route("coach/readyz", "./surfaces/coach-portal/api/readyz.ts"),
] satisfies RouteConfig;
