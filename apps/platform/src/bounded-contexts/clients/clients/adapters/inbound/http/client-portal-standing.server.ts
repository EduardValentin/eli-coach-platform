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
  const reading = await readSignedInClientStanding(context);

  context.set(clientJourneyContext, reading?.journey.toSnapshot() ?? null);
  context.set(
    clientPortalStandingContext,
    reading ? { step: reading.journey.step(), portal: reading.portal } : null,
  );

  return next();
};

async function readSignedInClientStanding(
  context: Readonly<RouterContextProvider>,
): Promise<PortalStandingReading> {
  const session = context.get(accessContext).session;

  if (session.kind === "anonymous" || session.account.role !== "CLIENT") {
    return null;
  }

  const clients = context.get(clientsContext);
  const authSubjectId = session.account.authSubjectId;
  const standing =
    await clients.readClientPortalStanding.execute(authSubjectId);

  if (standing) {
    return standing;
  }

  const linked = await clients.acceptInvitation.execute({ authSubjectId });

  return linked === "accepted"
    ? clients.readClientPortalStanding.execute(authSubjectId)
    : null;
}
