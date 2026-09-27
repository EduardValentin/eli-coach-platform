import { buildRedirectPath } from "@eli-coach-platform/config";
import type { LoaderFunctionArgs } from "react-router";

import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";
import type { PublicSessionState } from "~/features/accounts/contracts/account";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import { readClientJourneyStep } from "~/features/coaching-sales/server/guards/require-client-journey-step.server";
import { STORE_PATH } from "~/features/store/contracts/paths";
import {
  presentWaitlist,
  type WaitlistPresentation,
} from "~/features/waitlist/ui/shared/waitlist-presentation";
import { waitlistContext } from "~/features/waitlist/server/guards/waitlist-context.server";

import { runtimeConfigContext } from "~/server/guards/runtime-config-context.server";

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
      journeyStep: await readClientJourneyStep(args),
      role: session.account.role,
    }),
  };
}
