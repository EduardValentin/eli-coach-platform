import { readZipEntryNames } from "~/shared/documents/file-type.server";
import { createCompoundFileAwareFileTypeReaderAdapter } from "~/shared/documents/create-compound-file-aware-file-type-reader-adapter.server";
import type {
  ResourceFileFormatDetectorPort,
  DetectedResourceFile,
} from "~/bounded-contexts/clients/client-resources/domain/client-resources/index";

export class FileTypeResourceFileFormatDetectorAdapter implements ResourceFileFormatDetectorPort {
  readonly #fileTypes = createCompoundFileAwareFileTypeReaderAdapter();

  async detect(bytes: Uint8Array): Promise<DetectedResourceFile> {
    const type = await this.#fileTypes.extensionOf(bytes);

    if (!type) return UNIDENTIFIED;

    const archiveEntries = await readZipEntryNames(bytes);

    if (!archiveEntries) return UNIDENTIFIED;

    return { type, archiveEntries };
  }
}

const UNIDENTIFIED: DetectedResourceFile = { type: null, archiveEntries: [] };
