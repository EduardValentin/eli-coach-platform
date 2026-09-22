import { buildRedirectPath } from "@eli-coach-platform/config";
import type { LoaderFunctionArgs } from "react-router";

import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";
import type { PublicSessionState } from "~/features/accounts/contracts/account";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import { STORE_PATH } from "~/features/store/contracts/paths";
import {
  presentWaitlist,
  type WaitlistPresentation,
} from "~/features/waitlist/ui/shared/waitlist-presentation";
import {
  waitlistContext,
  waitlistFeatureFlagEvaluationContext,
} from "~/features/waitlist/server/guards/waitlist-context.server";

import { runtimeConfigContext } from "~/server/guards/runtime-config-context.server";

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
    session: toPublicSessionState(args.context.get(sessionContext)),
    storePath: buildRedirectPath(runtimeConfig.appBasePath, STORE_PATH),
    waitlist: presentWaitlist(
      await waitlist.getWaitlist(
        args.context.get(waitlistFeatureFlagEvaluationContext),
      ),
    ),
  };
}

// Maps the server-only ResolvedSession (which carries an AccountSnapshot,
// including its id) down to the role-only shape the public nav needs — the
// account id has no reason to reach the browser and never should.
function toPublicSessionState(session: ResolvedSession): PublicSessionState {
  return session.kind === "anonymous"
    ? { kind: "anonymous" }
    : { kind: "authenticated", role: session.account.role };
}
