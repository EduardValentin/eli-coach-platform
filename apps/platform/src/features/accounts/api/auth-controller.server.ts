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
 * Prefixes, not names: Clerk suffixes its cookies per instance
 * (`__refresh_0ocFdLKf`) and reads the refresh token only from the suffixed
 * name, so clearing the bare names leaves the refresh token behind.
 */
const CLERK_COOKIE_PREFIXES = [
  "__session",
  "__client_uat",
  "__refresh",
  "__clerk_db_jwt",
];

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

  startSignIn(request: Request): Response {
    const requestUrl = new URL(request.url);
    const destination = resolveSafeRedirectPath(
      requestUrl.searchParams.get(REDIRECT_URL_PARAMETER),
    );
    const returnUrl = new URL(
      joinBasePath(this.appBasePath, AUTH_COMPLETE_PATH),
      requestUrl.origin,
    );

    returnUrl.searchParams.set(REDIRECT_URL_PARAMETER, destination);

    return redirectTo(this.identityProvider.buildSignInUrl(returnUrl.toString()));
  }

  /** Entered twice per sign-in: the first pass has no session and Clerk redirects. */
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
   * React Router prepends the basename to redirects thrown from a loader or
   * action, but not to one thrown from middleware — which is where denials
   * leave. Only this path carries the base itself.
   */
  private denyTo(path: string, headers?: Headers): Response {
    return redirectTo(joinBasePath(this.appBasePath, path), headers);
  }

  private signInPathReturningTo(request: Request): string {
    const requestUrl = new URL(request.url);
    const destination = `${stripBasePath(this.appBasePath, requestUrl.pathname)}${requestUrl.search}`;

    return `${AUTH_SIGN_IN_PATH}?${REDIRECT_URL_PARAMETER}=${encodeURIComponent(destination)}`;
  }
}

/** Clerk sets cookies on ordinary responses too; dropping them signs nobody in. */
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
 * Sign-out reads no body, so nothing else stops a cross-site submission logging
 * a visitor out. `Sec-Fetch-Site` covers every browser; `Origin` covers callers
 * that omit it.
 */
function isSameOriginSubmission(request: Request): boolean {
  const site = request.headers.get("Sec-Fetch-Site");

  if (site) {
    return site === "same-origin" || site === "none";
  }

  const origin = request.headers.get("Origin");

  return !origin || origin === new URL(request.url).origin;
}

function readCookieNames(request?: Request): string[] {
  return (request?.headers.get("Cookie") ?? "")
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim() ?? "")
    .filter((name) =>
      CLERK_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)),
    );
}
