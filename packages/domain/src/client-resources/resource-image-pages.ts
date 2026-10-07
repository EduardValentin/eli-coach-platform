export type ResourceImageRendering =
  | { status: "rendered"; page: Uint8Array; thumbnail: Uint8Array }
  | { status: "refused" };

export interface ResourceImagePages {
  render(bytes: Uint8Array): Promise<ResourceImageRendering>;
}
