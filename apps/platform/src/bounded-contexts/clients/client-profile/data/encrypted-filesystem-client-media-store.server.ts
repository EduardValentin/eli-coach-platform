import { rm } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import { MEDIA_ALREADY_STORED_MESSAGE } from "./client-media-layout.server";
import {
  readThenClose,
  writeNewFile,
} from "~/shared/private-files/filesystem/media-files.server";
import {
  createConfinedFolders,
  directoryPlacement,
  isPathWithinRoot,
  openConfinedFile,
} from "~/shared/private-files/filesystem/media-root-confinement.server";
import {
  sealClientMedia,
  unsealClientMedia,
} from "~/shared/private-files/filesystem/client-media-cipher.server";

const INVALID_REFERENCE_MESSAGE = "Invalid client media reference.";
const LOCATION_LEAVES_ROOT_MESSAGE =
  "Client media location leaves the media root.";

type ClientMediaReference = { storageKey: string; keyId: string };

export type EncryptedFilesystemSettings = {
  root: string;
  key: Buffer;
  keyId: string;
};

export class EncryptedFilesystemClientMediaStore<Owner> {
  private readonly root: string;
  private readonly key: Buffer;
  private readonly keyId: string;

  constructor(
    settings: EncryptedFilesystemSettings,
    private readonly storageKeyOf: (owner: Owner) => string,
  ) {
    this.root = resolve(settings.root);
    this.key = settings.key;
    this.keyId = settings.keyId;
  }

  async store(owner: Owner, bytes: Uint8Array): Promise<ClientMediaReference> {
    const storageKey = this.storageKeyOf(owner);

    if (
      (await createConfinedFolders(this.root, dirname(storageKey))) !==
      "within-root"
    ) {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    const writing = await writeNewFile(
      resolve(this.root, storageKey),
      sealClientMedia({ key: this.key, storageKey, media: bytes }),
    );

    if (writing === "already-exists") {
      throw new Error(MEDIA_ALREADY_STORED_MESSAGE);
    }

    return { storageKey, keyId: this.keyId };
  }

  async open(reference: ClientMediaReference): Promise<Uint8Array | null> {
    if (reference.keyId !== this.keyId) {
      throw new Error(
        `Client media key id ${reference.keyId} is not configured.`,
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

    return unsealClientMedia({
      key: this.key,
      storageKey: reference.storageKey,
      sealed: await readThenClose(opening.file),
    });
  }

  async delete(reference: ClientMediaReference): Promise<void> {
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
