import {
  COACH_PORTAL_ROUTE_SEGMENT,
  type PortalRouteHandle,
} from "../../../access/public/paths";
import {
  COACH_CLIENTS_ROUTE_SEGMENT,
  coachClientPath,
} from "../../../clients/public/paths";

const PROGRAM_SETUP_SEGMENT = "program/new";

const PROGRAM_DRAFT_SEGMENT = "program/draft";

const COACH_CLIENTS_API = "/api/coach/clients";

export const PROGRAM_SETUP_ROUTE_SEGMENT = `${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId/${PROGRAM_SETUP_SEGMENT}`;

export const PROGRAM_BUILDER_ROUTE_SEGMENT = `${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId/${PROGRAM_DRAFT_SEGMENT}`;

export const PROGRAM_SETUP_ROUTE_HANDLE = {
  portal: COACH_PORTAL_ROUTE_SEGMENT,
} satisfies PortalRouteHandle;

export const TRAINING_PROGRAMS_API_PATHS = {
  programDraft: `${COACH_CLIENTS_API}/:clientId/${PROGRAM_DRAFT_SEGMENT}`,
} as const;

export function programSetupPath(clientId: string): string {
  return `${coachClientPath(clientId)}/${PROGRAM_SETUP_SEGMENT}`;
}

export function programBuilderPath(clientId: string): string {
  return `${coachClientPath(clientId)}/${PROGRAM_DRAFT_SEGMENT}`;
}

export function programDraftSavePath(clientId: string): string {
  return `${COACH_CLIENTS_API}/${encodeURIComponent(clientId)}/${PROGRAM_DRAFT_SEGMENT}`;
}
