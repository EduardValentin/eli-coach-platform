import type { ManagementAuthConfig } from "./management-authenticator-port.server";

export function createManagementAuthConfig(
  publicAppUrl: string,
): ManagementAuthConfig {
  return {
    transportPolicy:
      new URL(publicAppUrl).protocol === "https:" ? "https_required" : "any",
  };
}

export function isSecureManagementTransport(request: Request): boolean {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProtocol) {
    return forwardedProtocol === "https";
  }

  return new URL(request.url).protocol === "https:";
}
