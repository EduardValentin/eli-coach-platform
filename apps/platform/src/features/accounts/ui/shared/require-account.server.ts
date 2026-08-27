import type { Account, AccountRole } from "@eli-coach-platform/domain";
import { redirect, type LoaderFunctionArgs } from "react-router";

import { accountContext } from "./account-context.server";

// Lives in ui/shared/ rather than api/ so every portal layout can call it
// directly: a surface may only reach a feature through ui/{slice}/**,
// ui/shared/**, or contracts/** (ARCHITECTURE.md's boundary rules, enforced
// by eslint.config.mjs's no-restricted-imports patterns), and the guard has
// to be callable from surfaces/*/shell/layout.server.ts as well as any
// feature's own api/ routes.

export type PortalRecovery = "store" | "client-portal" | "coach-portal";

// Where each role's home surface is — used to route a signed-in visitor back
// to a page they *do* have access to when they hit the wrong portal, rather
// than leaving them on a page describing the portal they were denied.
const PORTAL_RECOVERY_BY_ROLE: Record<AccountRole, PortalRecovery> = {
  USER: "store",
  CLIENT: "client-portal",
  COACH: "coach-portal",
};

type RequirePortalAccessOptions = {
  role: AccountRole;
  signInUrl: string;
  publicAppUrl?: string;
};

export function requirePortalAccess(
  args: LoaderFunctionArgs,
  options: RequirePortalAccessOptions,
): Account {
  const session = args.context.get(accountContext);

  if (session.kind === "anonymous") {
    throw redirect(buildSignInRedirectTarget(args.request, options));
  }

  const { account } = session;

  if (account.role !== options.role) {
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
