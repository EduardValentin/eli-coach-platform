import type { AccountProvisioningService } from "@eli-coach-platform/domain";
import type { IdentityProvider } from "@eli-coach-platform/infrastructure/identity/server";

import { resolveSafeRedirectPath, STORE_PATH } from "./safe-redirect";

export const AUTH_COMPLETE_PATH = "/auth/complete";
export const SIGN_IN_FAILED_PATH = "/sign-in-failed";
const REDIRECT_URL_PARAMETER = "redirect_url";

/** Cleared on sign-out so a revoked session leaves nothing behind on this domain. */
const CLERK_COOKIE_NAMES = ["__session", "__client_uat", "__refresh"];

export type PublicSession =
  | { status: "anonymous" }
  | { status: "authenticated"; role: string };

type AuthControllerOptions = {
  identityProvider: IdentityProvider;
  provisioningService: AccountProvisioningService;
};

export class AuthController {
  private readonly identityProvider: IdentityProvider;
  private readonly provisioningService: AccountProvisioningService;

  constructor(options: AuthControllerOptions) {
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

    const account = await this.provisioningService.resolveAccount(
      authentication.identity.subjectId,
    );

    return sessionResponse({ status: "authenticated", role: account.role });
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
