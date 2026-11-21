import {
  COACH_PORTAL_ROUTE_SEGMENT,
  type PortalRouteHandle,
} from "../../../access/public/paths";
import {
  COACH_CLIENTS_ROUTE_SEGMENT,
  coachClientPath,
} from "../../../clients/public/paths";

const PROGRAM_SETUP_SEGMENT = "program/new";

export const PROGRAM_SETUP_ROUTE_SEGMENT = `${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId/${PROGRAM_SETUP_SEGMENT}`;

export const PROGRAM_SETUP_ROUTE_HANDLE = {
  portal: COACH_PORTAL_ROUTE_SEGMENT,
} satisfies PortalRouteHandle;

export function programSetupPath(clientId: string): string {
  return `${coachClientPath(clientId)}/${PROGRAM_SETUP_SEGMENT}`;
}
