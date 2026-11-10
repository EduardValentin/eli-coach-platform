export interface PaymentLinkTokenHasherPort {
  sha256(rawToken: string): string;
}
