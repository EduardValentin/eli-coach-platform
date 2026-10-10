import type {
  DetectedResourceFile,
  ResourceFileFormatDetector,
} from "@eli-coach-platform/domain/client-resources";
import { detectCfbf } from "@file-type/cfbf";
import { ZipHandler } from "@tokenizer/inflate";
import { FileTypeParser } from "file-type";
import { fromBuffer } from "strtok3";

const UNIDENTIFIED: DetectedResourceFile = { type: null, archiveEntries: [] };

export function createResourceFileFormatDetector(): ResourceFileFormatDetector {
  return new FileTypeResourceFileFormatDetector();
}

class FileTypeResourceFileFormatDetector implements ResourceFileFormatDetector {
  readonly #parser = new FileTypeParser({ customDetectors: [detectCfbf] });

  async detect(bytes: Uint8Array): Promise<DetectedResourceFile> {
    const fileType = await this.#parser.fromBuffer(bytes);

    if (!fileType) return UNIDENTIFIED;

    const archiveEntries = await this.archiveEntriesOf(bytes);

    if (!archiveEntries) return UNIDENTIFIED;

    return { type: fileType.ext, archiveEntries };
  }

  private async archiveEntriesOf(
    bytes: Uint8Array,
  ): Promise<readonly string[] | null> {
    const archive = new ZipHandler(fromBuffer(bytes));

    if (!(await archive.isZip())) return [];

    try {
      const entries = await archive.readCentralDirectory();

      return entries?.map((entry) => entry.filename) ?? null;
    } catch {
      return null;
    }
  }
}
