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

export type NotificationBellReply = z.infer<typeof notificationBellSchema>;
