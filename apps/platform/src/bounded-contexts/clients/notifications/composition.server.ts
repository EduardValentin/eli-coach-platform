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
  handles: { inbox: NotificationInboxPort };
};

type NotificationsFeatureHandles = {
  clientReach: ClientReachPort;
  clock: ClockPort;
  inbox: NotificationInboxPort;
  logger: LoggerPort;
};

export function composeNotificationInbox(handles: {
  database: DatabaseClient;
}): NotificationInboxComposition {
  return {
    handles: {
      inbox: new PostgresNotificationInboxRepository({
        database: handles.database,
      }),
    },
  };
}

export function composeNotificationsFeature(
  handles: NotificationsFeatureHandles,
): NotificationsFeature {
  const incidents = new NotificationsIncidentsAdapter(handles.logger);
  const ports = {
    clients: new ClientsClientReachAdapter(handles.clientReach),
    clock: handles.clock,
    inbox: handles.inbox,
  };

  return {
    notificationBell: new NotificationBellController({
      markAllNotificationsRead: new MarkAllNotificationsReadUseCase(ports),
      markNotificationRead: new MarkNotificationReadUseCase(ports),
      readNotificationBell: new ReadNotificationBellUseCase({
        ...ports,
        incidents,
      }),
    }),
  };
}
