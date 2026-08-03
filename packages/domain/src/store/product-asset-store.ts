import type { ProductAsset } from "./models";

export class ProductAssetUnavailableError extends Error {
  constructor(message = "Product asset is unavailable.") {
    super(message);
    this.name = "ProductAssetUnavailableError";
  }
}

export interface ProductAssetStore {
  assertReady(): Promise<void>;
  openVerified(asset: ProductAsset): Promise<NodeJS.ReadableStream>;
}
