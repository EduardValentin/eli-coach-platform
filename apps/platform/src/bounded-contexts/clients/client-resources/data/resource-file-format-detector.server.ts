import type {
  DetectedResourceFile,
  ResourceFileFormatDetector,
} from "@eli-coach-platform/domain/client-resources";

import {
  createCompoundFileAwareFileTypeReader,
  readZipEntryNames,
} from "~/shared/documents/file-type.server";

const UNIDENTIFIED: DetectedResourceFile = { type: null, archiveEntries: [] };

export function createResourceFileFormatDetector(): ResourceFileFormatDetector {
  return new FileTypeResourceFileFormatDetector();
}

class FileTypeResourceFileFormatDetector implements ResourceFileFormatDetector {
  readonly #fileTypes = createCompoundFileAwareFileTypeReader();

  async detect(bytes: Uint8Array): Promise<DetectedResourceFile> {
    const type = await this.#fileTypes.extensionOf(bytes);

    if (!type) return UNIDENTIFIED;

    const archiveEntries = await readZipEntryNames(bytes);

    if (!archiveEntries) return UNIDENTIFIED;

    return { type, archiveEntries };
  }
}
