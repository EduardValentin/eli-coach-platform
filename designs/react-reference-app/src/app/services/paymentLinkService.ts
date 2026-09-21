export type PrototypePaymentLinkOutcome = 'sent' | 'delivery-failure';

export type PaymentLinkErrorCode = Exclude<
  PrototypePaymentLinkOutcome,
  'sent'
>;

export class PaymentLinkError extends Error {
  code: PaymentLinkErrorCode;

  constructor(code: PaymentLinkErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'PaymentLinkError';
  }
}

export const PAYMENT_LINK_ERROR_MESSAGES: Record<
  PaymentLinkErrorCode,
  string
> = {
  'delivery-failure':
    'The payment link was created, but the email could not be sent. Send it again in a moment.',
};

export type SentPaymentLink = {
  token: string;
  sentAt: Date;
};

export type PrototypePaymentLinkState = 'valid' | 'expired' | 'used' | 'invalid';

export type ResolvedPaymentLink =
  | { status: 'valid'; token: string }
  | { status: 'expired' }
  | { status: 'used' }
  | { status: 'invalid' };

export const SIMULATED_LATENCY_MS = 900;

function paymentLinkToken(): string {
  return `pl-${Math.random().toString(36).slice(2, 10)}`;
}

export async function sendPaymentLink(
  outcome: PrototypePaymentLinkOutcome,
): Promise<SentPaymentLink> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome !== 'sent') {
    throw new PaymentLinkError(outcome, PAYMENT_LINK_ERROR_MESSAGES[outcome]);
  }

  return { token: paymentLinkToken(), sentAt: new Date() };
}

export async function resolvePaymentLink(
  token: string,
  state: PrototypePaymentLinkState,
): Promise<ResolvedPaymentLink> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (state === 'valid') return { status: 'valid', token };

  return { status: state };
}
