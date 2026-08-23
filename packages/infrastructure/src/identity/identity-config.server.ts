import type { RuntimeEnvironment } from "@eli-coach-platform/config";

import type { IdentityConfig } from "./identity-contract.server";

/**
 * A Clerk publishable key is the Frontend API host, base64-encoded, with a `$`
 * terminator. The Account Portal sits on the sibling host, so both are derived
 * rather than configured separately and cannot drift apart.
 */
export function createIdentityConfig(
  runtimeEnvironment: RuntimeEnvironment,
): IdentityConfig {
  return {
    accountPortalUrl: resolveAccountPortalUrl(
      runtimeEnvironment.CLERK_PUBLISHABLE_KEY,
    ),
    apiUrl: runtimeEnvironment.CLERK_API_URL,
    jwtKey: runtimeEnvironment.CLERK_JWT_KEY,
    publicAppUrl: runtimeEnvironment.PUBLIC_APP_URL,
    publishableKey: runtimeEnvironment.CLERK_PUBLISHABLE_KEY,
    secretKey: runtimeEnvironment.CLERK_SECRET_KEY,
  };
}

export function resolveFrontendApiHost(publishableKey: string): string {
  const encoded = publishableKey.replace(/^pk_(test|live)_/, "");
  const decoded = Buffer.from(encoded, "base64").toString("utf8");

  return decoded.replace(/\$$/, "");
}

/**
 * The two instance kinds shape the host differently, and the Account Portal is
 * the sibling of whichever one you have: a development instance is served at
 * `<slug>.clerk.accounts.dev` with its portal at `<slug>.accounts.dev`, while a
 * production instance is served at `clerk.<domain>` with its portal at
 * `accounts.<domain>`.
 */
function resolveAccountPortalUrl(publishableKey: string): string {
  const frontendApiHost = resolveFrontendApiHost(publishableKey);
  const portalHost = frontendApiHost.endsWith(".accounts.dev")
    ? frontendApiHost.replace(".clerk.accounts.dev", ".accounts.dev")
    : frontendApiHost.replace(/^clerk\./, "accounts.");

  return `https://${portalHost}`;
}
