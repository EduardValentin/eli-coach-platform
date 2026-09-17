import { clerkClient, getAuth } from "@clerk/react-router/server";
import { buildRedirectPath } from "@eli-coach-platform/config";
import type { AccountProvisioningResult } from "@eli-coach-platform/domain/accounts";
import { redirect, type MiddlewareFunction } from "react-router";

import { SIGN_IN_FAILED_PATH } from "~/features/accounts/contracts/paths";

import { accountsContext } from "./guards/accounts-context.server";
import { sessionContext } from "./guards/session-context.server";

type RefusalReason =
  | Exclude<AccountProvisioningResult["outcome"], "active">
  | "provisioning-error";

function targetsSignInFailedPage(
  request: Request,
  appBasePath: string,
): boolean {
  return (
    new URL(request.url).pathname ===
    buildRedirectPath(appBasePath, SIGN_IN_FAILED_PATH)
  );
}

export function createAccountResolutionMiddleware(): MiddlewareFunction<Response> {
  return async function resolveAccount(args, next) {
    const { context, request } = args;
    const accounts = context.get(accountsContext);

    if (targetsSignInFailedPage(request, accounts.portal.appBasePath)) {
      context.set(sessionContext, { kind: "anonymous" });
      return next();
    }

    const auth = await getAuth(args);

    if (!auth.userId) {
      context.set(sessionContext, { kind: "anonymous" });
      return next();
    }

    let refusalReason: RefusalReason = "provisioning-error";

    try {
      const result = await accounts.provisioning.ensureAccount(auth.userId);

      if (result.outcome === "active") {
        context.set(sessionContext, {
          account: result.account,
          kind: "authenticated",
        });
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

    context.set(sessionContext, { kind: "anonymous" });
    // React Router prefixes the router's basename onto a redirect thrown from
    // a loader, but not onto one thrown from middleware — so under a base path
    // a bare target would send the visitor outside the application entirely.
    throw redirect(
      buildRedirectPath(accounts.portal.appBasePath, SIGN_IN_FAILED_PATH),
    );
  };
}
