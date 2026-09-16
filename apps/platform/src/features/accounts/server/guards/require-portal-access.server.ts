import { canAccessClientPortal, canAccessCoachPortal, type AccountRole, type AccountSnapshot } from "@eli-coach-platform/domain/accounts";
import { redirect, type RouterContextProvider } from "react-router";

import { accountsContext } from "./accounts-context.server";
import { sessionContext } from "./session-context.server";

// The portal guard runs as route middleware rather than in a loader, so it
// names the two things it actually reads — the session the root's
// account-resolution middleware published on the request context, and the URL
// the request arrived on — instead of either caller's whole argument object.
type GuardedRequest = {
  context: Readonly<RouterContextProvider>;
  request: Request;
};

export type PortalRecovery = "client-portal" | "coach-portal";

// Where each role's home surface is — used to route a signed-in visitor back
// to a page they *do* have access to when they hit the wrong portal, rather
// than leaving them on a page describing the portal they were denied.
const PORTAL_RECOVERY_BY_ROLE: Record<AccountRole, PortalRecovery> = {
  CLIENT: "client-portal",
  COACH: "coach-portal",
};

// Who may enter a portal is a domain rule, so the guard dispatches to the
// domain's predicates rather than restating `role === options.role` here; the
// guard only decides what a denial looks like on the wire.
const PORTAL_ACCESS_BY_GUARDED_ROLE: Record<
  AccountRole,
  (account: AccountSnapshot) => boolean
> = {
  CLIENT: canAccessClientPortal,
  COACH: canAccessCoachPortal,
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
    const { publicAppUrl, signInUrl } = args.context.get(accountsContext).portal;
    throw redirect(buildSignInRedirectTarget(args.request, { publicAppUrl, signInUrl }));
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
  request: Request,
  options: { publicAppUrl: string | undefined; signInUrl: string },
): string {
  const originalUrl = new URL(request.url);

  if (options.publicAppUrl) {
    const publicOrigin = new URL(options.publicAppUrl);
    originalUrl.protocol = publicOrigin.protocol;
    originalUrl.hostname = publicOrigin.hostname;
    // `.port` alone won't clear a port the request URL already had — the
    // setter is a no-op on an empty string — so it's assigned unconditionally
    // even when publicOrigin has none (its default-port URL yields "").
    originalUrl.port = publicOrigin.port;
  }

  return `${options.signInUrl}?redirect_url=${encodeURIComponent(originalUrl.toString())}`;
}
