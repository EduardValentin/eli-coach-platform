import { joinBasePath, normalizeBasePath } from "@eli-coach-platform/config";

export type AuthRole = "client" | "coach";

type GetRoleHomePathOptions = {
  platformBasePath?: string;
};

export function getRoleHomePath(role: AuthRole, options: GetRoleHomePathOptions = {}): string {
  const platformBasePath = normalizeBasePath(options.platformBasePath ?? "/");

  if (role === "client") {
    return joinBasePath(platformBasePath, "client");
  }

  return joinBasePath(platformBasePath, "coach");
}
