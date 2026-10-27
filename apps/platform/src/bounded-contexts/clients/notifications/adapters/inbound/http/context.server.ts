import { createContext, type RouterContext } from "react-router";

import type { NotificationBellController } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/notification-bell-controller.server";

export type NotificationsFeature = {
  notificationBell: NotificationBellController;
};

export const notificationsContext: RouterContext<NotificationsFeature> =
  createContext<NotificationsFeature>();
