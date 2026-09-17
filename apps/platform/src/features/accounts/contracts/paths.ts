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
