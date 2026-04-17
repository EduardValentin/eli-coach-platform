import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("./routes/marketing/layout.tsx", [
    index("./routes/marketing/home.tsx"),
    route("blog", "./routes/marketing/blog.tsx"),
    route("store", "./routes/marketing/store.tsx"),
  ]),
  route("readyz", "./routes/internal/readyz.ts"),
  route("api/meta", "./routes/internal/api.meta.ts"),
  route("api/feature-flags", "./routes/internal/api.feature-flags.ts"),
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
