import { useFragmentToken } from "@eli-coach-platform/ui/lib";

const PAYMENT_LINK_STORAGE_KEY = "coaching-sales:payment-link";

export function usePaymentLinkToken(): string | null {
  return useFragmentToken(PAYMENT_LINK_STORAGE_KEY);
}
