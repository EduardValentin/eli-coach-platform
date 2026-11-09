import type { PriceChangePlan, Product } from "./product";
import type { ProductAssetDigestPort } from "./product-asset-digest-port";
import {
  ProductPricing,
  type ProductPricingInput,
  type ProductPricingSnapshot,
} from "./product-pricing";
import type {
  PublicationIssue,
  PublishingPrincipal,
  PublishProductResult,
  StoredPublicationRecord,
} from "./product-publication";

export type PersistPriceChangeCommand = {
  idempotencyKey: string;
  payloadDigest: string;
  pricing: ProductPricingSnapshot;
  productId: number;
  productSlug: string;
  publishedBy: PublishingPrincipal;
};

export type PriceChangePlanResult =
  | { status: "valid"; plan: PriceChangePlan }
  | { status: "invalid"; issues: readonly PublicationIssue[] };

type ProductPriceChangeProps = {
  pricing: ProductPricingInput;
  productId: number;
};

export class ProductPriceChange {
  readonly pricing: ProductPricingInput;
  readonly productId: number;

  private constructor(props: ProductPriceChangeProps) {
    this.pricing = props.pricing;
    this.productId = props.productId;
  }

  static from(props: ProductPriceChangeProps): ProductPriceChange {
    return new ProductPriceChange(props);
  }

  requestDigest(productAssetDigestPort: ProductAssetDigestPort): string {
    const canonical = JSON.stringify([
      "reprice_product",
      this.productId,
      this.canonicalPricing(),
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

    const next = ProductPricing.parse(this.pricing);

    if (next.status === "invalid") {
      return next;
    }

    const decision = product.planPriceChange(next.pricing);

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
      pricing: plan.pricing.toSnapshot(),
      productId: plan.productId,
      productSlug: plan.productSlug,
      publishedBy: input.publishedBy,
    };
  }

  private canonicalPricing(): readonly (number | string | null)[] {
    return this.pricing.kind === "free"
      ? [this.pricing.kind]
      : [
          this.pricing.kind,
          this.pricing.eurCents ?? null,
          this.pricing.usdCents ?? null,
        ];
  }
}
