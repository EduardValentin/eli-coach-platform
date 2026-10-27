import { buildRedirectPath } from "~/shared/http/base-path";
import type { LoaderFunctionArgs } from "react-router";

import type { BotDetectionConfig } from "~/shared/submission-checks/bot-detection";
import type { PublicSessionState } from "~/bounded-contexts/access/accounts/public/account";
import { sessionContext } from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import { readClientPortalStanding } from "~/bounded-contexts/clients/clients/adapters/inbound/http/require-client-portal-standing.server";
import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";
import {
  presentWaitlist,
  type WaitlistPresentation,
} from "~/bounded-contexts/sales/waitlist/ui/shared/waitlist-presentation";
import { waitlistContext } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/context.server";

import { runtimeConfigContext } from "~/composition-root/guards/runtime-config-context.server";

import { resolvePortalDestination } from "./portal-destination";

export type PublicLayoutLoaderData = {
  botDetection: BotDetectionConfig;
  session: PublicSessionState;
  storePath: string;
  waitlist: WaitlistPresentation;
};

export async function loader(
  args: LoaderFunctionArgs,
): Promise<PublicLayoutLoaderData> {
  const runtimeConfig = args.context.get(runtimeConfigContext);
  const { waitlist } = args.context.get(waitlistContext);

  return {
    botDetection: runtimeConfig.botDetection,
    session: await readPublicSessionState(args),
    storePath: buildRedirectPath(runtimeConfig.appBasePath, STORE_PATH),
    waitlist: presentWaitlist(await waitlist.getWaitlist()),
  };
}

async function readPublicSessionState(
  args: LoaderFunctionArgs,
): Promise<PublicSessionState> {
  const session = args.context.get(sessionContext);

  if (session.kind === "anonymous") {
    return { kind: "anonymous" };
  }

  return {
    kind: "authenticated",
    portalDestination: resolvePortalDestination({
      standing: await readClientPortalStanding(args),
      role: session.account.role,
    }),
  };
}
