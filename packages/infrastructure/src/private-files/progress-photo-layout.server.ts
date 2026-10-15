import { isStorageKeySegment } from "./storage-key-segment.server";

type StorageKeyOwner = Record<"clientId" | "entryId" | "photoId", string>;

export const PHOTO_ALREADY_STORED_MESSAGE =
  "A progress photo is already stored for this owner.";

export function progressPhotoStorageKey(owner: StorageKeyOwner): string {
  const segments = [owner.clientId, owner.entryId, owner.photoId];

  if (!segments.every(isStorageKeySegment)) {
    throw new Error("Invalid progress photo owner.");
  }

  return `${segments.join("/")}.bin`;
}
