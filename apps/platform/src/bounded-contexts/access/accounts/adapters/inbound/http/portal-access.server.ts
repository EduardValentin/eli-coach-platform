import { redirect } from "react-router";

import { Account } from "~/bounded-contexts/access/accounts/domain/account";
import type {
  AccessRequestContext,
  AccountRole,
  PortalLinks,
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

type PortalRecovery = "client-portal" | "coach-portal";

const PORTAL_RECOVERY_BY_ROLE: Record<AccountRole, PortalRecovery> = {
  CLIENT: "client-portal",
  COACH: "coach-portal",
};

const PORTAL_ACCESS_BY_GUARDED_ROLE: Record<
  AccountRole,
  (account: SessionAccount) => boolean
> = {
  CLIENT: Account.canAccessClientPortal,
  COACH: Account.canAccessCoachPortal,
};

export function createAccessRequestContext(
  session: ResolvedSession,
  portal: PortalLinks,
  requestUrl: URL,
): AccessRequestContext {
  return {
    portal,
    requireAccount: (options) => requireAccount(session, options?.role),
    requirePortalAccess: (role) => {
      if (session.kind === "anonymous") {
        throw redirect(buildSignInRedirectTarget(requestUrl, portal));
      }

      return requirePortalRole(session.account, role);
    },
    session,
  };
}

function requireAccount(
  session: ResolvedSession,
  role: AccountRole | undefined,
): SessionAccount {
  if (session.kind === "anonymous") {
    throw Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { account } = session;

  if (role && account.role !== role) {
    throw Response.json({ error: "forbidden" }, { status: 403 });
  }

  return account;
}

function requirePortalRole(
  account: SessionAccount,
  role: AccountRole,
): SessionAccount {
  if (!PORTAL_ACCESS_BY_GUARDED_ROLE[role](account)) {
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
