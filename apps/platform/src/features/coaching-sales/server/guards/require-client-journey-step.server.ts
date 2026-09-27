import { buildRedirectPath } from "@eli-coach-platform/config";
import type { ClientJourneyStep } from "@eli-coach-platform/domain/client-journey";
import { redirect, type RouterContextProvider } from "react-router";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import { clientJourneyDestination } from "~/features/coaching-sales/contracts/client-journey";

import { coachingSalesContext } from "./coaching-sales-context.server";

type JourneyRequest = {
  context: Readonly<RouterContextProvider>;
  request: Request;
};

export async function readClientJourneyStep(
  args: JourneyRequest,
): Promise<ClientJourneyStep | null> {
  const session = args.context.get(sessionContext);

  if (session.kind === "anonymous" || session.account.role !== "CLIENT") {
    return null;
  }

  const journey = await args.context
    .get(coachingSalesContext)
    .readClientJourney.execute(session.account.authSubjectId);

  return journey?.step() ?? null;
}

export async function requireClientJourneyStep(
  args: JourneyRequest,
): Promise<void> {
  const step = await readClientJourneyStep(args);

  if (!step) {
    return;
  }

  const { appBasePath } = args.context.get(accountsContext).portal;
  const destination = buildRedirectPath(
    appBasePath,
    clientJourneyDestination(step),
  );

  if (new URL(args.request.url).pathname === destination) {
    return;
  }

  // Middleware redirects skip the router's basename, so the target carries it.
  throw redirect(destination);
}
