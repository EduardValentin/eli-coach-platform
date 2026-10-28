import type { MiddlewareFunction, RouterContextProvider } from "react-router";

import { accessContext } from "~/bounded-contexts/access/public/session";
import { clientPortalStandingContext } from "~/bounded-contexts/clients/public/portal-standing";

import { clientJourneyContext } from "./client-journey-context.server";
import { clientsContext, type ClientsFeature } from "./context.server";

type PortalStandingReading = Awaited<
  ReturnType<ClientsFeature["readClientPortalStanding"]["execute"]>
>;

export const clientPortalStandingMiddleware: MiddlewareFunction<
  Response
> = async ({ context }, next) => {
  const reading =
    (await readClientStanding(context)) ??
    ((await linkAcceptedInvitation(context))
      ? await readClientStanding(context)
      : null);

  context.set(clientJourneyContext, reading?.journey.toSnapshot() ?? null);
  context.set(
    clientPortalStandingContext,
    reading ? { step: reading.journey.step(), portal: reading.portal } : null,
  );

  return next();
};

async function readClientStanding(
  context: Readonly<RouterContextProvider>,
): Promise<PortalStandingReading> {
  const authSubjectId = signedInClientSubjectOf(context);

  return authSubjectId === null
    ? null
    : context
        .get(clientsContext)
        .readClientPortalStanding.execute(authSubjectId);
}

async function linkAcceptedInvitation(
  context: Readonly<RouterContextProvider>,
): Promise<boolean> {
  const authSubjectId = signedInClientSubjectOf(context);

  if (authSubjectId === null) {
    return false;
  }

  const linked = await context
    .get(clientsContext)
    .acceptInvitation.execute({ authSubjectId });

  return linked === "accepted";
}

function signedInClientSubjectOf(
  context: Readonly<RouterContextProvider>,
): string | null {
  const session = context.get(accessContext).session;

  return session.kind === "anonymous" || session.account.role !== "CLIENT"
    ? null
    : session.account.authSubjectId;
}
