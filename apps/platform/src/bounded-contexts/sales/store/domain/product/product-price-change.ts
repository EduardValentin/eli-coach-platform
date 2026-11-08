import type { PriceChangePlan, Product } from "./product";
import type { ProductAssetDigestPort } from "./product-asset-digest-port";
import {
  ProductPrice,
  type ProductPriceInput,
  type ProductPriceSnapshot,
} from "./product-price";
import type {
  PublicationIssue,
  PublishingPrincipal,
  PublishProductResult,
  StoredPublicationRecord,
} from "./product-publication";

export type PersistPriceChangeCommand = {
  idempotencyKey: string;
  payloadDigest: string;
  price: ProductPriceSnapshot | null;
  productId: number;
  productSlug: string;
  publishedBy: PublishingPrincipal;
};

export type PriceChangePlanResult =
  | { status: "valid"; plan: PriceChangePlan }
  | { status: "invalid"; issues: readonly PublicationIssue[] };

type ProductPriceChangeProps = {
  prices: ProductPriceInput | null;
  productId: number;
};

export class ProductPriceChange {
  readonly prices: ProductPriceInput | null;
  readonly productId: number;

  private constructor(props: ProductPriceChangeProps) {
    this.prices = props.prices;
    this.productId = props.productId;
  }

  static from(props: ProductPriceChangeProps): ProductPriceChange {
    return new ProductPriceChange(props);
  }

  requestDigest(productAssetDigestPort: ProductAssetDigestPort): string {
    const canonical = JSON.stringify([
      "reprice_product",
      this.productId,
      this.prices === null
        ? null
        : [this.prices.eurCents ?? null, this.prices.usdCents ?? null],
    ]);

    return productAssetDigestPort.sha256(new TextEncoder().encode(canonical));
  }

  settle(
    existing: StoredPublicationRecord | null,
    payloadDigest: string,
  ): PublishProductResult | null {
    if (!existing) {
      return null;
    }

    return existing.payloadDigest === payloadDigest
      ? { status: "replayed", publication: existing.publication }
      : { status: "idempotency_conflict" };
  }

  plan(product: Product | null): PriceChangePlanResult {
    if (!product) {
      return { status: "invalid", issues: [{ code: "product_not_found" }] };
    }

    const next = this.nextPrice();

    if (next.status === "invalid") {
      return next;
    }

    const decision = product.planPriceChange(next.price);

    return decision.status === "refused"
      ? { status: "invalid", issues: [decision.issue] }
      : { status: "valid", plan: decision.plan };
  }

  persistCommand(
    plan: PriceChangePlan,
    input: {
      idempotencyKey: string;
      payloadDigest: string;
      publishedBy: PublishingPrincipal;
    },
  ): PersistPriceChangeCommand {
    return {
      idempotencyKey: input.idempotencyKey,
      payloadDigest: input.payloadDigest,
      price: plan.price?.toSnapshot() ?? null,
      productId: plan.productId,
      productSlug: plan.productSlug,
      publishedBy: input.publishedBy,
    };
  }

  private nextPrice():
    | { status: "valid"; price: ProductPrice | null }
    | { status: "invalid"; issues: readonly PublicationIssue[] } {
    return this.prices === null
      ? { status: "valid", price: null }
      : ProductPrice.parse(this.prices);
  }
}
