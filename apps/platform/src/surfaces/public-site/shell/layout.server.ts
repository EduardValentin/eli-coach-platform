import { buildRedirectPath, type RuntimeEnvironment } from "@eli-coach-platform/config";
import type { LoaderFunctionArgs } from "react-router";

import type { PublicSessionState } from "~/features/accounts/contracts/account";
import {
  accountContext,
  type ResolvedSession,
} from "~/features/accounts/server/account-context.server";
import type { Waitlist } from "~/features/waitlist/contracts/waitlist";

import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PublicLayoutLoaderData = {
  session: PublicSessionState;
  storePath: string;
  waitlist: Waitlist;
};

export async function loader(args: LoaderFunctionArgs): Promise<PublicLayoutLoaderData> {
  const runtimeEnvironment = getRuntimeEnvironment();

  return {
    session: toPublicSessionState(args.context.get(accountContext)),
    storePath: buildRedirectPath(runtimeEnvironment.APP_BASE_PATH, "/store"),
    waitlist: createStaticWaitlistShell(runtimeEnvironment),
  };
}

// Maps the server-only ResolvedSession (which carries the full Account,
// including its id) down to the role-only shape the public nav needs — the
// account id has no reason to reach the browser and never should.
function toPublicSessionState(session: ResolvedSession): PublicSessionState {
  return session.kind === "anonymous"
    ? { kind: "anonymous" }
    : { kind: "authenticated", role: session.account.role };
}

function createStaticWaitlistShell(
  runtimeEnvironment: RuntimeEnvironment,
): Waitlist {
  return {
    enabled: runtimeEnvironment.WAITLIST_MODE,
    offer: {
      plan: runtimeEnvironment.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: runtimeEnvironment.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
    availability: null,
  };
}
