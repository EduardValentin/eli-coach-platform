import { buildRedirectPath, normalizeBasePath } from "~/shared/http/base-path";
import type { ClientJourney } from "~/bounded-contexts/clients/clients/domain/client-journey";
import { redirect, type RouterContextProvider } from "react-router";

import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  clientJourneyRedirect,
  type ClientPortalStanding,
} from "~/bounded-contexts/clients/clients/public/client-journey";

import { clientJourneyContext } from "./client-journey-context.server";
import { clientsContext } from "./clients-context.server";

type JourneyRequest = {
  context: Readonly<RouterContextProvider>;
  url: URL;
};

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
    appPathOf(args.url.pathname, appBasePath),
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
    .get(clientsContext)
    .readClientPortalStanding.execute(session.account.authSubjectId);

  if (!standing) {
    return null;
  }

  return {
    journey: standing.journey,
    standing: { step: standing.journey.step(), portal: standing.portal },
  };
}
