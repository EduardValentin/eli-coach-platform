import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("./surfaces/public-site/shell/layout.tsx", [
    index("./surfaces/public-site/pages/home.tsx"),
    route("403", "./surfaces/public-site/pages/access-denied.tsx"),
    route("blog", "./surfaces/public-site/pages/blog.tsx"),
    route("pricing", "./surfaces/public-site/pages/pricing.tsx"),
    route("privacy", "./surfaces/public-site/pages/privacy.tsx"),
    route("sign-in-failed", "./surfaces/public-site/pages/sign-in-failed.tsx"),
    route("terms", "./surfaces/public-site/pages/terms.tsx"),
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
  route("auth/sign-in", "./features/accounts/api/auth-sign-in.ts"),
  route("auth/complete", "./features/accounts/api/auth-complete.ts"),
  route("api/session", "./features/accounts/api/session.ts"),
  route("api/auth/config", "./features/accounts/api/identity-config.ts"),
  route("api/auth/clerk-webhook", "./features/accounts/api/clerk-webhook.ts"),
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
  // Both portals' resource routes sit outside their guarded layouts. Middleware
  // runs for every route in the matched branch, unlike a loader, which resource
  // routes skip — and a readiness probe and a PWA manifest have to answer
  // without a session.
  route("client/manifest.webmanifest", "./surfaces/client-portal/api/manifest.ts"),
  route("client/readyz", "./surfaces/client-portal/api/readyz.ts"),
  route("client", "./surfaces/client-portal/shell/layout.tsx", [
    index("./surfaces/client-portal/pages/home.tsx"),
  ]),
  route("coach/manifest.webmanifest", "./surfaces/coach-portal/api/manifest.ts"),
  route("coach/readyz", "./surfaces/coach-portal/api/readyz.ts"),
  route("coach", "./surfaces/coach-portal/shell/layout.tsx", [
    index("./surfaces/coach-portal/pages/home.tsx"),
  ]),
] satisfies RouteConfig;
