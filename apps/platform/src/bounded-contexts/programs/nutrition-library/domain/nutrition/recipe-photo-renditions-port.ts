export type RecipePhotoRendition =
  { status: "rendered"; bytes: Uint8Array } | { status: "refused" };

export interface RecipePhotoRenditionsPort {
  render(bytes: Uint8Array): Promise<RecipePhotoRendition>;
}
