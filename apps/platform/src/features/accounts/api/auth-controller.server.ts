import { joinBasePath, stripBasePath } from "@eli-coach-platform/config";
import { AccountDeletedError } from "@eli-coach-platform/domain";
import type {
  AccountProvisioningService,
  AccountRole,
  Portal,
} from "@eli-coach-platform/domain";
import {
  applyIdentityHeaders,
  type IdentityProvider,
} from "@eli-coach-platform/infrastructure/identity/server";

import type { PublicSession } from "~/features/accounts/contracts/session";

import { resolveSafeRedirectPath, STORE_PATH } from "./safe-redirect.server";

const AUTH_COMPLETE_PATH = "/auth/complete";
const AUTH_SIGN_IN_PATH = "/auth/sign-in";
const FORBIDDEN_PATH = "/403";
const SIGN_IN_FAILED_PATH = "/sign-in-failed";
const REDIRECT_URL_PARAMETER = "redirect_url";

/**
 * Cleared on sign-out so a revoked session leaves nothing behind on this domain.
 *
 * Prefixes rather than names: Clerk suffixes its cookies per instance —
 * `__refresh_0ocFdLKf` and the like — and reads the refresh token from the
 * suffixed name only. Clearing the bare names alone left a year-long refresh
 * token in the browser of everyone who signed out.
 */
const CLERK_COOKIE_PREFIXES = [
  "__session",
  "__client_uat",
  "__refresh",
  "__clerk_db_jwt",
];

/**
 * A denial carries the response rather than a reason code: the three ways in
 * (Clerk needs a handshake, the visitor is signed out, the role is wrong) end
 * in three different places, and only this class knows which.
 */
export type PortalAuthorization =
  | { status: "granted"; headers: Headers; role: AccountRole }
  | { status: "denied"; response: Response };

type AuthControllerOptions = {
  appBasePath: string;
  identityProvider: IdentityProvider;
  provisioningService: AccountProvisioningService;
};

export class AuthController {
  private readonly appBasePath: string;
  private readonly identityProvider: IdentityProvider;
  private readonly provisioningService: AccountProvisioningService;

  constructor(options: AuthControllerOptions) {
    this.appBasePath = options.appBasePath;
    this.identityProvider = options.identityProvider;
    this.provisioningService = options.provisioningService;
  }

  /**
   * Sends the visitor to Clerk's hosted portal, asking it to return to
   * `/auth/complete` with the original destination still attached.
   */
  startSignIn(request: Request): Response {
    const requestUrl = new URL(request.url);
    const destination = resolveSafeRedirectPath(
      requestUrl.searchParams.get(REDIRECT_URL_PARAMETER),
    );
    // The return URL is absolute and leaves for Clerk, so nothing downstream
    // will add the base path to it — it has to carry its own.
    const returnUrl = new URL(
      joinBasePath(this.appBasePath, AUTH_COMPLETE_PATH),
      requestUrl.origin,
    );

    returnUrl.searchParams.set(REDIRECT_URL_PARAMETER, destination);

    return redirectTo(this.identityProvider.buildSignInUrl(returnUrl.toString()));
  }

  /**
   * Entered twice per sign-in. The first pass carries no session and Clerk
   * answers with a redirect, which is returned untouched; only the second pass
   * reaches the provisioning below.
   */
  async completeSignIn(request: Request): Promise<Response> {
    const authentication = await this.identityProvider.authenticate(request);

    if (authentication.status === "redirect") {
      return authentication.response;
    }

    if (authentication.status === "anonymous") {
      return redirectTo(SIGN_IN_FAILED_PATH);
    }

    const destination = resolveSafeRedirectPath(
      new URL(request.url).searchParams.get(REDIRECT_URL_PARAMETER),
    );

    const account = await this.resolveAccountOrNull(
      authentication.identity.subjectId,
    );

    if (!account) {
      // No half-signed-in state: the Clerk session goes before the failure page.
      // Only deletion lands here — an outage propagates, because revoking a
      // session the visitor just established would make her authenticate again
      // over a fault that has nothing to do with her.
      await this.identityProvider.signOut(authentication.identity.sessionId);

      return redirectTo(SIGN_IN_FAILED_PATH, clearIdentityCookies(request));
    }

    return withHeaders(redirectTo(destination), authentication.headers);
  }

  async signOut(request: Request): Promise<Response> {
    if (!isSameOriginSubmission(request)) {
      return new Response(null, { status: 403 });
    }

    const authentication = await this.identityProvider.authenticate(request);

    if (authentication.status === "authenticated") {
      await this.identityProvider.signOut(authentication.identity.sessionId);
    }

    return redirectTo(STORE_PATH, clearIdentityCookies(request));
  }

  /**
   * The gate on both portals. A signed-out visitor is sent to authenticate and
   * comes back to where she was aiming; an authenticated one holding the wrong
   * role is told so on `/403` rather than bounced through sign-in, which would
   * loop her through a portal she can never reach.
   */
  async authorizePortal(options: {
    portal: Portal;
    request: Request;
  }): Promise<PortalAuthorization> {
    const authentication = await this.identityProvider.authenticate(
      options.request,
    );

    if (authentication.status === "redirect") {
      return { response: authentication.response, status: "denied" };
    }

    if (authentication.status === "anonymous") {
      return {
        response: this.denyTo(this.signInPathReturningTo(options.request)),
        status: "denied",
      };
    }

    const account = await this.resolveAccountOrNull(
      authentication.identity.subjectId,
    );

    if (!account) {
      // The identity outlived the account, so there is nothing to authorize and
      // nothing to keep: drop the session rather than leave a half-signed-in tab.
      await this.identityProvider.signOut(authentication.identity.sessionId);

      return {
        response: this.denyTo(SIGN_IN_FAILED_PATH, clearIdentityCookies(options.request)),
        status: "denied",
      };
    }

    if (!account.canReach(options.portal)) {
      return { response: this.denyTo(FORBIDDEN_PATH), status: "denied" };
    }

    return { headers: authentication.headers, role: account.role, status: "granted" };
  }

  /**
   * The navigation's only question, answered with the least it needs: no email,
   * no name, no account id.
   */
  async getSession(request: Request): Promise<Response> {
    const authentication = await this.identityProvider.authenticate(request);

    if (authentication.status === "redirect") {
      return authentication.response;
    }

    if (authentication.status === "anonymous") {
      return withHeaders(sessionResponse({ status: "anonymous" }), authentication.headers);
    }

    const account = await this.resolveAccountOrNull(
      authentication.identity.subjectId,
    );

    if (!account) {
      return withHeaders(sessionResponse({ status: "anonymous" }), authentication.headers);
    }

    return withHeaders(
      sessionResponse({ status: "authenticated", role: account.role }),
      authentication.headers,
    );
  }

  /**
   * Only deletion becomes `null`. Anything else — a database outage above all —
   * keeps throwing, so an unavailable store surfaces as a failure rather than
   * as a quietly signed-out visitor.
   */
  private async resolveAccountOrNull(subjectId: string) {
    try {
      return await this.provisioningService.resolveAccount(subjectId);
    } catch (error) {
      if (error instanceof AccountDeletedError) {
        return null;
      }

      throw error;
    }
  }

  /**
   * A denial leaves through route middleware, and React Router prepends the
   * basename only to redirects thrown from a loader or an action — never to one
   * a middleware throws. So this pipeline has to carry the base itself, while
   * every other redirect on this class stays relative and is normalized for it.
   */
  private denyTo(path: string, headers?: Headers): Response {
    return redirectTo(joinBasePath(this.appBasePath, path), headers);
  }

  private signInPathReturningTo(request: Request): string {
    const requestUrl = new URL(request.url);
    // React Router prepends the basename to a redirect, so the destination has
    // to be stored without it or it comes back doubled.
    const destination = `${stripBasePath(this.appBasePath, requestUrl.pathname)}${requestUrl.search}`;

    return `${AUTH_SIGN_IN_PATH}?${REDIRECT_URL_PARAMETER}=${encodeURIComponent(destination)}`;
  }
}

/**
 * Clerk asks for cookies to be set on ordinary responses too — a token it
 * refreshed, and, on a production instance, the entire session a handshake just
 * established. Dropping them signs nobody in.
 */
function withHeaders(response: Response, headers: Headers): Response {
  applyIdentityHeaders(response, headers);

  return response;
}

function sessionResponse(session: PublicSession): Response {
  return Response.json(session, {
    headers: { "Cache-Control": "no-store" },
  });
}

function redirectTo(location: string, headers = new Headers()): Response {
  headers.set("Location", location);

  return new Response(null, { headers, status: 302 });
}

function clearIdentityCookies(request?: Request): Headers {
  const headers = new Headers();
  const present = readCookieNames(request);

  for (const name of new Set([...CLERK_COOKIE_PREFIXES, ...present])) {
    headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
  }

  return headers;
}

/**
 * Sign-out changes state and reads no body, so nothing else stops another site
 * from submitting it on a visitor's behalf and logging her out. `Sec-Fetch-Site`
 * is sent by every browser that can make the request; where it is absent — a
 * non-browser caller — `Origin` has to match instead.
 */
function isSameOriginSubmission(request: Request): boolean {
  const site = request.headers.get("Sec-Fetch-Site");

  if (site) {
    return site === "same-origin" || site === "none";
  }

  const origin = request.headers.get("Origin");

  return !origin || origin === new URL(request.url).origin;
}

/** Only the suffixed cookies actually presented, so nothing else is disturbed. */
function readCookieNames(request?: Request): string[] {
  return (request?.headers.get("Cookie") ?? "")
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim() ?? "")
    .filter((name) =>
      CLERK_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)),
    );
}
