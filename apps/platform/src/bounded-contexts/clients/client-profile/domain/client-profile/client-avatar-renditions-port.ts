export type ClientAvatarRendition =
  | { status: "rendered"; bytes: Uint8Array; mimeType: "image/jpeg" }
  | { status: "refused" };

export interface ClientAvatarRenditionsPort {
  render(bytes: Uint8Array): Promise<ClientAvatarRendition>;
}
