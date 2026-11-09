import type { StoreCurrency } from "../product";

type CheckoutLine = {
  title: string;
  amountMinorUnits: number;
};

export type OpenCheckoutCommand = {
  orderId: string;
  email: string;
  currency: StoreCurrency;
  lines: readonly CheckoutLine[];
  successUrl: string;
  cancelUrl: string;
};

export type OpenedCheckout = {
  sessionId: string;
  url: string;
};

export interface StoreCheckoutPort {
  open(command: OpenCheckoutCommand): Promise<OpenedCheckout>;
  isPaid(sessionId: string): Promise<boolean>;
}
