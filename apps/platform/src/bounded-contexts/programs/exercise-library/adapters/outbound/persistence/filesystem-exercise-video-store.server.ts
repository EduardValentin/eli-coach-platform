import { randomUUID } from "node:crypto";
import {
  link,
  open as openFile,
  rm,
  unlink,
  type FileHandle,
} from "node:fs/promises";
import { join, resolve } from "node:path";

import type {
  ExerciseVideoOpening,
  ExerciseVideoStore,
  RequestedByteRange,
  ServedByteRange,
  StagedExerciseVideo,
} from "~/bounded-contexts/programs/exercise-library/domain/exercise";

import { isStorageKeySegment } from "~/shared/private-files/storage-key-segment.server";
import { streamWhenPulled } from "~/shared/private-files/filesystem/media-files.server";
import {
  createConfinedFolders,
  directoryPlacement,
  findConfinedFile,
  openConfinedFile,
} from "~/shared/private-files/filesystem/media-root-confinement.server";

type ExerciseVideoFolder = ".incoming" | "videos";

type ReceivedBytes = Omit<StagedExerciseVideo, "stagingId">;

const INCOMING_FOLDER: ExerciseVideoFolder = ".incoming";
const VIDEOS_FOLDER: ExerciseVideoFolder = "videos";
const LEADING_BYTE_COUNT = 4100;
const LOCATION_LEAVES_ROOT_MESSAGE =
  "Exercise video location leaves the storage root.";
const VIDEO_GONE_MESSAGE = "The exercise video was removed before it was read.";

export class FilesystemExerciseVideoStore implements ExerciseVideoStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async receive(
    bytes: AsyncIterable<Uint8Array>,
    countUpTo: number,
  ): Promise<StagedExerciseVideo> {
    await this.createFolder(INCOMING_FOLDER);

    const stagingId = randomUUID();
    const path = this.pathOf(INCOMING_FOLDER, stagingId);
    const file = await openFile(path, "wx");

    try {
      return {
        stagingId,
        ...(await this.writeThenClose(file, bytes, countUpTo)),
      };
    } catch (error) {
      await rm(path, { force: true });

      throw error;
    }
  }

  async keep(stagingId: string, videoId: string): Promise<void> {
    const incoming = this.pathOf(INCOMING_FOLDER, stagingId);
    const kept = this.pathOf(VIDEOS_FOLDER, videoId);
    await this.requireFolderWithinRoot(INCOMING_FOLDER);
    await this.createFolder(VIDEOS_FOLDER);

    await link(incoming, kept);
    await unlink(incoming);
    await this.syncFolder(VIDEOS_FOLDER);
  }

  async discard(stagingId: string): Promise<void> {
    await this.deleteFrom(INCOMING_FOLDER, stagingId);
  }

  async remove(videoId: string): Promise<void> {
    await this.deleteFrom(VIDEOS_FOLDER, videoId);
  }

  async open(
    videoId: string,
    requested: RequestedByteRange | null,
  ): Promise<ExerciseVideoOpening> {
    const path = this.pathOf(VIDEOS_FOLDER, videoId);
    const finding = await findConfinedFile(this.root, path);

    if (finding.kind === "outside-root") {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    if (finding.kind === "missing") return { status: "missing" };

    const { sizeBytes } = finding;
    const served = this.servedRange(requested, sizeBytes);

    if (served === "unsatisfiable")
      return { status: "unsatisfiable", sizeBytes };

    return {
      status: "opened",
      bytes: streamWhenPulled(
        () => this.openStillStored(path),
        served === "whole" ? undefined : served,
      ),
      sizeBytes,
      served,
    };
  }

  private async writeThenClose(
    file: FileHandle,
    bytes: AsyncIterable<Uint8Array>,
    countUpTo: number,
  ): Promise<ReceivedBytes> {
    try {
      const received = await this.writeUpTo(file, bytes, countUpTo);
      await file.sync();

      return received;
    } finally {
      await file.close();
    }
  }

  private async writeUpTo(
    file: FileHandle,
    bytes: AsyncIterable<Uint8Array>,
    countUpTo: number,
  ): Promise<ReceivedBytes> {
    const leadingChunks: Uint8Array[] = [];
    let leadingLength = 0;
    let sizeBytes = 0;

    for await (const chunk of bytes) {
      const leading = chunk.subarray(0, LEADING_BYTE_COUNT - leadingLength);
      leadingChunks.push(Buffer.from(leading));
      leadingLength += leading.byteLength;

      const writable = chunk.subarray(0, countUpTo - sizeBytes);
      if (writable.byteLength > 0) await file.writeFile(writable);
      sizeBytes += writable.byteLength;
    }

    return { sizeBytes, leadingBytes: Buffer.concat(leadingChunks) };
  }

  private servedRange(
    requested: RequestedByteRange | null,
    sizeBytes: number,
  ): ServedByteRange | "whole" | "unsatisfiable" {
    if (requested === null) return "whole";
    if (requested.kind === "suffix") {
      return this.suffixRange(requested.length, sizeBytes);
    }

    return this.fromRange(requested, sizeBytes);
  }

  private suffixRange(
    length: number,
    sizeBytes: number,
  ): ServedByteRange | "unsatisfiable" {
    if (length <= 0 || sizeBytes === 0) return "unsatisfiable";

    return { start: Math.max(0, sizeBytes - length), end: sizeBytes - 1 };
  }

  private fromRange(
    { start, end }: Extract<RequestedByteRange, { kind: "from" }>,
    sizeBytes: number,
  ): ServedByteRange | "unsatisfiable" {
    const lastByte = sizeBytes - 1;
    const servedEnd = Math.min(end ?? lastByte, lastByte);

    if (start >= sizeBytes || start > servedEnd) return "unsatisfiable";

    return { start, end: servedEnd };
  }

  private async deleteFrom(
    folder: ExerciseVideoFolder,
    id: string,
  ): Promise<void> {
    const path = this.pathOf(folder, id);
    const placement = await directoryPlacement(
      this.root,
      join(this.root, folder),
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

    if (opening.kind === "missing") throw new Error(VIDEO_GONE_MESSAGE);

    return opening.file;
  }

  private async createFolder(folder: ExerciseVideoFolder): Promise<void> {
    if ((await createConfinedFolders(this.root, folder)) !== "within-root") {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }
  }

  private async requireFolderWithinRoot(
    folder: ExerciseVideoFolder,
  ): Promise<void> {
    const placement = await directoryPlacement(
      this.root,
      join(this.root, folder),
    );

    if (placement === "outside-root") {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }
  }

  private async syncFolder(folder: ExerciseVideoFolder): Promise<void> {
    const directory = await openFile(join(this.root, folder), "r");

    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  }

  private pathOf(folder: ExerciseVideoFolder, id: string): string {
    if (!isStorageKeySegment(id)) {
      throw new Error(LOCATION_LEAVES_ROOT_MESSAGE);
    }

    return join(this.root, folder, id);
  }
}
