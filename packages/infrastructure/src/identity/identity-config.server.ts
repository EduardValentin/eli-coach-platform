import type { RuntimeEnvironment } from "@eli-coach-platform/config";

import type { IdentityConfig } from "./identity-contract.server";

/** A publishable key is the Frontend API host, base64-encoded, with a `$` terminator. */
export function createIdentityConfig(
  runtimeEnvironment: RuntimeEnvironment,
): IdentityConfig {
  return {
    accountPortalUrl: resolveAccountPortalUrl(
      runtimeEnvironment.CLERK_PUBLISHABLE_KEY,
    ),
    apiUrl: runtimeEnvironment.CLERK_API_URL,
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
 * Development instances sit at `<slug>.clerk.accounts.dev` with the portal at
 * `<slug>.accounts.dev`; production at `clerk.<domain>` with `accounts.<domain>`.
 */
function resolveAccountPortalUrl(publishableKey: string): string {
  const frontendApiHost = resolveFrontendApiHost(publishableKey);
  const portalHost = frontendApiHost.endsWith(".accounts.dev")
    ? frontendApiHost.replace(".clerk.accounts.dev", ".accounts.dev")
    : frontendApiHost.replace(/^clerk\./, "accounts.");

  return `https://${portalHost}`;
}
