export type RecipePhotoRendition =
  { status: "rendered"; bytes: Uint8Array } | { status: "refused" };

export interface RecipePhotoRenditions {
  render(bytes: Uint8Array): Promise<RecipePhotoRendition>;
}
