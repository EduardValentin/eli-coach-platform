import type { ClientJourneyStep } from "@eli-coach-platform/domain/client-journey";
import { z } from "zod";

import { CLIENT_ONBOARDING_PATH, CLIENT_WELCOME_PATH } from "./paths";

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

export const FINISH_ONBOARDING_LABEL = "Finish your onboarding";

const CLIENT_JOURNEY_PATH_BY_STEP = {
  onboarding: CLIENT_ONBOARDING_PATH,
  welcome: CLIENT_WELCOME_PATH,
} satisfies Record<ClientJourneyStep, string>;

const CLIENT_JOURNEY_OPEN_PATHS_BY_STEP = {
  onboarding: [CLIENT_ONBOARDING_PATH],
  welcome: [CLIENT_WELCOME_PATH, CLIENT_ONBOARDING_PATH],
} satisfies Record<ClientJourneyStep, readonly string[]>;

export function clientJourneyDestination(step: ClientJourneyStep): string {
  return CLIENT_JOURNEY_PATH_BY_STEP[step];
}

export function clientJourneyOpenPaths(
  step: ClientJourneyStep,
): readonly string[] {
  return CLIENT_JOURNEY_OPEN_PATHS_BY_STEP[step];
}

export const welcomePageSchema = z.object({
  firstName: z.string().min(1),
  wording: z.enum(["five-part", "four-part"]),
});

export type WelcomePage = z.infer<typeof welcomePageSchema>;
