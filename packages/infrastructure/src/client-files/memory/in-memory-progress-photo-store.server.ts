import type {
  ProgressPhotoOwner,
  ProgressPhotoReference,
  ProgressPhotoStore,
} from "@eli-coach-platform/domain/client-profile";

import {
  PHOTO_ALREADY_STORED_MESSAGE,
  progressPhotoStorageKey,
} from "../progress-photo-layout.server";

const MEMORY_KEY_ID = "memory";

export class InMemoryProgressPhotoStore implements ProgressPhotoStore {
  private readonly photos = new Map<string, Uint8Array>();

  async store(
    owner: ProgressPhotoOwner,
    bytes: Uint8Array,
  ): Promise<ProgressPhotoReference> {
    const storageKey = progressPhotoStorageKey(owner);

    if (this.photos.has(storageKey)) {
      throw new Error(PHOTO_ALREADY_STORED_MESSAGE);
    }

    this.photos.set(storageKey, Uint8Array.from(bytes));

    return { storageKey, keyId: MEMORY_KEY_ID };
  }

  async open(reference: ProgressPhotoReference): Promise<Uint8Array | null> {
    const photo = this.photos.get(reference.storageKey);

    return photo ? Uint8Array.from(photo) : null;
  }

  async delete(reference: ProgressPhotoReference): Promise<void> {
    this.photos.delete(reference.storageKey);
  }
}
