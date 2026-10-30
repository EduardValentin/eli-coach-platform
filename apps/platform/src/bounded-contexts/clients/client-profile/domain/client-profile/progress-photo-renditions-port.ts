export type ProgressPhotoRendition =
  | { status: "rendered"; bytes: Uint8Array; mimeType: "image/jpeg" }
  | { status: "refused" };

export interface ProgressPhotoRenditionsPort {
  render(bytes: Uint8Array): Promise<ProgressPhotoRendition>;
}
