import { isStorageKeySegment } from "~/shared/private-files/storage-key-segment.server";

type ProgressPhotoKeyOwner = Record<"clientId" | "entryId" | "photoId", string>;

type ClientAvatarKeyOwner = Record<"clientId" | "avatarId", string>;

export const MEDIA_ALREADY_STORED_MESSAGE =
  "A client media file is already stored under this key.";

const AVATAR_FOLDER = "avatar";

export function progressPhotoStorageKey(owner: ProgressPhotoKeyOwner): string {
  const segments = [owner.clientId, owner.entryId, owner.photoId];

  if (!segments.every(isStorageKeySegment)) {
    throw new Error("Invalid progress photo owner.");
  }

  return `${segments.join("/")}.bin`;
}

export function clientAvatarStorageKey(owner: ClientAvatarKeyOwner): string {
  const segments = [owner.clientId, owner.avatarId];

  if (!segments.every(isStorageKeySegment)) {
    throw new Error("Invalid client avatar owner.");
  }

  return `${owner.clientId}/${AVATAR_FOLDER}/${owner.avatarId}.bin`;
}
