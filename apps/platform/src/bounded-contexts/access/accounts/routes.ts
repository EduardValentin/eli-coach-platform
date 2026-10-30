import { relative } from "@react-router/dev/routes";

import { INVITATION_RESOLUTION_API_PATH } from "../public/paths";

const { route } = relative(import.meta.dirname);

export const accountsApiRoutes = [
  route("api/account", "./adapters/inbound/http/account.ts"),
  route("api/clerk/webhooks", "./adapters/inbound/http/clerk-webhooks.ts"),
  route(
    INVITATION_RESOLUTION_API_PATH.slice(1),
    "./adapters/inbound/http/public-site/invitation.ts",
  ),
];
