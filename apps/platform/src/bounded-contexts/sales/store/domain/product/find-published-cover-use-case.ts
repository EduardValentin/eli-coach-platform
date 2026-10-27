import type { PublishedProductCover } from "./product";
import type { StoreCatalog } from "./store-catalog";

export type PublishedCoverResult =
  | { status: "available"; cover: PublishedProductCover }
  | { status: "not_found" }
  | { status: "unavailable" };

export class FindPublishedCoverUseCase {
  constructor(private readonly options: { catalog: StoreCatalog }) {}

  async execute(assetKey: string): Promise<PublishedCoverResult> {
    try {
      const cover =
        await this.options.catalog.getPublishedCoverByAssetKey(assetKey);

      return cover ? { status: "available", cover } : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
