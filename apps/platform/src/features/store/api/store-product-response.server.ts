import { joinBasePath } from "@eli-coach-platform/config";
import type { PublishedStoreProduct } from "@eli-coach-platform/domain";

import {
  storeProductSchema,
  type StoreProduct,
} from "~/features/store/contracts/store";

export function toStoreProduct(
  product: PublishedStoreProduct,
  options: { appBasePath: string },
): StoreProduct {
  return storeProductSchema.parse({
    cardSummary: product.version.cardSummary,
    cover: {
      alt: product.version.cover.alt,
      url: joinBasePath(
        options.appBasePath,
        `/api/store/covers/${encodeURIComponent(
          product.version.cover.assetKey,
        )}`,
      ),
    },
    creatorName: product.version.creatorName,
    detailDescription: product.version.detailDescription,
    goals: product.version.goals,
    includedItems: product.version.includedItems,
    slug: product.slug,
    title: product.version.title,
    types: product.version.types,
  });
}
