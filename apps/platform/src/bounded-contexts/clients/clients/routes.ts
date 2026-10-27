import { relative } from "@react-router/dev/routes";

import {
  CLIENT_WELCOME_ROUTE_SEGMENT,
  CLIENTS_API_PATHS,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

export const clientsClientRoutes = [
  route(CLIENT_WELCOME_ROUTE_SEGMENT, "./ui/client/welcome/welcome-page.tsx"),
];

export const clientsApiRoutes = [
  route(
    CLIENTS_API_PATHS.invitation.slice(1),
    "./adapters/inbound/http/public/invitation.ts",
  ),
  route(
    CLIENTS_API_PATHS.invitationResends.slice(1),
    "./adapters/inbound/http/coach/invitation-resends.ts",
  ),
  route(
    CLIENTS_API_PATHS.ownIdentity.slice(1),
    "./adapters/inbound/http/client/own-client-identity.ts",
  ),
  route(
    `${CLIENTS_API_PATHS.clients.slice(1)}/:clientId/identity`,
    "./adapters/inbound/http/coach/coach-client-identity.ts",
  ),
];
