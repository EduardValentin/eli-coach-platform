import type { NewPaymentLink, PaymentLink } from "./payment-link";

export interface PaymentLinks {
  findByTokenSha256(tokenSha256: string): Promise<PaymentLink | null>;
  issue(link: NewPaymentLink): Promise<PaymentLink>;
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
