import type { StoreCurrency } from "../product";

export type OrderPaymentSnapshot = {
  checkoutSessionId: string;
  paymentIntentId: string | null;
  amountMinorUnits: number;
  currency: string;
  paidAt: Date;
};

export class OrderPayment {
  readonly checkoutSessionId: string;
  readonly paymentIntentId: string | null;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly paidAt: Date;

  private constructor(snapshot: OrderPaymentSnapshot) {
    this.checkoutSessionId = snapshot.checkoutSessionId;
    this.paymentIntentId = snapshot.paymentIntentId;
    this.amountMinorUnits = snapshot.amountMinorUnits;
    this.currency = snapshot.currency;
    this.paidAt = snapshot.paidAt;
  }

  static received(snapshot: OrderPaymentSnapshot): OrderPayment {
    return new OrderPayment({
      ...snapshot,
      currency: snapshot.currency.toUpperCase(),
    });
  }

  static reconstitute(snapshot: OrderPaymentSnapshot): OrderPayment {
    return new OrderPayment(snapshot);
  }

  covers(totalMinorUnits: number, currency: StoreCurrency): boolean {
    return (
      this.amountMinorUnits === totalMinorUnits && this.currency === currency
    );
  }

  toSnapshot(): OrderPaymentSnapshot {
    return {
      checkoutSessionId: this.checkoutSessionId,
      paymentIntentId: this.paymentIntentId,
      amountMinorUnits: this.amountMinorUnits,
      currency: this.currency,
      paidAt: this.paidAt,
    };
  }
}
