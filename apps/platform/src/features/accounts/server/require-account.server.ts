import {
  canAccessClientPortal,
  canAccessCoachPortal,
  type Account,
  type AccountRole,
} from "@eli-coach-platform/domain";
import {
  redirect,
  type LoaderFunctionArgs,
  type RouterContextProvider,
} from "react-router";

import { accountContext } from "./account-context.server";

// The portal guard runs as route middleware rather than in a loader, so it
// names the two things it actually reads — the session the root's
// account-resolution middleware published on the request context, and the URL
// the request arrived on — instead of either caller's whole argument object.
type GuardedRequest = {
  context: Readonly<RouterContextProvider>;
  request: Request;
};

export type PortalRecovery = "store" | "client-portal" | "coach-portal";

// Where each role's home surface is — used to route a signed-in visitor back
// to a page they *do* have access to when they hit the wrong portal, rather
// than leaving them on a page describing the portal they were denied.
const PORTAL_RECOVERY_BY_ROLE: Record<AccountRole, PortalRecovery> = {
  USER: "store",
  CLIENT: "client-portal",
  COACH: "coach-portal",
};

// The two roles that own a portal. USER is absent because its home surface is
// the public store, so there is no route it could guard.
type PortalRole = Extract<AccountRole, "CLIENT" | "COACH">;

// Who may enter a portal is a domain rule, so the guard dispatches to the
// domain's predicates rather than restating `role === options.role` here; the
// guard only decides what a denial looks like on the wire.
const PORTAL_ACCESS_BY_GUARDED_ROLE: Record<
  PortalRole,
  (account: Account) => boolean
> = {
  CLIENT: canAccessClientPortal,
  COACH: canAccessCoachPortal,
};

type RequirePortalAccessOptions = {
  role: PortalRole;
  signInUrl: string;
  publicAppUrl?: string;
};

export function requirePortalAccess(
  args: GuardedRequest,
  options: RequirePortalAccessOptions,
): Account {
  const session = args.context.get(accountContext);

  if (session.kind === "anonymous") {
    throw redirect(buildSignInRedirectTarget(args.request, options));
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

type RequireApiAccountOptions = {
  role?: AccountRole;
};

export function requireApiAccount(
  args: LoaderFunctionArgs,
  options?: RequireApiAccountOptions,
): Account {
  const session = args.context.get(accountContext);

  if (session.kind === "anonymous") {
    throw Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { account } = session;

  if (options?.role && account.role !== options.role) {
    throw Response.json({ error: "forbidden" }, { status: 403 });
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
  options: Pick<RequirePortalAccessOptions, "publicAppUrl" | "signInUrl">,
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
