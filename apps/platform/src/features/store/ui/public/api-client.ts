import { joinBasePath } from "@eli-coach-platform/config";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import {
  storeAcquisitionResponseSchema,
  storeCatalogResponseSchema,
  type StoreAcquisitionResponse,
  type StoreCatalogResponse,
} from "~/features/store/contracts/store";

const STORE_CATALOG_ROUTE_PATH = "/api/store/catalog";
export const STORE_CATALOG_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  STORE_CATALOG_ROUTE_PATH,
);
export const STORE_ACQUISITIONS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  "/api/store/acquisitions",
);

export function useStoreCatalogFetcher(options: { enabled: boolean }) {
  const fetcher = useFetcher<StoreCatalogResponse>();
  const { data, load, state } = fetcher;
  const requestedForCurrentOpen = useRef(false);

  useEffect(() => {
    if (!options.enabled) {
      requestedForCurrentOpen.current = false;
      return;
    }

    if (requestedForCurrentOpen.current) {
      return;
    }

    requestedForCurrentOpen.current = true;
    void load(STORE_CATALOG_ROUTE_PATH);
  }, [load, options.enabled]);

  const parsedCatalog = storeCatalogResponseSchema.safeParse(data);
  const catalog =
    parsedCatalog.success && parsedCatalog.data.success
      ? parsedCatalog.data.products
      : undefined;

  return {
    data: catalog,
    isError:
      state === "idle" &&
      data !== undefined &&
      (!parsedCatalog.success || !parsedCatalog.data.success),
    isPending:
      options.enabled && !catalog && (data === undefined || state !== "idle"),
  };
}

export function useStoreAcquisitionMutation() {
  return useMutation({
    mutationFn: submitStoreAcquisition,
  });
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
