import type { PaymentLink } from "./payment-link";

export interface PaymentLinks {
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

export interface PaymentLinkTokenGenerator {
  create(): { rawToken: string; sha256: string };
}

export interface PaymentLinkTokenHasher {
  sha256(rawToken: string): string;
}
