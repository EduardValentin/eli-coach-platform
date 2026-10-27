import type { DatabaseClient } from "~/shared/database";
import type { ClientReach } from "@eli-coach-platform/domain/client";
import {
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  ReadNotificationBellUseCase,
  type NotificationExpirySource,
  type NotificationInbox,
  type NotificationIncidents,
} from "@eli-coach-platform/domain/notification";
import type { Clock } from "@eli-coach-platform/domain/shared";

import { NotificationBellController } from "~/features/notifications/api/notification-bell-controller.server";
import { PostgresNotificationInbox } from "~/features/notifications/data/postgres-notification-inbox.server";

export type NotificationsFeature = {
  notificationBell: NotificationBellController;
};

type NotificationInboxComposition = {
  handles: { inbox: NotificationInbox };
};

type NotificationsFeatureHandles = {
  clientReach: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  expirySources: readonly NotificationExpirySource[];
  inbox: NotificationInbox;
  incidents: NotificationIncidents;
};

export function composeNotificationInbox(handles: {
  database: DatabaseClient;
}): NotificationInboxComposition {
  return {
    handles: {
      inbox: new PostgresNotificationInbox({ database: handles.database }),
    },
  };
}

export function composeNotificationsFeature(
  handles: NotificationsFeatureHandles,
): NotificationsFeature {
  const ports = {
    clients: handles.clientReach,
    clock: handles.clock,
    inbox: handles.inbox,
  };

  return {
    notificationBell: new NotificationBellController({
      markAllNotificationsRead: new MarkAllNotificationsReadUseCase(ports),
      markNotificationRead: new MarkNotificationReadUseCase(ports),
      readNotificationBell: new ReadNotificationBellUseCase({
        ...ports,
        expirySources: handles.expirySources,
        incidents: handles.incidents,
      }),
    }),
  };
}
