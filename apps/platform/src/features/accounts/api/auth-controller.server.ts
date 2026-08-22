import { stripBasePath } from "@eli-coach-platform/config";
import { AccountDeletedError } from "@eli-coach-platform/domain";
import type {
  AccountProvisioningService,
  AccountRole,
  Portal,
} from "@eli-coach-platform/domain";
import type { IdentityProvider } from "@eli-coach-platform/infrastructure/identity/server";

import { resolveSafeRedirectPath, STORE_PATH } from "./safe-redirect";

export const AUTH_COMPLETE_PATH = "/auth/complete";
export const AUTH_SIGN_IN_PATH = "/auth/sign-in";
export const FORBIDDEN_PATH = "/403";
export const SIGN_IN_FAILED_PATH = "/sign-in-failed";
const REDIRECT_URL_PARAMETER = "redirect_url";

/** Cleared on sign-out so a revoked session leaves nothing behind on this domain. */
const CLERK_COOKIE_NAMES = ["__session", "__client_uat", "__refresh"];

export type PublicSession =
  | { status: "anonymous" }
  | { status: "authenticated"; role: string };

/**
 * A denial carries the response rather than a reason code: the three ways in
 * (Clerk needs a handshake, the visitor is signed out, the role is wrong) end
 * in three different places, and only this class knows which.
 */
export type PortalAuthorization =
  | { status: "granted"; role: AccountRole }
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
    const returnUrl = new URL(AUTH_COMPLETE_PATH, requestUrl.origin);

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

    try {
      await this.provisioningService.resolveAccount(
        authentication.identity.subjectId,
      );
    } catch {
      // No half-signed-in state: the Clerk session goes before the failure page.
      await this.identityProvider.signOut(authentication.identity.sessionId);

      return redirectTo(SIGN_IN_FAILED_PATH, clearIdentityCookies());
    }

    return redirectTo(destination);
  }

  async signOut(request: Request): Promise<Response> {
    const authentication = await this.identityProvider.authenticate(request);

    if (authentication.status === "authenticated") {
      await this.identityProvider.signOut(authentication.identity.sessionId);
    }

    return redirectTo(STORE_PATH, clearIdentityCookies());
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
        response: redirectTo(this.signInPathReturningTo(options.request)),
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
        response: redirectTo(SIGN_IN_FAILED_PATH, clearIdentityCookies()),
        status: "denied",
      };
    }

    if (!account.canReach(options.portal)) {
      return { response: redirectTo(FORBIDDEN_PATH), status: "denied" };
    }

    return { role: account.role, status: "granted" };
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
      return sessionResponse({ status: "anonymous" });
    }

    const account = await this.resolveAccountOrNull(
      authentication.identity.subjectId,
    );

    if (!account) {
      return sessionResponse({ status: "anonymous" });
    }

    return sessionResponse({ status: "authenticated", role: account.role });
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

  private signInPathReturningTo(request: Request): string {
    const requestUrl = new URL(request.url);
    // React Router prepends the basename to a redirect, so the destination has
    // to be stored without it or it comes back doubled.
    const destination = `${stripBasePath(this.appBasePath, requestUrl.pathname)}${requestUrl.search}`;

    return `${AUTH_SIGN_IN_PATH}?${REDIRECT_URL_PARAMETER}=${encodeURIComponent(destination)}`;
  }
}

function sessionResponse(session: PublicSession): Response {
  return Response.json(session, {
    headers: { "Cache-Control": "no-store" },
  });
}

function redirectTo(location: string, headers: Headers = new Headers()): Response {
  headers.set("Location", location);

  return new Response(null, { headers, status: 302 });
}

function clearIdentityCookies(): Headers {
  const headers = new Headers();

  for (const name of CLERK_COOKIE_NAMES) {
    headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
  }

  return headers;
}
