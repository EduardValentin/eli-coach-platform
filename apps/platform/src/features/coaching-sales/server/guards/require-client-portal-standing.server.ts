import {
  buildRedirectPath,
  normalizeBasePath,
} from "@eli-coach-platform/config";
import type { ClientJourney } from "@eli-coach-platform/domain/client-journey";
import { redirect, type RouterContextProvider } from "react-router";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  clientJourneyRedirect,
  type ClientPortalStanding,
} from "~/features/coaching-sales/contracts/client-journey";

import { clientJourneyContext } from "./client-journey-context.server";
import { coachingSalesContext } from "./coaching-sales-context.server";

type JourneyRequest = {
  context: Readonly<RouterContextProvider>;
  request: Request;
};

const ENDED_REFUSAL = { error: "ended" };
const CONFLICT = 409;

type SignedInStanding = {
  journey: ClientJourney;
  standing: ClientPortalStanding;
};

export async function readClientPortalStanding(
  args: JourneyRequest,
): Promise<ClientPortalStanding | null> {
  const signedIn = await readSignedInClientStanding(args);

  return signedIn?.standing ?? null;
}

export async function requireClientPortalStanding(
  args: JourneyRequest,
): Promise<void> {
  const signedIn = await readSignedInClientStanding(args);
  handOverClientJourney(args, signedIn?.journey ?? null);

  if (!signedIn) {
    return;
  }

  const { appBasePath } = args.context.get(accountsContext).portal;
  const redirectTo = clientJourneyRedirect(
    signedIn.standing,
    appPathOf(new URL(args.request.url).pathname, appBasePath),
  );

  if (!redirectTo) {
    return;
  }

  // Middleware redirects skip the router's basename, so the target carries it.
  throw redirect(buildRedirectPath(appBasePath, redirectTo));
}

function appPathOf(requestedPathname: string, appBasePath: string): string {
  const basePath = normalizeBasePath(appBasePath);

  if (!requestedPathname.startsWith(`${basePath}/`)) {
    return requestedPathname;
  }

  return requestedPathname.slice(basePath.length);
}

function handOverClientJourney(
  args: JourneyRequest,
  journey: ClientJourney | null,
): void {
  args.context.set(clientJourneyContext, journey?.toSnapshot() ?? null);
}

async function readSignedInClientStanding(
  args: JourneyRequest,
): Promise<SignedInStanding | null> {
  const session = args.context.get(sessionContext);

  if (session.kind === "anonymous" || session.account.role !== "CLIENT") {
    return null;
  }

  const standing = await args.context
    .get(coachingSalesContext)
    .readClientPortalStanding.execute(session.account.authSubjectId);

  if (!standing) {
    return null;
  }

  return {
    journey: standing.journey,
    standing: { step: standing.journey.step(), access: standing.access },
  };
}

export async function requireOpenClientPortal(
  args: JourneyRequest,
): Promise<void> {
  const standing = await readClientPortalStanding(args);

  if (standing?.access === "ended") {
    throw Response.json(ENDED_REFUSAL, { status: CONFLICT });
  }
}
