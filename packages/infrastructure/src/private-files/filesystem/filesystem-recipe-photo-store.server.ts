import { rm, type FileHandle } from "node:fs/promises";
import { join, resolve } from "node:path";

import type {
  RecipePhotoOpening,
  RecipePhotoStore,
} from "@eli-coach-platform/domain/nutrition";

import { isStorageKeySegment } from "../storage-key-segment.server";
import { streamWhenPulled, writeNewFile } from "./media-files.server";
import {
  createConfinedFolders,
  directoryPlacement,
  findConfinedFile,
  openConfinedFile,
} from "./media-root-confinement.server";

const PHOTOS_FOLDER = "photos";
const LOCATION_LEAVES_ROOT_MESSAGE =
  "Recipe photo location leaves the storage root.";
const ALREADY_STORED_MESSAGE =
  "A recipe photo is already stored under this id.";
const PHOTO_GONE_MESSAGE = "The recipe photo was removed before it was read.";

export class FilesystemRecipePhotoStore implements RecipePhotoStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async store(photoId: string, bytes: Uint8Array): Promise<void> {
    const path = this.pathOf(photoId);

    if (
      (await createConfinedFolders(this.root, PHOTOS_FOLDER)) !== "within-root"
    ) {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    if ((await writeNewFile(path, bytes)) === "already-exists") {
      throw new Error(ALREADY_STORED_MESSAGE);
    }
  }

  async open(photoId: string): Promise<RecipePhotoOpening> {
    const path = this.pathOf(photoId);
    const finding = await findConfinedFile(this.root, path);

    if (finding.kind === "outside-root") {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    if (finding.kind === "missing") return { status: "missing" };

    return {
      status: "opened",
      bytes: streamWhenPulled(() => this.openStillStored(path)),
      sizeBytes: finding.sizeBytes,
    };
  }

  async remove(photoId: string): Promise<void> {
    const path = this.pathOf(photoId);
    const placement = await directoryPlacement(
      this.root,
      join(this.root, PHOTOS_FOLDER),
    );

    if (placement === "missing") return;

    if (placement === "outside-root") {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    await rm(path, { force: true });
  }

  private async openStillStored(path: string): Promise<FileHandle> {
    const opening = await openConfinedFile(this.root, path);

    if (opening.kind === "outside-root") {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    if (opening.kind === "missing") throw new Error(PHOTO_GONE_MESSAGE);

    return opening.file;
  }

  private pathOf(photoId: string): string {
    if (!isStorageKeySegment(photoId)) {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    return join(this.root, PHOTOS_FOLDER, photoId);
  }
}
