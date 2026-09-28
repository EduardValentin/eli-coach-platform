import {
  CLIENT_PORTAL_PATH,
  COACH_PORTAL_PATH,
} from "../../accounts/contracts/paths";

export const SELECT_BUNDLE_ROUTE_SEGMENT = "select-bundle";

const SELECT_BUNDLE_PATH = `/${SELECT_BUNDLE_ROUTE_SEGMENT}`;

export const CHECKOUT_COMPLETE_ROUTE_SEGMENT = "checkout/complete";

export const CHECKOUT_COMPLETE_PATH = `/${CHECKOUT_COMPLETE_ROUTE_SEGMENT}`;

export const INVITATION_ROUTE_SEGMENT = "invitation";

export const INVITATION_PATH = `/${INVITATION_ROUTE_SEGMENT}`;

export const CLIENT_WELCOME_ROUTE_SEGMENT = "welcome";

export const CLIENT_WELCOME_PATH = `${CLIENT_PORTAL_PATH}/${CLIENT_WELCOME_ROUTE_SEGMENT}`;

export const CLIENT_ONBOARDING_ROUTE_SEGMENT = "onboarding";

export const CLIENT_ONBOARDING_PATH = `${CLIENT_PORTAL_PATH}/${CLIENT_ONBOARDING_ROUTE_SEGMENT}`;

export const CLIENT_ANSWER_QUERY = "answer=1";

export const COACH_CLIENTS_ROUTE_SEGMENT = "clients";

export const COACH_CLIENTS_PATH = `${COACH_PORTAL_PATH}/${COACH_CLIENTS_ROUTE_SEGMENT}`;

export function coachClientPath(clientId: string): string {
  return `${COACH_CLIENTS_PATH}/${encodeURIComponent(clientId)}`;
}

export const COACHING_SALES_API_PATHS = {
  paymentLinks: "/api/coaching-sales/payment-links",
  bundlePage: "/api/coaching-sales/bundle-page",
  checkouts: "/api/coaching-sales/checkouts",
  invitation: "/api/coaching-sales/invitation",
  invitationResends: "/api/coaching-sales/invitation-resends",
} as const;

type SelectBundleLink = {
  token?: string;
  payment?: "cancelled";
  bundle?: string;
  start?: string;
};

export function selectBundlePath(link: SelectBundleLink): string {
  const params = new URLSearchParams();

  for (const name of ["payment", "bundle", "start"] as const) {
    const value = link[name];

    if (value) {
      params.set(name, value);
    }
  }

  const search = params.toString();
  const query = search ? `?${search}` : "";
  const fragment = link.token ? `#${link.token}` : "";

  return `${SELECT_BUNDLE_PATH}${query}${fragment}`;
}

export function invitationPath(link: { token: string }): string {
  return `${INVITATION_PATH}#${link.token}`;
}
