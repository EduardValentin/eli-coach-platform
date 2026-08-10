import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("./surfaces/public-site/shell/layout.tsx", [
    index("./surfaces/public-site/pages/home.tsx"),
    route("blog", "./surfaces/public-site/pages/blog.tsx"),
    route("pricing", "./surfaces/public-site/pages/pricing.tsx"),
    route("privacy", "./surfaces/public-site/pages/privacy.tsx"),
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
  route("api/waitlist", "./features/waitlist/api/waitlist.ts"),
  route("api/store/catalog", "./features/store/api/catalog.ts"),
  route("api/store/acquisitions", "./features/store/api/acquisitions.ts"),
  route("api/store/downloads", "./features/store/api/downloads.ts"),
  route("api/store/covers/:assetKey", "./features/store/api/covers.ts"),
  route("client", "./routes/client/layout.tsx", [
    index("./routes/client/home.tsx"),
    route("manifest.webmanifest", "./routes/client/manifest.ts"),
    route("readyz", "./routes/client/readyz.ts"),
  ]),
  route("coach", "./routes/coach/layout.tsx", [
    index("./routes/coach/home.tsx"),
    route("manifest.webmanifest", "./routes/coach/manifest.ts"),
    route("readyz", "./routes/coach/readyz.ts"),
  ]),
] satisfies RouteConfig;
