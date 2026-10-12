import { relative } from "@react-router/dev/routes";

import {
  CLIENT_WELCOME_ROUTE_SEGMENT,
  CLIENTS_API_PATHS,
  COACH_CLIENTS_ROUTE_SEGMENT,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

export const clientsClientRoutes = [
  route(CLIENT_WELCOME_ROUTE_SEGMENT, "./ui/client/welcome/welcome-page.tsx"),
];

export const clientsCoachRoutes = [
  route(COACH_CLIENTS_ROUTE_SEGMENT, "./ui/coach/clients/clients-page.tsx"),
];

export const clientsApiRoutes = [
  route(CLIENTS_API_PATHS.invitation.slice(1), "./api/public/invitation.ts"),
  route(
    CLIENTS_API_PATHS.invitationResends.slice(1),
    "./api/coach/invitation-resends.ts",
  ),
];
