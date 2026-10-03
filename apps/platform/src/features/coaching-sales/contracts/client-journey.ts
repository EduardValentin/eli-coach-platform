import type {
  ClientJourneyStep,
  ClientPortalAccess,
} from "@eli-coach-platform/domain/client-journey";
import { z } from "zod";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";

import {
  CLIENT_ENDED_PATH,
  CLIENT_ONBOARDING_PATH,
  CLIENT_WELCOME_PATH,
} from "./paths";

const FINISH_ONBOARDING_LABEL = "Finish your onboarding";

const TRAILING_SLASHES = /\/+$/;

const ONBOARDING_JOURNEY_PATHS: readonly string[] = [
  CLIENT_WELCOME_PATH,
  CLIENT_ONBOARDING_PATH,
];

type ClientJourneyGate = {
  destination: string;
  admits: (requestedPath: string) => boolean;
};

export type ClientPortalStanding = {
  step: ClientJourneyStep;
  access: ClientPortalAccess;
};

const ENDED_GATE: ClientJourneyGate = {
  destination: CLIENT_ENDED_PATH,
  admits: (requestedPath) => requestedPath === CLIENT_ENDED_PATH,
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
  standing: ClientPortalStanding,
  requestedPath: string,
): string | null {
  const gate = gateOf(standing);

  return gate.admits(normalizedPathOf(requestedPath)) ? null : gate.destination;
}

function normalizedPathOf(requestedPath: string): string {
  return (
    decodedPathOf(requestedPath).toLowerCase().replace(TRAILING_SLASHES, "") ||
    "/"
  );
}

function decodedPathOf(requestedPath: string): string {
  try {
    return decodeURIComponent(requestedPath);
  } catch {
    return requestedPath;
  }
}

export function clientJourneyPortalLink(
  standing: ClientPortalStanding,
): { href: string; label: string } | null {
  if (standing.access === "ended" || isAfterSubmission(standing.step)) {
    return null;
  }

  return {
    href: CLIENT_JOURNEY_GATE_BY_STEP[standing.step].destination,
    label: FINISH_ONBOARDING_LABEL,
  };
}

function gateOf(standing: ClientPortalStanding): ClientJourneyGate {
  if (standing.access === "ended") {
    return ENDED_GATE;
  }

  const stepGate = CLIENT_JOURNEY_GATE_BY_STEP[standing.step];

  return {
    destination: stepGate.destination,
    admits: (requestedPath) =>
      requestedPath !== CLIENT_ENDED_PATH && stepGate.admits(requestedPath),
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
  startNowUntil: z.iso.datetime().nullable(),
  paymentProblem: z.boolean(),
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
