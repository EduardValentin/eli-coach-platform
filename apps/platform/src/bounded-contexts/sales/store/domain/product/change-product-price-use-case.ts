import type { ProductAssetDigestPort } from "./product-asset-digest-port";
import type { ProductPricingInput } from "./product-pricing";
import { ProductPriceChange } from "./product-price-change";
import type {
  PublishingPrincipal,
  PublishProductResult,
} from "./product-publication";
import type { StoreProductPublicationsPort } from "./store-product-publications-port";

export type ChangeProductPriceCommand = {
  idempotencyKey: string;
  pricing: ProductPricingInput;
  productId: number;
  publishedBy: PublishingPrincipal;
};

export class ChangeProductPriceUseCase {
  constructor(
    private readonly options: {
      productAssetDigestPort: ProductAssetDigestPort;
      storeProductPublicationsPort: StoreProductPublicationsPort;
    },
  ) {}

  async execute(
    command: ChangeProductPriceCommand,
  ): Promise<PublishProductResult> {
    try {
      const change = ProductPriceChange.from(command);
      const payloadDigest = change.requestDigest(
        this.options.productAssetDigestPort,
      );
      const settled = change.settle(
        await this.options.storeProductPublicationsPort.findPublicationByIdempotencyKey(
          command.idempotencyKey,
        ),
        payloadDigest,
      );

      if (settled) {
        return settled;
      }

      const planResult = change.plan(
        await this.options.storeProductPublicationsPort.findProductById(
          command.productId,
        ),
      );

      if (planResult.status === "invalid") {
        return planResult;
      }

      const persisted =
        await this.options.storeProductPublicationsPort.persistPriceChange(
          change.persistCommand(planResult.plan, {
            idempotencyKey: command.idempotencyKey,
            payloadDigest,
            publishedBy: command.publishedBy,
          }),
        );

      return persisted.status === "recorded"
        ? { status: "published", publication: persisted.publication }
        : persisted;
    } catch {
      return { status: "unavailable" };
    }
  }
}
