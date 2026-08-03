import { joinBasePath } from "@eli-coach-platform/config";
import {
  storeAcquisitionResponseSchema,
  storeCatalogResponseSchema,
  type StoreAcquisitionResponse,
  type StoreProduct,
} from "@eli-coach-platform/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";

export const STORE_CATALOG_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  "/api/store/catalog",
);
export const STORE_ACQUISITIONS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  "/api/store/acquisitions",
);
export const STORE_CATALOG_QUERY_KEY = ["marketing", "store-catalog"] as const;

export function useStoreCatalogQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled,
    queryFn: ({ signal }) => fetchStoreCatalog(signal),
    queryKey: STORE_CATALOG_QUERY_KEY,
  });
}

export function useStoreAcquisitionMutation() {
  return useMutation({
    mutationFn: submitStoreAcquisition,
  });
}

export async function fetchStoreCatalog(
  signal: AbortSignal,
): Promise<readonly StoreProduct[]> {
  const response = await fetch(STORE_CATALOG_API_URL, {
    headers: { Accept: "application/json" },
    signal,
  });
  const parsedResponse = storeCatalogResponseSchema.safeParse(
    await readJsonSafely(response),
  );

  if (!parsedResponse.success) {
    throw new Error("The store is temporarily unavailable.");
  }

  if (!parsedResponse.data.success) {
    throw new Error(parsedResponse.data.error.message);
  }

  return parsedResponse.data.products;
}

export async function submitStoreAcquisition(
  formData: FormData,
): Promise<StoreAcquisitionResponse> {
  try {
    const response = await fetch(STORE_ACQUISITIONS_API_URL, {
      body: formData,
      headers: { Accept: "application/json" },
      method: "POST",
    });
    const parsedResponse = storeAcquisitionResponseSchema.safeParse(
      await response.json(),
    );

    return parsedResponse.success
      ? parsedResponse.data
      : createStoreServerErrorResponse();
  } catch {
    return createStoreServerErrorResponse();
  }
}

function createStoreServerErrorResponse(): StoreAcquisitionResponse {
  return {
    error: {
      code: "server_error",
      message: "Unable to deliver store resources.",
    },
    success: false,
  };
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
