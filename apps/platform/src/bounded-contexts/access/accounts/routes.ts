import { relative } from "@react-router/dev/routes";

const { route } = relative(import.meta.dirname);

export const accountsApiRoutes = [
  route("api/account", "./adapters/inbound/http/account.ts"),
  route("api/clerk/webhooks", "./adapters/inbound/http/clerk-webhooks.ts"),
];
