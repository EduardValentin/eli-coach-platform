import { STORE_PATH } from "../../public/paths";

export const STORE_ROUTE_SEGMENT = STORE_PATH.slice(1);
export const STORE_DOWNLOAD_PATH = `${STORE_PATH}/download`;

export function storeProductPath(slug: string): string {
  return `${STORE_PATH}/${slug}`;
}

export const STORE_API_PATHS = {
  catalog: `/api/${STORE_ROUTE_SEGMENT}/catalog`,
  acquisitions: `/api/${STORE_ROUTE_SEGMENT}/acquisitions`,
  downloads: `/api/${STORE_ROUTE_SEGMENT}/downloads`,
  covers: `/api/${STORE_ROUTE_SEGMENT}/covers`,
  checkouts: `/api/${STORE_ROUTE_SEGMENT}/checkouts`,
  orderEmails: `/api/${STORE_ROUTE_SEGMENT}/orders/email`,
};

export const STORE_CHECKOUT_COMPLETE_ROUTE_SEGMENT = `${STORE_ROUTE_SEGMENT}/checkout/complete`;
export const STORE_CHECKOUT_COMPLETE_PATH = `/${STORE_CHECKOUT_COMPLETE_ROUTE_SEGMENT}`;
export const STORE_CHECKOUT_SESSION_PARAM = "session_id";
export const STORE_PAYMENT_PARAM = "payment";
export const STORE_PAYMENT_CANCELLED = "cancelled";
