export const SELECT_BUNDLE_ROUTE_SEGMENT = "select-bundle";

const SELECT_BUNDLE_PATH = `/${SELECT_BUNDLE_ROUTE_SEGMENT}`;

export const CHECKOUT_COMPLETE_ROUTE_SEGMENT = "checkout/complete";

export const CHECKOUT_COMPLETE_PATH = `/${CHECKOUT_COMPLETE_ROUTE_SEGMENT}`;

export const COACHING_SALES_API_PATHS = {
  paymentLinks: "/api/coaching-sales/payment-links",
  checkouts: "/api/coaching-sales/checkouts",
  stripeWebhooks: "/api/stripe/webhooks",
} as const;

type SelectBundleQuery = {
  token: string;
  payment?: "cancelled";
  bundle?: string;
  start?: string;
};

export function selectBundlePath(query: SelectBundleQuery): string {
  const params = new URLSearchParams({ token: query.token });

  for (const name of ["payment", "bundle", "start"] as const) {
    const value = query[name];

    if (value) {
      params.set(name, value);
    }
  }

  return `${SELECT_BUNDLE_PATH}?${params.toString()}`;
}
