import { createContext, type RouterContext } from "react-router";

import type { NotificationsFeature } from "../notifications-composition.server";

export const notificationsContext: RouterContext<NotificationsFeature> =
  createContext<NotificationsFeature>();
