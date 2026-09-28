import { useFragmentToken } from "~/features/coaching-sales/ui/public/fragment-token";

const PAYMENT_LINK_STORAGE_KEY = "coaching-sales:payment-link";

export function usePaymentLinkToken(): string | null {
  return useFragmentToken(PAYMENT_LINK_STORAGE_KEY);
}
