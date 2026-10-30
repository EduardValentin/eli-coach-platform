export interface ProductAssetWriterPort {
  write(content: ProductAssetContent): Promise<void>;
}
export type ProductAssetContent = {
  assetKey: string;
  bytes: Uint8Array;
};
