export const SELECT_BUNDLE_ROUTE_SEGMENT = "select-bundle";

const SELECT_BUNDLE_PATH = `/${SELECT_BUNDLE_ROUTE_SEGMENT}`;

export const CHECKOUT_COMPLETE_ROUTE_SEGMENT = "checkout/complete";

export const CHECKOUT_COMPLETE_PATH = `/${CHECKOUT_COMPLETE_ROUTE_SEGMENT}`;

const INVITATION_ROUTE_SEGMENT = "invitation";

const INVITATION_PATH = `/${INVITATION_ROUTE_SEGMENT}`;

export const COACHING_SALES_API_PATHS = {
  paymentLinks: "/api/coaching-sales/payment-links",
  bundlePage: "/api/coaching-sales/bundle-page",
  checkouts: "/api/coaching-sales/checkouts",
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
