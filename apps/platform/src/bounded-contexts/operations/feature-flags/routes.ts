import { relative } from "@react-router/dev/routes";

const { route } = relative(import.meta.dirname);

export const featureFlagsApiRoutes = [
  route("api/feature-flags", "./adapters/inbound/http/feature-flags.ts"),
];
