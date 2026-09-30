import type { ClientJourneyStep } from "@eli-coach-platform/domain/client-journey";
import { z } from "zod";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";

import { CLIENT_ONBOARDING_PATH, CLIENT_WELCOME_PATH } from "./paths";

const FINISH_ONBOARDING_LABEL = "Finish your onboarding";

const ONBOARDING_JOURNEY_PATHS: readonly string[] = [
  CLIENT_WELCOME_PATH,
  CLIENT_ONBOARDING_PATH,
];

type ClientJourneyGate = {
  destination: string;
  admits: (requestedPath: string) => boolean;
};

const SUBMITTED_GATE: ClientJourneyGate = {
  destination: CLIENT_PORTAL_PATH,
  admits: (requestedPath) => !ONBOARDING_JOURNEY_PATHS.includes(requestedPath),
};

const CLIENT_JOURNEY_GATE_BY_STEP = {
  welcome: {
    destination: CLIENT_WELCOME_PATH,
    admits: (requestedPath) => ONBOARDING_JOURNEY_PATHS.includes(requestedPath),
  },
  onboarding: {
    destination: CLIENT_ONBOARDING_PATH,
    admits: (requestedPath) => requestedPath === CLIENT_ONBOARDING_PATH,
  },
  submitted: SUBMITTED_GATE,
  "in-review": SUBMITTED_GATE,
  "needs-details": {
    destination: CLIENT_PORTAL_PATH,
    admits: (requestedPath) =>
      SUBMITTED_GATE.admits(requestedPath) ||
      requestedPath === CLIENT_ONBOARDING_PATH,
  },
  approved: SUBMITTED_GATE,
} satisfies Record<ClientJourneyStep, ClientJourneyGate>;

export function clientJourneyRedirect(
  step: ClientJourneyStep,
  requestedPath: string,
): string | null {
  const gate = CLIENT_JOURNEY_GATE_BY_STEP[step];

  return gate.admits(requestedPath) ? null : gate.destination;
}

export function clientJourneyPortalLink(
  step: ClientJourneyStep,
): { href: string; label: string } | null {
  if (isAfterSubmission(step)) {
    return null;
  }

  return {
    href: CLIENT_JOURNEY_GATE_BY_STEP[step].destination,
    label: FINISH_ONBOARDING_LABEL,
  };
}

const PROGRAM_STATUS_KINDS = [
  "submitted",
  "in-review",
  "needs-details",
  "approved",
] as const satisfies readonly ClientJourneyStep[];

export type ProgramStatusKind = (typeof PROGRAM_STATUS_KINDS)[number];

function isAfterSubmission(step: ClientJourneyStep): boolean {
  return PROGRAM_STATUS_KINDS.some((kind) => kind === step);
}

export const programStatusSchema = z.object({
  kind: z.enum(PROGRAM_STATUS_KINDS),
  submittedAt: z.iso.datetime(),
  workStartsOn: z.iso.datetime().nullable(),
});

export type ProgramStatus = z.infer<typeof programStatusSchema>;

export const welcomePageSchema = z.object({
  firstName: z.string().min(1),
  wording: z.enum(["five-part", "four-part"]),
});

export type WelcomePage = z.infer<typeof welcomePageSchema>;

export const clientIdentitySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string(),
});

export type ClientIdentity = z.infer<typeof clientIdentitySchema>;
