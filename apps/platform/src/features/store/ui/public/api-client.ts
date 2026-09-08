import { joinBasePath } from "@eli-coach-platform/config";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
export const STORE_ACQUISITIONS_ROUTE_PATH = "/api/store/acquisitions";
export const STORE_ACQUISITIONS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  STORE_ACQUISITIONS_ROUTE_PATH,
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

// The fetcher is re-keyed to forget a response the drawer has dealt with; a
// keyed fetcher is torn down when its key goes out of use, so the discarded
// response can never re-run the effect that reads it.
export function useStoreAcquisitionFetcher() {
  const [fetcherKey, setFetcherKey] = useState(createFetcherKey);
  const fetcher = useFetcher<unknown>({ key: fetcherKey });
  const { data, state, submit: fetcherSubmit } = fetcher;
  const isSubmitting = state === "submitting";
  const parsedResponse = useMemo(
    () => (data === undefined ? null : parseStoreAcquisitionResponse(data)),
    [data],
  );
  const submit = useCallback(
    (formData: FormData) => {
      void fetcherSubmit(formData, {
        action: STORE_ACQUISITIONS_ROUTE_PATH,
        method: "post",
      });
    },
    [fetcherSubmit],
  );
  const reset = useCallback(() => {
    setFetcherKey(createFetcherKey());
  }, []);

  return {
    isSubmitting,
    reset,
    response: isSubmitting ? null : parsedResponse,
    submit,
  };
}

export function parseStoreAcquisitionResponse(
  data: unknown,
): StoreAcquisitionResponse {
  const parsedResponse = storeAcquisitionResponseSchema.safeParse(data);

  return parsedResponse.success
    ? parsedResponse.data
    : createStoreServerErrorResponse();
}

function createFetcherKey(): string {
  return globalThis.crypto.randomUUID();
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
