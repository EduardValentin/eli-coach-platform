import { clerkClient, getAuth } from "@clerk/react-router/server";
import { buildRedirectPath } from "~/shared/http/base-path";
import type { ProvisionAccountResult } from "~/bounded-contexts/access/accounts/domain/account";
import { redirect, type MiddlewareFunction } from "react-router";

import { SIGN_IN_FAILED_PATH } from "~/bounded-contexts/access/public/paths";
import {
  accessContext,
  type ResolvedSession,
} from "~/bounded-contexts/access/public/session";

import type { AccountsFeature } from "./context.server";
import { createAccessRequestContext } from "./portal-access.server";

type RefusalReason =
  Exclude<ProvisionAccountResult["outcome"], "active"> | "provisioning-error";

type AccountResolution = Pick<AccountsFeature, "portal" | "provisioning">;

function targetsSignInFailedPage(url: URL, appBasePath: string): boolean {
  return url.pathname === buildRedirectPath(appBasePath, SIGN_IN_FAILED_PATH);
}

export function createAccountResolutionMiddleware(
  accounts: AccountResolution,
): MiddlewareFunction<Response> {
  return async function resolveAccount(args, next) {
    const { context, url } = args;
    const resolveSession = (session: ResolvedSession) =>
      context.set(
        accessContext,
        createAccessRequestContext(session, accounts.portal, url),
      );

    if (targetsSignInFailedPage(url, accounts.portal.appBasePath)) {
      resolveSession({ kind: "anonymous" });
      return next();
    }

    const auth = await getAuth(args);

    if (!auth.userId) {
      resolveSession({ kind: "anonymous" });
      return next();
    }

    let refusalReason: RefusalReason = "provisioning-error";

    try {
      const result = await accounts.provisioning.execute(auth.userId);

      if (result.outcome === "active") {
        resolveSession({ account: result.account, kind: "authenticated" });
        return next();
      }

      refusalReason = result.outcome;
    } catch {
      // Falls through to revoke + failure redirect below.
    }

    console.warn("Signed-in subject refused an account.", {
      authSubjectId: auth.userId,
      refusalReason,
    });

    if (auth.sessionId) {
      try {
        await clerkClient(args).sessions.revokeSession(auth.sessionId);
      } catch {
        // The session dies at token expiry regardless of whether the revoke
        // call itself succeeds — don't mask the failure page behind it.
      }
    }

    resolveSession({ kind: "anonymous" });
    // React Router prefixes the router's basename onto a redirect thrown from
    // a loader, but not onto one thrown from middleware — so under a base path
    // a bare target would send the visitor outside the application entirely.
    throw redirect(
      buildRedirectPath(accounts.portal.appBasePath, SIGN_IN_FAILED_PATH),
    );
  };
}
