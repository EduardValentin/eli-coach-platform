export const STORE_ROUTE_SEGMENT = "store";
export const STORE_PATH = `/${STORE_ROUTE_SEGMENT}`;
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
