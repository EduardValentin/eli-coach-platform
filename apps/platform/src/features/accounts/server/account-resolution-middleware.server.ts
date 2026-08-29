import { clerkClient, getAuth } from "@clerk/react-router/server";
import { buildRedirectPath, type RuntimeEnvironment } from "@eli-coach-platform/config";
import type { AccountProvisioningService } from "@eli-coach-platform/domain";
import { redirect, type MiddlewareFunction } from "react-router";

import { accountContext, SIGN_IN_FAILED_PATH } from "./account-context.server";

// AccountProvisioningService is a class with private fields, so a `Pick` of the
// service itself can never be satisfied by a plain test stub — only the one
// method the middleware calls needs to be structurally typed here. The service
// is named from the domain rather than through
// `PlatformContainer["accountProvisioningService"]` so this factory states the
// single dependency it has instead of naming the whole composition root.
type AccountResolutionContainer = {
  accountProvisioningService: Pick<AccountProvisioningService, "ensureAccount">;
};

type AccountResolutionEnvironment = Pick<RuntimeEnvironment, "APP_BASE_PATH">;

// The app may be served under a base path (APP_BASE_PATH); the request URL's
// pathname includes that basename on TEST, so the deployment's own base path
// is what the pathname is compared against. The comparison is exact rather
// than a suffix match, so any other route ending in the same segment keeps its
// account resolution.
function targetsSignInFailedPage(
  request: Request,
  environment: AccountResolutionEnvironment,
): boolean {
  return (
    new URL(request.url).pathname ===
    buildRedirectPath(environment.APP_BASE_PATH, SIGN_IN_FAILED_PATH)
  );
}

// Both dependencies are getters rather than values because root.server.ts
// composes this middleware while its module is evaluating — reading either
// eagerly there would build the container, and validate the environment, at
// import.
//
// They are also the seam unit tests use instead of the process-wide
// singletons; production wiring passes getPlatformContainer and
// getRuntimeEnvironment.
export function createAccountResolutionMiddleware(
  getContainer: () => AccountResolutionContainer,
  getEnvironment: () => AccountResolutionEnvironment,
): MiddlewareFunction<Response> {
  return async function resolveAccount(args, next) {
    const { context, request } = args;

    // Never run provisioning/revoke logic for the failure page itself — doing
    // so on an already-broken account would redirect right back here. The
    // session still has to be published as anonymous: the failure page hangs
    // off the public-site layout, whose loader reads it on every request.
    if (targetsSignInFailedPage(request, getEnvironment())) {
      context.set(accountContext, { kind: "anonymous" });
      return next();
    }

    const auth = await getAuth(args);

    if (!auth.userId) {
      context.set(accountContext, { kind: "anonymous" });
      return next();
    }

    try {
      const result = await getContainer().accountProvisioningService.ensureAccount(
        auth.userId,
      );

      if (result.outcome === "active") {
        context.set(accountContext, { account: result.account, kind: "authenticated" });
        return next();
      }
    } catch {
      // Falls through to revoke + failure redirect below.
    }

    if (auth.sessionId) {
      try {
        await clerkClient(args).sessions.revokeSession(auth.sessionId);
      } catch {
        // The session dies at token expiry regardless of whether the revoke
        // call itself succeeds — don't mask the failure page behind it.
      }
    }

    context.set(accountContext, { kind: "anonymous" });
    // React Router prefixes the router's basename onto a redirect thrown from
    // a loader, but not onto one thrown from middleware — so under a base path
    // a bare target would send the visitor outside the application entirely.
    throw redirect(
      buildRedirectPath(getEnvironment().APP_BASE_PATH, SIGN_IN_FAILED_PATH),
    );
  };
}
