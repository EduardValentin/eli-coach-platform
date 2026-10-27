import type { DatabaseClient } from "~/shared/database";
import type { ClientReach } from "~/bounded-contexts/clients/clients/domain/client";
import {
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  ReadNotificationBellUseCase,
  type NotificationExpirySource,
  type NotificationInbox,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import type { Clock } from "~/bounded-contexts/clients/notifications/domain/clock";

import { NotificationBellController } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/notification-bell-controller.server";
import { PostgresNotificationInbox } from "~/bounded-contexts/clients/notifications/adapters/outbound/persistence/postgres-notification-inbox.server";
import type { NotificationsFeature } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createNotificationsIncidents } from "~/bounded-contexts/clients/notifications/adapters/outbound/logging/notifications-incidents.server";

type NotificationInboxComposition = {
  handles: { inbox: NotificationInbox };
};

type NotificationsFeatureHandles = {
  clientReach: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  expirySources: readonly NotificationExpirySource[];
  inbox: NotificationInbox;
  logger: Logger;
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
  const incidents = createNotificationsIncidents(handles.logger);
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
        incidents,
      }),
    }),
  };
}
