const NOTIFICATIONS_API = "/api/notifications";

export const NOTIFICATIONS_API_PATHS = {
  bell: NOTIFICATIONS_API,
  read: `${NOTIFICATIONS_API}/:notificationId/read`,
  readAll: `${NOTIFICATIONS_API}/read-all`,
} as const;
