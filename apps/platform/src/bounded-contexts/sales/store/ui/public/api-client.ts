import { joinBasePath } from "~/shared/http/base-path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { STORE_API_PATHS } from "~/bounded-contexts/sales/store/public/paths";
import {
  storeAcquisitionResponseSchema,
  storeCatalogResponseSchema,
  type StoreAcquisitionResponse,
  type StoreCatalogResponse,
} from "~/bounded-contexts/sales/store/public/store";
import {
  storeCheckoutResponseSchema,
  storeOrderEmailResendResponseSchema,
  type StoreCheckoutResponse,
  type StoreOrderEmailResendOutcome,
} from "~/bounded-contexts/sales/store/public/store-orders";

export type StoreOrderEmailOutcome =
  StoreOrderEmailResendOutcome | "unavailable";

const STORE_CATALOG_ROUTE_PATH = STORE_API_PATHS.catalog;
export const STORE_CATALOG_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  STORE_CATALOG_ROUTE_PATH,
);
export const STORE_ACQUISITIONS_API_PATH = STORE_API_PATHS.acquisitions;
export const STORE_ACQUISITIONS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  STORE_ACQUISITIONS_API_PATH,
);
export const STORE_CHECKOUTS_API_PATH = STORE_API_PATHS.checkouts;
export const STORE_CHECKOUTS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  STORE_CHECKOUTS_API_PATH,
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

export function useStoreAcquisitionFetcher() {
  return useKeyedSubmissionFetcher({
    action: STORE_ACQUISITIONS_API_PATH,
    parseResponse: parseStoreAcquisitionResponse,
  });
}

export function useStoreCheckoutFetcher() {
  return useKeyedSubmissionFetcher({
    action: STORE_CHECKOUTS_API_PATH,
    parseResponse: parseStoreCheckoutResponse,
  });
}

export function useStoreOrderEmailFetcher() {
  const fetcher = useFetcher<unknown>();
  const { data, state, submit: fetcherSubmit } = fetcher;
  const isSubmitting = state !== "idle";
  const submit = useCallback(
    (sessionId: string) => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      void fetcherSubmit(formData, {
        action: STORE_API_PATHS.orderEmails,
        method: "post",
      });
    },
    [fetcherSubmit],
  );

  return {
    isSubmitting,
    outcome:
      isSubmitting || data === undefined
        ? null
        : parseStoreOrderEmailOutcome(data),
    submit,
  };
}

// The fetcher is re-keyed to forget a response the drawer has dealt with; a
// keyed fetcher is torn down when its key goes out of use, so the discarded
// response can never re-run the effect that reads it.
function useKeyedSubmissionFetcher<Response>(options: {
  action: string;
  parseResponse: (data: unknown) => Response;
}) {
  const { action, parseResponse } = options;
  const [fetcherKey, setFetcherKey] = useState(createFetcherKey);
  const fetcher = useFetcher<unknown>({ key: fetcherKey });
  const { data, state, submit: fetcherSubmit } = fetcher;
  const isSubmitting = state === "submitting";
  const parsedResponse = useMemo(
    () => (data === undefined ? null : parseResponse(data)),
    [data, parseResponse],
  );
  const submit = useCallback(
    (formData: FormData) => {
      void fetcherSubmit(formData, { action, method: "post" });
    },
    [action, fetcherSubmit],
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

function parseStoreAcquisitionResponse(
  data: unknown,
): StoreAcquisitionResponse {
  const parsedResponse = storeAcquisitionResponseSchema.safeParse(data);

  return parsedResponse.success
    ? parsedResponse.data
    : createStoreServerErrorResponse();
}

function parseStoreCheckoutResponse(data: unknown): StoreCheckoutResponse {
  const parsedResponse = storeCheckoutResponseSchema.safeParse(data);

  return parsedResponse.success
    ? parsedResponse.data
    : {
        error: {
          code: "checkout_unavailable",
          message: "Checkout is temporarily unavailable.",
        },
        success: false,
      };
}

function parseStoreOrderEmailOutcome(data: unknown): StoreOrderEmailOutcome {
  const parsedResponse = storeOrderEmailResendResponseSchema.safeParse(data);

  if (!parsedResponse.success || !parsedResponse.data.success) {
    return "unavailable";
  }

  return parsedResponse.data.outcome;
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
