import { z } from "zod";

const INVITATION_TOKEN_MAX_LENGTH = 256;

export const invitationResolutionRequestSchema = z.object({
  token: z.string().min(1).max(INVITATION_TOKEN_MAX_LENGTH),
});

export const invitationResolutionSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("valid"),
    email: z.string().min(1),
    continueUrl: z.httpUrl(),
  }),
  z.object({ state: z.literal("unavailable") }),
]);

export type InvitationResolution = z.infer<typeof invitationResolutionSchema>;
