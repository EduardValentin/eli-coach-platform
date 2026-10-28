import {
  CLIENT_PORTAL_PATH,
  COACH_PORTAL_PATH,
} from "../../../access/public/paths";

export const INVITATION_ROUTE_SEGMENT = "invitation";

export const INVITATION_PATH = `/${INVITATION_ROUTE_SEGMENT}`;

export const CLIENT_WELCOME_ROUTE_SEGMENT = "welcome";

export const CLIENT_WELCOME_PATH = `${CLIENT_PORTAL_PATH}/${CLIENT_WELCOME_ROUTE_SEGMENT}`;

export const CLIENT_ONBOARDING_ROUTE_SEGMENT = "onboarding";

export const CLIENT_ONBOARDING_PATH = `${CLIENT_PORTAL_PATH}/${CLIENT_ONBOARDING_ROUTE_SEGMENT}`;

export const CLIENT_ANSWER_QUERY = "answer=1";

export const CLIENT_ENDED_ROUTE_SEGMENT = "ended";

export const CLIENT_ENDED_PATH = `${CLIENT_PORTAL_PATH}/${CLIENT_ENDED_ROUTE_SEGMENT}`;

export const COACH_CLIENTS_ROUTE_SEGMENT = "clients";

export const COACH_CLIENTS_PATH = `${COACH_PORTAL_PATH}/${COACH_CLIENTS_ROUTE_SEGMENT}`;

export function coachClientPath(clientId: string): string {
  return `${COACH_CLIENTS_PATH}/${encodeURIComponent(clientId)}`;
}

const PROFILE_SEGMENT = "profile";

export const COACH_CLIENT_PROFILE_ROUTE_SEGMENT = `${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId/${PROFILE_SEGMENT}`;

export function coachClientProfilePath(clientId: string): string {
  return `${coachClientPath(clientId)}/${PROFILE_SEGMENT}`;
}

export const CLIENTS_API_PATHS = {
  clients: "/api/clients",
  invitation: "/api/clients/invitation",
  invitationResends: "/api/clients/invitation-resends",
  ownIdentity: "/api/clients/identity",
} as const;

export function coachClientIdentityPath(clientId: string): string {
  return `${CLIENTS_API_PATHS.clients}/${encodeURIComponent(clientId)}/identity`;
}

export function invitationPath(link: { token: string }): string {
  return `${INVITATION_PATH}#${link.token}`;
}
