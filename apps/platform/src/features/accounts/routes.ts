import { relative } from "@react-router/dev/routes";

import { SIGN_IN_FAILED_ROUTE_SEGMENT } from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const accountsPublicRoutes = [
  route(SIGN_IN_FAILED_ROUTE_SEGMENT, "./ui/public/sign-in-failed-page.tsx"),
];

export const accountsApiRoutes = [
  route("api/account", "./api/account.ts"),
  route("api/clerk/webhooks", "./api/clerk-webhooks.ts"),
];
