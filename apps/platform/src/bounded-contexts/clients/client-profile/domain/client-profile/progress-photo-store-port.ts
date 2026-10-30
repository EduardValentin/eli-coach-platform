import type { ProgressPhotoReference } from "./progress-photo-reference";

export type ProgressPhotoOwner = {
  clientId: string;
  entryId: string;
  photoId: string;
};

export interface ProgressPhotoStorePort {
  store(
    owner: ProgressPhotoOwner,
    bytes: Uint8Array,
  ): Promise<ProgressPhotoReference>;
  open(reference: ProgressPhotoReference): Promise<Uint8Array | null>;
  delete(reference: ProgressPhotoReference): Promise<void>;
}
