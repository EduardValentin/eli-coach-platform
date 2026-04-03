import { z } from "zod";

export const notificationEventSchema = z.object({
  type: z.enum(["message.created", "plan.updated", "checkin.scheduled"]),
  entityId: z.string(),
  createdAt: z.string(),
});

export type NotificationEvent = z.infer<typeof notificationEventSchema>;
