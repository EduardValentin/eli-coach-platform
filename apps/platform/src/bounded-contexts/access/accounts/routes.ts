import { relative } from "@react-router/dev/routes";

const { route } = relative(import.meta.dirname);

export const accountsApiRoutes = [
  route("api/account", "./api/account.ts"),
  route("api/clerk/webhooks", "./api/clerk-webhooks.ts"),
];
