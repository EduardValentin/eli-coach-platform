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
};
