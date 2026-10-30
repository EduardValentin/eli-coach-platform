export type RecipePhotoOpening =
  | { status: "opened"; bytes: AsyncIterable<Uint8Array>; sizeBytes: number }
  | { status: "missing" };

export interface RecipePhotoStorePort {
  store(photoId: string, bytes: Uint8Array): Promise<void>;
  open(photoId: string): Promise<RecipePhotoOpening>;
  remove(photoId: string): Promise<void>;
}
