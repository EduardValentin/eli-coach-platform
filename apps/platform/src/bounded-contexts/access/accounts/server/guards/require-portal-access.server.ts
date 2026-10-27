import {
  Account,
  type AccountRole,
  type AccountSnapshot,
} from "~/bounded-contexts/access/accounts/domain/account";
import { redirect, type RouterContextProvider } from "react-router";

import { accountsContext } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import { sessionContext } from "./session-context.server";

type GuardedRequest = {
  context: Readonly<RouterContextProvider>;
  url: URL;
};

type PortalRecovery = "client-portal" | "coach-portal";

const PORTAL_RECOVERY_BY_ROLE: Record<AccountRole, PortalRecovery> = {
  CLIENT: "client-portal",
  COACH: "coach-portal",
};

const PORTAL_ACCESS_BY_GUARDED_ROLE: Record<
  AccountRole,
  (account: AccountSnapshot) => boolean
> = {
  CLIENT: Account.canAccessClientPortal,
  COACH: Account.canAccessCoachPortal,
};

type RequirePortalAccessOptions = {
  role: AccountRole;
};

export function requirePortalAccess(
  args: GuardedRequest,
  options: RequirePortalAccessOptions,
): AccountSnapshot {
  const session = args.context.get(sessionContext);

  if (session.kind === "anonymous") {
    const { publicAppUrl, signInUrl } =
      args.context.get(accountsContext).portal;
    throw redirect(
      buildSignInRedirectTarget(args.url, { publicAppUrl, signInUrl }),
    );
  }

  const { account } = session;

  if (!PORTAL_ACCESS_BY_GUARDED_ROLE[options.role](account)) {
    throw Response.json(
      { recovery: PORTAL_RECOVERY_BY_ROLE[account.role] },
      { status: 403 },
    );
  }

  return account;
}

// Deployments sit behind a public origin (PUBLIC_APP_URL) that can differ from
// the origin the request actually arrived on — an internal load-balancer host,
// a container hostname, or TEST's proxied domain. Clerk's redirect_url has to
// resolve to the origin a browser can reach, so the public origin wins over
// the request's own when one is configured; the path and query always survive
// unchanged so sign-in returns to the exact page that was denied.
function buildSignInRedirectTarget(
  url: URL,
  options: { publicAppUrl: string | undefined; signInUrl: string },
): string {
  const originalUrl = new URL(url);

  if (options.publicAppUrl) {
    const publicOrigin = new URL(options.publicAppUrl);
    originalUrl.protocol = publicOrigin.protocol;
    originalUrl.hostname = publicOrigin.hostname;
    originalUrl.port = publicOrigin.port;
  }

  return `${options.signInUrl}?redirect_url=${encodeURIComponent(originalUrl.toString())}`;
}
