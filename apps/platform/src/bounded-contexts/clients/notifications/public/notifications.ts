import type { NotificationParty } from "~/bounded-contexts/clients/notifications/domain/notification";
import { z } from "zod";

const notificationSchema = z.object({
  id: z.uuid(),
  kind: z.string(),
  facts: z.record(z.string(), z.union([z.string(), z.number()])),
  arrivedAt: z.iso.datetime(),
  unread: z.boolean(),
});

export const notificationBellSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
  checkedAt: z.iso.datetime(),
});

export type NotificationReply = z.infer<typeof notificationSchema>;

export type NotificationBellReply = z.infer<typeof notificationBellSchema>;

export type NotificationReading = {
  party: NotificationParty;
  timeZone: string;
};

export type DescribedNotification = {
  title: string;
  line: string;
  href: string;
};

export type NotificationDescriber = (
  notification: NotificationReply,
  reading: NotificationReading,
) => DescribedNotification | null;
