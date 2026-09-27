import { addDays } from 'date-fns';

export type PrototypePaymentLinkOutcome = 'sent' | 'delivery-failure';

export const PAYMENT_LINK_VALIDITY_DAYS = 30;

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
  expiresAt: Date;
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

export function paymentLinkExpiresAt(sentAt: Date): Date {
  return addDays(sentAt, PAYMENT_LINK_VALIDITY_DAYS);
}

export async function sendPaymentLink(
  outcome: PrototypePaymentLinkOutcome,
): Promise<SentPaymentLink> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome !== 'sent') {
    throw new PaymentLinkError(outcome, PAYMENT_LINK_ERROR_MESSAGES[outcome]);
  }

  const sentAt = new Date();
  return {
    token: paymentLinkToken(),
    sentAt,
    expiresAt: paymentLinkExpiresAt(sentAt),
  };
}

export async function resolvePaymentLink(
  token: string,
  state: PrototypePaymentLinkState,
): Promise<ResolvedPaymentLink> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (state === 'valid') return { status: 'valid', token };

  return { status: state };
}
