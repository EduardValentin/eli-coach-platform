import type {
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  NotificationBell,
  NotificationReader,
  ReadNotificationBellUseCase,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import {
  notificationBellSchema,
  type NotificationBellReply,
} from "~/bounded-contexts/clients/notifications/public/notifications";
import { accessContext } from "~/bounded-contexts/access/public/session";

type NotificationBellControllerOptions = {
  markAllNotificationsRead: MarkAllNotificationsReadUseCase;
  markNotificationRead: MarkNotificationReadUseCase;
  readNotificationBell: ReadNotificationBellUseCase;
};

type MarkResult = "marked" | "unknown";

const notificationIdSchema = z.uuid();

export class NotificationBellController {
  constructor(private readonly options: NotificationBellControllerOptions) {}

  async loadBell(args: LoaderFunctionArgs): Promise<NotificationBellReply> {
    const bell = await this.options.readNotificationBell.execute(
      this.requireReader(args),
    );

    return this.replyOf(bell);
  }

  async respondWithBell(args: LoaderFunctionArgs): Promise<Response> {
    return Response.json(await this.loadBell(args), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  async markRead(
    args: ActionFunctionArgs,
    notificationId: string | undefined,
  ): Promise<Response> {
    const reader = this.requireReader(args);
    const id = notificationIdSchema.safeParse(notificationId);

    if (!id.success) {
      return this.respondToMark("unknown");
    }

    return this.respondToMark(
      await this.options.markNotificationRead.execute({
        reader,
        notificationId: id.data,
      }),
    );
  }

  async markAllRead(args: ActionFunctionArgs): Promise<Response> {
    return this.respondToMark(
      await this.options.markAllNotificationsRead.execute(
        this.requireReader(args),
      ),
    );
  }

  private replyOf(bell: NotificationBell): NotificationBellReply {
    return notificationBellSchema.parse({
      notifications: bell.notifications.map((notification) => ({
        id: notification.id,
        kind: notification.kind,
        facts: notification.facts,
        arrivedAt: notification.arrivedAt.toISOString(),
        unread: notification.unread,
      })),
      unreadCount: bell.unreadCount,
      checkedAt: bell.checkedAt.toISOString(),
    });
  }

  private respondToMark(result: MarkResult): Response {
    return result === "marked"
      ? Response.json({ status: "marked" })
      : Response.json({ error: "unknown_notification" }, { status: 404 });
  }

  private requireReader(args: LoaderFunctionArgs): NotificationReader {
    const account = args.context.get(accessContext).requireAccount();

    args.context.get(accessContext).requirePortalAccess(account.role);

    return account.role === "COACH"
      ? { party: "coach" }
      : { party: "client", authSubjectId: account.authSubjectId };
  }
}
