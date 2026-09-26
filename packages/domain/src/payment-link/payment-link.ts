export type PaymentLinkState = "valid" | "voided" | "spent";

export type NewPaymentLink = {
  assessmentCallId: string;
  tokenSha256: string;
  createdAt: Date;
  expiresAt: Date;
};

type PaymentLinkProps = {
  id: string;
  assessmentCallId: string;
  tokenSha256: string;
  createdAt: Date;
  expiresAt: Date;
  state: PaymentLinkState;
  paymentCustomerId: string | null;
};

const PAYMENT_LINK_VALIDITY_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MINIMUM_TOKEN_LENGTH = 6;

export class PaymentLink {
  readonly id: string;
  readonly assessmentCallId: string;
  readonly tokenSha256: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly state: PaymentLinkState;
  readonly paymentCustomerId: string | null;

  private constructor(props: PaymentLinkProps) {
    this.id = props.id;
    this.assessmentCallId = props.assessmentCallId;
    this.tokenSha256 = props.tokenSha256;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this.state = props.state;
    this.paymentCustomerId = props.paymentCustomerId;
  }

  static reconstitute(props: PaymentLinkProps): PaymentLink {
    return new PaymentLink(props);
  }

  static issue(input: {
    assessmentCallId: string;
    tokenSha256: string;
    now: Date;
  }): NewPaymentLink {
    return {
      assessmentCallId: input.assessmentCallId,
      tokenSha256: input.tokenSha256,
      createdAt: input.now,
      expiresAt: new Date(
        input.now.getTime() + PAYMENT_LINK_VALIDITY_DAYS * MILLISECONDS_PER_DAY,
      ),
    };
  }

  static isPlausibleToken(rawToken: string): boolean {
    return rawToken.length >= MINIMUM_TOKEN_LENGTH;
  }

  isUsable(now: Date): boolean {
    return this.state === "valid" && now < this.expiresAt;
  }
}
