import type { ProductAsset } from "./product";

export type ProductAssetOpenResult =
  | { kind: "opened"; bytes: AsyncIterable<Uint8Array> }
  | { kind: "unavailable" };

export interface ProductAssetsPort {
  assertReady(): Promise<void>;
  openVerified(asset: ProductAsset): Promise<ProductAssetOpenResult>;
}
