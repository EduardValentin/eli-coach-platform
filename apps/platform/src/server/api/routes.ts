import { relative } from "@react-router/dev/routes";

const { route } = relative(import.meta.dirname);

export const platformApiRoutes = [
  route("readyz", "./readyz/readyz.ts"),
  route("api/meta", "./meta/meta.ts"),
  route("api/feature-flags", "./feature-flags/feature-flags.ts"),
];
