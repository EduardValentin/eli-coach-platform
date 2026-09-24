import type { AccountRole } from "@eli-coach-platform/domain/account";

export const SIGN_IN_FAILED_ROUTE_SEGMENT = "sign-in-failed";
export const SIGN_IN_FAILED_PATH = `/${SIGN_IN_FAILED_ROUTE_SEGMENT}`;

export const CLIENT_PORTAL_ROUTE_SEGMENT = "client";
export const CLIENT_PORTAL_PATH = `/${CLIENT_PORTAL_ROUTE_SEGMENT}`;

export const COACH_PORTAL_ROUTE_SEGMENT = "coach";
export const COACH_PORTAL_PATH = `/${COACH_PORTAL_ROUTE_SEGMENT}`;

export const PORTAL_PATH_BY_ROLE = {
  CLIENT: CLIENT_PORTAL_PATH,
  COACH: COACH_PORTAL_PATH,
} satisfies Record<AccountRole, string>;

export const PORTAL_ROUTE_SEGMENTS = [
  COACH_PORTAL_ROUTE_SEGMENT,
  CLIENT_PORTAL_ROUTE_SEGMENT,
] as const;

export type PortalRouteSegment = (typeof PORTAL_ROUTE_SEGMENTS)[number];

export function portalForPathname(
  pathname: string,
): PortalRouteSegment | undefined {
  const firstSegment = pathname.split("/")[1];
  return PORTAL_ROUTE_SEGMENTS.find((segment) => segment === firstSegment);
}
