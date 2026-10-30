import type { DatabaseClient } from "~/shared/database";
import type { ClientReachPort } from "~/bounded-contexts/clients/clients/public";
import {
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  ReadNotificationBellUseCase,
  type NotificationInboxPort,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import type { ClockPort } from "~/bounded-contexts/clients/notifications/domain/clock-port";

import { NotificationBellController } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/notification-bell-controller.server";
import { PostgresNotificationInboxRepository } from "~/bounded-contexts/clients/notifications/adapters/outbound/persistence/postgres-notification-inbox-repository.server";
import { ClientsClientReachAdapter } from "~/bounded-contexts/clients/notifications/adapters/outbound/clients/clients-client-reach-adapter.server";
import type { NotificationsFeature } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { NotificationsIncidentsAdapter } from "~/bounded-contexts/clients/notifications/adapters/outbound/logging/notifications-incidents-adapter.server";

type NotificationInboxComposition = {
  handles: { notificationInboxPort: NotificationInboxPort };
};

type NotificationsFeatureHandles = {
  clientReachPort: ClientReachPort;
  clockPort: ClockPort;
  notificationInboxPort: NotificationInboxPort;
  loggerPort: LoggerPort;
};

export function composeNotificationInbox(handles: {
  database: DatabaseClient;
}): NotificationInboxComposition {
  return {
    handles: {
      notificationInboxPort: new PostgresNotificationInboxRepository({
        database: handles.database,
      }),
    },
  };
}

export function composeNotificationsFeature(
  handles: NotificationsFeatureHandles,
): NotificationsFeature {
  const notificationsIncidentsAdapter = new NotificationsIncidentsAdapter(
    handles.loggerPort,
  );
  const ports = {
    clientReachPort: new ClientsClientReachAdapter(handles.clientReachPort),
    clockPort: handles.clockPort,
    notificationInboxPort: handles.notificationInboxPort,
  };

  return {
    notificationBellController: new NotificationBellController({
      markAllNotificationsReadUseCase: new MarkAllNotificationsReadUseCase(
        ports,
      ),
      markNotificationReadUseCase: new MarkNotificationReadUseCase(ports),
      readNotificationBellUseCase: new ReadNotificationBellUseCase({
        ...ports,
        notificationIncidentsPort: notificationsIncidentsAdapter,
      }),
    }),
  };
}
