import { rm, type FileHandle } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type {
  ClientResourceOwner,
  ClientResourceStore,
  ResourcePageImage,
  StoredResourceOriginal,
} from "@eli-coach-platform/domain/client-resources";

import {
  clientResourceFolderKey,
  clientResourceOriginalKey,
  clientResourcePageKey,
  clientResourceThumbnailKey,
} from "../client-resource-layout.server";
import {
  readThenClose,
  streamThenClose,
  writeNewFile,
} from "./media-files.server";
import {
  createConfinedFolders,
  directoryPlacement,
  openConfinedFile,
} from "./media-root-confinement.server";

const LOCATION_LEAVES_ROOT_MESSAGE =
  "Client resource location leaves the storage root.";
const ALREADY_STORED_MESSAGE =
  "A client resource file is already stored at this location.";

export class FilesystemClientResourceStore implements ClientResourceStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async storeOriginal(
    owner: ClientResourceOwner,
    bytes: Uint8Array,
  ): Promise<void> {
    return this.storeNew(clientResourceOriginalKey(owner), bytes);
  }

  async storePage(
    owner: ClientResourceOwner,
    page: ResourcePageImage,
  ): Promise<void> {
    return this.storeNew(
      clientResourcePageKey(owner, page.pageNumber),
      page.bytes,
    );
  }

  async storeThumbnail(
    owner: ClientResourceOwner,
    bytes: Uint8Array,
  ): Promise<void> {
    return this.storeNew(clientResourceThumbnailKey(owner), bytes);
  }

  async openOriginal(
    owner: ClientResourceOwner,
  ): Promise<StoredResourceOriginal | null> {
    const file = await this.openStored(clientResourceOriginalKey(owner));

    if (file === null) {
      return null;
    }

    const sizeBytes = await sizeOf(file);

    return { bytes: streamThenClose(file), sizeBytes };
  }

  async openPage(
    owner: ClientResourceOwner,
    pageNumber: number,
  ): Promise<Uint8Array | null> {
    return this.readStored(clientResourcePageKey(owner, pageNumber));
  }

  async openThumbnail(owner: ClientResourceOwner): Promise<Uint8Array | null> {
    return this.readStored(clientResourceThumbnailKey(owner));
  }

  async remove(owner: ClientResourceOwner): Promise<void> {
    const folder = resolve(this.root, clientResourceFolderKey(owner));
    const placement = await directoryPlacement(this.root, folder);

    if (placement === "missing") {
      return;
    }

    if (placement === "outside-root") {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    await rm(folder, { recursive: true, force: true });
  }

  private async storeNew(storageKey: string, bytes: Uint8Array): Promise<void> {
    if (
      (await createConfinedFolders(this.root, dirname(storageKey))) !==
      "within-root"
    ) {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    if (
      (await writeNewFile(resolve(this.root, storageKey), bytes)) ===
      "already-exists"
    ) {
      throw new Error(ALREADY_STORED_MESSAGE);
    }
  }

  private async readStored(storageKey: string): Promise<Uint8Array | null> {
    const file = await this.openStored(storageKey);

    return file === null ? null : readThenClose(file);
  }

  private async openStored(storageKey: string): Promise<FileHandle | null> {
    const opening = await openConfinedFile(
      this.root,
      resolve(this.root, storageKey),
    );

    if (opening.kind === "outside-root") {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    return opening.kind === "opened" ? opening.file : null;
  }
}

async function sizeOf(file: FileHandle): Promise<number> {
  try {
    return (await file.stat()).size;
  } catch (error) {
    await file.close();

    throw error;
  }
}
