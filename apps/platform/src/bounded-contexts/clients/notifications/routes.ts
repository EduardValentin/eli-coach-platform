import { relative } from "@react-router/dev/routes";

import { NOTIFICATIONS_API_PATHS } from "./public/paths";

const { route } = relative(import.meta.dirname);

export const notificationsApiRoutes = [
  route(
    NOTIFICATIONS_API_PATHS.bell.slice(1),
    "./adapters/inbound/http/bell.ts",
  ),
  route(
    NOTIFICATIONS_API_PATHS.readAll.slice(1),
    "./adapters/inbound/http/read-all.ts",
  ),
  route(
    NOTIFICATIONS_API_PATHS.read.slice(1),
    "./adapters/inbound/http/read.ts",
  ),
];
