import { useFragmentToken } from './useFragmentToken';

const PAYMENT_LINK_STORAGE_KEY = 'subscriptions:payment-link';

export function usePaymentLinkToken(): string | null {
  return useFragmentToken(PAYMENT_LINK_STORAGE_KEY);
}
