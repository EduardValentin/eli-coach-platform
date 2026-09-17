import type { ProductAsset } from "../models";

export type ProductAssetOpenResult =
  | { kind: "opened"; bytes: AsyncIterable<Uint8Array> }
  | { kind: "unavailable" };

export interface ProductAssets {
  assertReady(): Promise<void>;
  openVerified(asset: ProductAsset): Promise<ProductAssetOpenResult>;
}
