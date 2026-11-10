export type OrderCheckoutSnapshot = {
  sessionId: string;
  url: string;
};

export class OrderCheckout {
  readonly sessionId: string;
  readonly url: string;

  private constructor(snapshot: OrderCheckoutSnapshot) {
    this.sessionId = snapshot.sessionId;
    this.url = snapshot.url;
  }

  static opened(snapshot: OrderCheckoutSnapshot): OrderCheckout {
    return new OrderCheckout(snapshot);
  }

  static reconstitute(snapshot: OrderCheckoutSnapshot): OrderCheckout {
    return new OrderCheckout(snapshot);
  }

  holdsSession(sessionId: string): boolean {
    return this.sessionId === sessionId;
  }

  toSnapshot(): OrderCheckoutSnapshot {
    return { sessionId: this.sessionId, url: this.url };
  }
}
