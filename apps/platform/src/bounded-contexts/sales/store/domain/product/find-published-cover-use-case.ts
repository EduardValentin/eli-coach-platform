import type { PublishedProductCover } from "./product";
import type { StoreCatalogPort } from "./store-catalog-port";

export type PublishedCoverResult =
  | { status: "available"; cover: PublishedProductCover }
  | { status: "not_found" }
  | { status: "unavailable" };

export class FindPublishedCoverUseCase {
  constructor(
    private readonly options: { storeCatalogPort: StoreCatalogPort },
  ) {}

  async execute(assetKey: string): Promise<PublishedCoverResult> {
    try {
      const cover =
        await this.options.storeCatalogPort.getPublishedCoverByAssetKey(
          assetKey,
        );

      return cover ? { status: "available", cover } : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
