import { isStorageKeySegment } from "./storage-key-segment.server";

type StorageKeyOwner = Record<"clientId" | "resourceId", string>;

export function clientResourceFolderKey(owner: StorageKeyOwner): string {
  const segments = [owner.clientId, owner.resourceId];

  if (!segments.every(isStorageKeySegment)) {
    throw new Error("Invalid client resource owner.");
  }

  return segments.join("/");
}

export function clientResourceOriginalKey(owner: StorageKeyOwner): string {
  return `${clientResourceFolderKey(owner)}/original`;
}

export function clientResourcePageKey(
  owner: StorageKeyOwner,
  pageNumber: number,
): string {
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new Error("Invalid client resource page number.");
  }

  return `${clientResourceFolderKey(owner)}/page-${pageNumber}`;
}

export function clientResourceThumbnailKey(owner: StorageKeyOwner): string {
  return `${clientResourceFolderKey(owner)}/thumbnail`;
}
