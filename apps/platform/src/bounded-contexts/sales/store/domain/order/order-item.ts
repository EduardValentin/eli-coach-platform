import type { PublishedProduct, StoreCurrency } from "../product";

export type OrderItemSnapshot = {
  productId: number;
  productSlug: string;
  productVersionId: number;
  title: string;
  amountMinorUnits: number;
};

export type OrderLine = {
  title: string;
  amountMinorUnits: number | null;
};

export class OrderItem {
  readonly productId: number;
  readonly productSlug: string;
  readonly productVersionId: number;
  readonly title: string;
  readonly amountMinorUnits: number;

  private constructor(snapshot: OrderItemSnapshot) {
    this.productId = snapshot.productId;
    this.productSlug = snapshot.productSlug;
    this.productVersionId = snapshot.productVersionId;
    this.title = snapshot.title;
    this.amountMinorUnits = snapshot.amountMinorUnits;
  }

  static priced(product: PublishedProduct, currency: StoreCurrency): OrderItem {
    return new OrderItem({
      productId: product.id,
      productSlug: product.slug,
      productVersionId: product.version.id,
      title: product.version.title,
      amountMinorUnits: product.pricing.amountIn(currency),
    });
  }

  static reconstitute(snapshot: OrderItemSnapshot): OrderItem {
    return new OrderItem(snapshot);
  }

  isPaid(): boolean {
    return this.amountMinorUnits > 0;
  }

  line(): OrderLine {
    return {
      title: this.title,
      amountMinorUnits: this.isPaid() ? this.amountMinorUnits : null,
    };
  }

  toSnapshot(): OrderItemSnapshot {
    return {
      productId: this.productId,
      productSlug: this.productSlug,
      productVersionId: this.productVersionId,
      title: this.title,
      amountMinorUnits: this.amountMinorUnits,
    };
  }
}
