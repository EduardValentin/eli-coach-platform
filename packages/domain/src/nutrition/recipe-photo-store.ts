export type RecipePhotoOpening =
  | { status: "opened"; bytes: AsyncIterable<Uint8Array>; sizeBytes: number }
  | { status: "missing" };

export interface RecipePhotoStore {
  store(photoId: string, bytes: Uint8Array): Promise<void>;
  open(photoId: string): Promise<RecipePhotoOpening>;
  remove(photoId: string): Promise<void>;
}
