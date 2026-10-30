import type { PaymentLink } from "./payment-link";

export interface PaymentLinksPort {
  findByTokenSha256(tokenSha256: string): Promise<PaymentLink | null>;
  issue(link: PaymentLink): Promise<void>;
  voidOtherLinksOf(assessmentCallId: string, keepId: string): Promise<void>;
  void(id: string): Promise<void>;
  findPaymentCustomerForCall(assessmentCallId: string): Promise<string | null>;
  rememberPaymentCustomer(
    paymentLinkId: string,
    paymentCustomerId: string,
  ): Promise<void>;
}
