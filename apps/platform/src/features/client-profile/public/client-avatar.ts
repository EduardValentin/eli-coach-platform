import { z } from "zod";

export const CLIENT_AVATAR_FIELD = "avatar";

export const clientAvatarUrlSchema = z.string().nullable();

export type ClientAvatarUrl = z.infer<typeof clientAvatarUrlSchema>;

export const clientAvatarUrlsSchema = z.record(
  z.string(),
  clientAvatarUrlSchema,
);

export type ClientAvatarUrls = z.infer<typeof clientAvatarUrlsSchema>;

export const clientAvatarWrittenAnswerSchema = z.object({
  status: z.enum(["uploaded", "removed"]),
});

export const clientAvatarRefusalSchema = z.object({
  error: z.enum([
    "not-found",
    "not-on-journey",
    "ended",
    "not-accepted",
    "rendition-refused",
    "too-large",
  ]),
});

export type ClientAvatarRefusal = z.infer<typeof clientAvatarRefusalSchema>;
