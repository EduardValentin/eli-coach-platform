import type {
  PaymentSubscriptionStanding,
  PaymentInvoiceReason,
  PaymentCardChangeKind,
} from "./payment-provider-vocabulary.server";

export type PaymentProviderVocabularyPort = {
  standingOf: (status: string) => PaymentSubscriptionStanding;
  invoiceReasonOf: (billingReason: string | null) => PaymentInvoiceReason;
  cardChangeOf: (eventType: string) => PaymentCardChangeKind | null;
  isCardPaymentMethod: (paymentMethodType: string) => boolean;
};
