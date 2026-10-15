import { z } from "zod";

import type { AccountSession, PlatformRig } from "./platform-rig";

const NOTIFICATIONS_API = "/api/notifications";

const bellSchema = z.object({
  notifications: z.array(
    z.object({
      id: z.uuid(),
      kind: z.string(),
      facts: z.record(z.string(), z.union([z.string(), z.number()])),
      arrivedAt: z.iso.datetime(),
      unread: z.boolean(),
    }),
  ),
  unreadCount: z.number(),
  checkedAt: z.iso.datetime(),
});

export type Bell = z.infer<typeof bellSchema>;

export type BellEntry = Bell["notifications"][number];

export class NotificationsJourney {
  constructor(private readonly rig: PlatformRig) {}

  bell(session: AccountSession): Promise<Response> {
    return this.rig.requestAs(session, NOTIFICATIONS_API);
  }

  signedOutBell(): Promise<Response> {
    return this.rig.suite.request(
      new Request(this.rig.suite.url(NOTIFICATIONS_API)),
    );
  }

  async bellOf(session: AccountSession): Promise<Bell> {
    const response = await this.bell(session);

    if (response.status !== 200) {
      throw new Error(`Reading the bell answered ${response.status}.`);
    }

    return bellSchema.parse(await response.json());
  }

  async entriesOf(
    session: AccountSession,
    kind?: string,
  ): Promise<BellEntry[]> {
    const { notifications } = await this.bellOf(session);

    return kind === undefined
      ? notifications
      : notifications.filter((notification) => notification.kind === kind);
  }

  markRead(session: AccountSession, notificationId: string): Promise<Response> {
    return this.rig.requestAs(
      session,
      `${NOTIFICATIONS_API}/${notificationId}/read`,
      { method: "POST" },
    );
  }

  markAllRead(session: AccountSession): Promise<Response> {
    return this.rig.requestAs(session, `${NOTIFICATIONS_API}/read-all`, {
      method: "POST",
    });
  }
}
