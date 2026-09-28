import { buildRedirectPath } from "@eli-coach-platform/config";
import type {
  ClientJourney,
  ClientJourneyStep,
} from "@eli-coach-platform/domain/client-journey";
import { redirect, type RouterContextProvider } from "react-router";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  clientJourneyDestination,
  clientJourneyOpenPaths,
} from "~/features/coaching-sales/contracts/client-journey";

import { clientJourneyContext } from "./client-journey-context.server";
import { coachingSalesContext } from "./coaching-sales-context.server";

type JourneyRequest = {
  context: Readonly<RouterContextProvider>;
  request: Request;
};

export async function readClientJourneyStep(
  args: JourneyRequest,
): Promise<ClientJourneyStep | null> {
  const journey = await readSignedInClientJourney(args);

  return journey?.step() ?? null;
}

export async function requireClientJourneyStep(
  args: JourneyRequest,
): Promise<void> {
  const journey = await readSignedInClientJourney(args);
  handOverClientJourney(args, journey);

  if (!journey) {
    return;
  }

  const step = journey.step();
  const { appBasePath } = args.context.get(accountsContext).portal;
  const requestedPath = new URL(args.request.url).pathname;
  const isOpenAtStep = clientJourneyOpenPaths(step).some(
    (path) => buildRedirectPath(appBasePath, path) === requestedPath,
  );

  if (isOpenAtStep) {
    return;
  }

  // Middleware redirects skip the router's basename, so the target carries it.
  throw redirect(
    buildRedirectPath(appBasePath, clientJourneyDestination(step)),
  );
}

function handOverClientJourney(
  args: JourneyRequest,
  journey: ClientJourney | null,
): void {
  args.context.set(clientJourneyContext, journey?.toSnapshot() ?? null);
}

async function readSignedInClientJourney(
  args: JourneyRequest,
): Promise<ClientJourney | null> {
  const session = args.context.get(sessionContext);

  if (session.kind === "anonymous" || session.account.role !== "CLIENT") {
    return null;
  }

  return args.context
    .get(coachingSalesContext)
    .readClientJourney.execute(session.account.authSubjectId);
}
