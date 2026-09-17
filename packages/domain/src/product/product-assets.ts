import type { ProductAsset } from "./product";

export type ProductAssetOpenResult =
  | { kind: "opened"; bytes: AsyncIterable<Uint8Array> }
  | { kind: "unavailable" };

export interface ProductAssets {
  assertReady(): Promise<void>;
  openVerified(asset: ProductAsset): Promise<ProductAssetOpenResult>;
}

export type ProductAssetContent = {
  assetKey: string;
  bytes: Uint8Array;
};

export interface ProductAssetDigest {
  sha256(bytes: Uint8Array): string;
}

export interface ProductAssetWriter {
  write(content: ProductAssetContent): Promise<void>;
}
