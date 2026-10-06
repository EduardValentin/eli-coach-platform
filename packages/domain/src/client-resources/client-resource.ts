import type { ClientResourceOwner } from "./client-resource-store";
import type { ResourceDetails } from "./resource-details";
import {
  hasPagePreview,
  resourceFileExtensionsOf,
  resourceFileKindOf,
  resourceFileMimeTypeOf,
  type ResourceFileFormat,
  type ResourceFileKind,
} from "./resource-file-kind";
import { pinnedFileName } from "./resource-file-name";

export type ResourceFileSnapshot = {
  originalName: string;
  format: ResourceFileFormat;
  sizeBytes: number;
  pageCount: number | null;
};

export type ClientResourceSnapshot = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  file: ResourceFileSnapshot;
  addedAt: Date;
};

type AddedClientResourceInput = {
  id: string;
  clientId: string;
  details: ResourceDetails;
  file: ResourceFile;
  at: Date;
};

export class ResourceFile {
  private constructor(private readonly snapshot: ResourceFileSnapshot) {}

  static of(snapshot: ResourceFileSnapshot): ResourceFile {
    return new ResourceFile({ ...snapshot });
  }

  get originalName(): string {
    return this.snapshot.originalName;
  }

  get sizeBytes(): number {
    return this.snapshot.sizeBytes;
  }

  get kind(): ResourceFileKind {
    return resourceFileKindOf(this.snapshot.format);
  }

  get mimeType(): string {
    return resourceFileMimeTypeOf(this.snapshot.format);
  }

  downloadName(): string {
    return pinnedFileName(
      this.snapshot.originalName,
      resourceFileExtensionsOf(this.snapshot.format),
    );
  }

  hasPagePreview(): boolean {
    return hasPagePreview(this.kind);
  }

  hasPage(pageNumber: number): boolean {
    const pageCount = this.snapshot.pageCount ?? 0;

    return (
      Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= pageCount
    );
  }

  toSnapshot(): ResourceFileSnapshot {
    return { ...this.snapshot };
  }
}

export class ClientResource {
  private constructor(private readonly snapshot: ClientResourceSnapshot) {}

  static added(input: AddedClientResourceInput): ClientResource {
    return new ClientResource({
      id: input.id,
      clientId: input.clientId,
      ...input.details.toSnapshot(),
      file: input.file.toSnapshot(),
      addedAt: input.at,
    });
  }

  static reconstitute(snapshot: ClientResourceSnapshot): ClientResource {
    return new ClientResource({ ...snapshot, file: { ...snapshot.file } });
  }

  get file(): ResourceFile {
    return ResourceFile.of(this.snapshot.file);
  }

  isFor(clientId: string): boolean {
    return this.snapshot.clientId === clientId;
  }

  storageOwner(): ClientResourceOwner {
    return { clientId: this.snapshot.clientId, resourceId: this.snapshot.id };
  }

  toSnapshot(): ClientResourceSnapshot {
    return { ...this.snapshot, file: { ...this.snapshot.file } };
  }
}
