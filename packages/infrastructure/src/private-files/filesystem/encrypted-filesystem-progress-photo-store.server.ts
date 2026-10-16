import { rm } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import type {
  ProgressPhotoOwner,
  ProgressPhotoReference,
  ProgressPhotoStore,
} from "@eli-coach-platform/domain/client-profile";

import {
  PHOTO_ALREADY_STORED_MESSAGE,
  progressPhotoStorageKey,
} from "../progress-photo-layout.server";
import { readThenClose, writeNewFile } from "./media-files.server";
import {
  createConfinedFolders,
  directoryPlacement,
  isPathWithinRoot,
  openConfinedFile,
} from "./media-root-confinement.server";
import {
  sealProgressPhoto,
  unsealProgressPhoto,
} from "./progress-photo-cipher.server";

const INVALID_REFERENCE_MESSAGE = "Invalid progress photo reference.";
const LOCATION_LEAVES_ROOT_MESSAGE =
  "Progress photo location leaves the media root.";

export type EncryptedFilesystemSettings = {
  root: string;
  key: Buffer;
  keyId: string;
};

export class EncryptedFilesystemProgressPhotoStore implements ProgressPhotoStore {
  private readonly root: string;
  private readonly key: Buffer;
  private readonly keyId: string;

  constructor(settings: EncryptedFilesystemSettings) {
    this.root = resolve(settings.root);
    this.key = settings.key;
    this.keyId = settings.keyId;
  }

  async store(
    owner: ProgressPhotoOwner,
    bytes: Uint8Array,
  ): Promise<ProgressPhotoReference> {
    const storageKey = progressPhotoStorageKey(owner);

    if (
      (await createConfinedFolders(this.root, dirname(storageKey))) !==
      "within-root"
    ) {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    const writing = await writeNewFile(
      resolve(this.root, storageKey),
      sealProgressPhoto({ key: this.key, storageKey, photo: bytes }),
    );

    if (writing === "already-exists") {
      throw new Error(PHOTO_ALREADY_STORED_MESSAGE);
    }

    return { storageKey, keyId: this.keyId };
  }

  async open(reference: ProgressPhotoReference): Promise<Uint8Array | null> {
    if (reference.keyId !== this.keyId) {
      throw new Error(
        `Progress photo key id ${reference.keyId} is not configured.`,
      );
    }

    const opening = await openConfinedFile(
      this.root,
      this.referencedPath(reference.storageKey),
    );

    if (opening.kind === "missing") {
      return null;
    }

    if (opening.kind === "outside-root") {
      throw new Error(INVALID_REFERENCE_MESSAGE);
    }

    return unsealProgressPhoto({
      key: this.key,
      storageKey: reference.storageKey,
      sealed: await readThenClose(opening.file),
    });
  }

  async delete(reference: ProgressPhotoReference): Promise<void> {
    const path = this.referencedPath(reference.storageKey);
    const placement = await directoryPlacement(this.root, dirname(path));

    if (placement === "missing") {
      return;
    }

    if (placement === "outside-root") {
      throw new Error(INVALID_REFERENCE_MESSAGE);
    }

    await rm(path, { force: true });
  }

  private referencedPath(storageKey: string): string {
    const path = resolve(this.root, storageKey);

    if (
      !storageKey.trim() ||
      isAbsolute(storageKey) ||
      !isPathWithinRoot(this.root, path)
    ) {
      throw new Error(INVALID_REFERENCE_MESSAGE);
    }

    return path;
  }
}
