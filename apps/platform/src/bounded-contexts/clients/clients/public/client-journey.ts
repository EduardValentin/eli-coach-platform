import type { PortalReach } from "~/bounded-contexts/clients/clients/domain/client";
import {
  ClientJourney,
  type ClientJourneyStep,
} from "~/bounded-contexts/clients/clients/domain/client-journey";
import { buildRedirectPath, normalizeBasePath } from "~/shared/http/base-path";
import { z } from "zod";

import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/accounts/public/paths";

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
  portal: PortalReach;
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

export function clientPortalRedirect(request: {
  standing: ClientPortalStanding | null;
  url: URL;
  appBasePath: string;
}): string | null {
  if (!request.standing) {
    return null;
  }

  const redirectTo = clientJourneyRedirect(
    request.standing,
    appPathOf(request.url.pathname, request.appBasePath),
  );

  // Middleware redirects skip the router's basename, so the target carries it.
  return redirectTo ? buildRedirectPath(request.appBasePath, redirectTo) : null;
}

function appPathOf(requestedPathname: string, appBasePath: string): string {
  const basePath = normalizeBasePath(appBasePath);

  if (!requestedPathname.startsWith(`${basePath}/`)) {
    return requestedPathname;
  }

  return requestedPathname.slice(basePath.length);
}

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
  if (
    standing.portal === "ended" ||
    ClientJourney.isAfterSubmission(standing.step)
  ) {
    return null;
  }

  return {
    href: CLIENT_JOURNEY_GATE_BY_STEP[standing.step].destination,
    label: FINISH_ONBOARDING_LABEL,
  };
}

function gateOf(standing: ClientPortalStanding): ClientJourneyGate {
  if (standing.portal === "ended") {
    return ENDED_GATE;
  }

  const stepGate = CLIENT_JOURNEY_GATE_BY_STEP[standing.step];

  return {
    destination: stepGate.destination,
    admits: (requestedPath) =>
      requestedPath !== CLIENT_ENDED_PATH && stepGate.admits(requestedPath),
  };
}

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
