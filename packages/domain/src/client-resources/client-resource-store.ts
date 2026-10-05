export type ClientResourceOwner = { clientId: string; resourceId: string };

export type ResourcePageImage = { pageNumber: number; bytes: Uint8Array };

export type StoredResourceOriginal = {
  bytes: AsyncIterable<Uint8Array>;
  sizeBytes: number;
};

export interface ClientResourceStore {
  storeOriginal(owner: ClientResourceOwner, bytes: Uint8Array): Promise<void>;
  storePage(owner: ClientResourceOwner, page: ResourcePageImage): Promise<void>;
  storeThumbnail(owner: ClientResourceOwner, bytes: Uint8Array): Promise<void>;
  openOriginal(
    owner: ClientResourceOwner,
  ): Promise<StoredResourceOriginal | null>;
  openPage(
    owner: ClientResourceOwner,
    pageNumber: number,
  ): Promise<Uint8Array | null>;
  openThumbnail(owner: ClientResourceOwner): Promise<Uint8Array | null>;
  remove(owner: ClientResourceOwner): Promise<void>;
}
