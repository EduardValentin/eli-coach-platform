import { z } from "zod";

export const serviceMetadataSchema = z.object({
  appName: z.string(),
  environment: z.string(),
  service: z.string(),
  version: z.string(),
});

export const healthStatusSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
});

export const notificationEventSchema = z.object({
  type: z.enum(["message.created", "plan.updated", "checkin.scheduled"]),
  entityId: z.string(),
  createdAt: z.string(),
});

export type ServiceMetadata = z.infer<typeof serviceMetadataSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type NotificationEvent = z.infer<typeof notificationEventSchema>;
