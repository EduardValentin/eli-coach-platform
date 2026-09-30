import type { ProgressPhotoOwner } from "@eli-coach-platform/domain/client-profile";

const STORAGE_KEY_SEGMENT = /^[A-Za-z0-9_-]+$/;

export const PHOTO_ALREADY_STORED_MESSAGE =
  "A progress photo is already stored for this owner.";

export function progressPhotoStorageKey(owner: ProgressPhotoOwner): string {
  const segments = [owner.clientId, owner.entryId, owner.photoId];

  if (!segments.every((segment) => STORAGE_KEY_SEGMENT.test(segment))) {
    throw new Error("Invalid progress photo owner.");
  }

  return `${segments.join("/")}.bin`;
}
