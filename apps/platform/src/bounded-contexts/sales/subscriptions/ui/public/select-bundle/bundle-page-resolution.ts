import { useEffect } from "react";
import { useFetcher } from "react-router";

import {
  bundlePageSchema,
  type BundlePage,
} from "~/bounded-contexts/sales/subscriptions/public/subscriptions";
import { SUBSCRIPTIONS_API_PATHS } from "~/bounded-contexts/sales/subscriptions/public/paths";

import { usePaymentLinkToken } from "./payment-link-token";

export type BundlePageView = BundlePage | { state: "checking" };

const CHECKING: BundlePageView = { state: "checking" };

export function useBundlePageResolution(): {
  page: BundlePageView;
  token: string;
} {
  const token = usePaymentLinkToken();
  const { data, submit } = useFetcher<unknown>();

  useEffect(() => {
    if (token === null) {
      return;
    }

    void submit(
      { token },
      {
        action: SUBSCRIPTIONS_API_PATHS.bundlePage,
        encType: "application/json",
        method: "post",
      },
    );
  }, [submit, token]);

  return {
    page: data === undefined ? CHECKING : bundlePageSchema.parse(data),
    token: token ?? "",
  };
}
