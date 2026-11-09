export interface PaymentLinkTokenGeneratorPort {
  create(): { rawToken: string; sha256: string };
}
