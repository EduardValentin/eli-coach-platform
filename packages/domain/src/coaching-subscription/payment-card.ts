export type PaymentCardSnapshot = {
  brand: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  paymentMethodId: string;
};

export type PaymentCardEvent =
  | { kind: "card-attached"; paymentCustomerId: string; card: PaymentCard }
  | { kind: "card-updated"; paymentCustomerId: string; card: PaymentCard }
  | {
      kind: "card-detached";
      paymentCustomerId: string;
      paymentMethodId: string;
    };

export type PaymentCardEventKind = PaymentCardEvent["kind"];

export class PaymentCard {
  readonly brand: string;
  readonly lastFour: string;
  readonly expiryMonth: number;
  readonly expiryYear: number;
  readonly paymentMethodId: string;

  private constructor(snapshot: PaymentCardSnapshot) {
    this.brand = snapshot.brand;
    this.lastFour = snapshot.lastFour;
    this.expiryMonth = snapshot.expiryMonth;
    this.expiryYear = snapshot.expiryYear;
    this.paymentMethodId = snapshot.paymentMethodId;
  }

  static of(snapshot: PaymentCardSnapshot): PaymentCard {
    return new PaymentCard(snapshot);
  }

  static mirror(
    stored: PaymentCard | null,
    event: PaymentCardEvent,
  ): PaymentCard | null {
    if (event.kind !== "card-detached") {
      return event.card;
    }

    return stored?.paymentMethodId === event.paymentMethodId ? null : stored;
  }

  toSnapshot(): PaymentCardSnapshot {
    return {
      brand: this.brand,
      lastFour: this.lastFour,
      expiryMonth: this.expiryMonth,
      expiryYear: this.expiryYear,
      paymentMethodId: this.paymentMethodId,
    };
  }
}
