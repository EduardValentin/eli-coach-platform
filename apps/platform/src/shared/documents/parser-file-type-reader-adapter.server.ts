import type { FileTypeParser } from "file-type";
import type { FileTypeReaderPort } from "./file-type-reader-port.server";

export class ParserFileTypeReaderAdapter implements FileTypeReaderPort {
  constructor(private readonly parser: FileTypeParser) {}

  async extensionOf(bytes: Uint8Array): Promise<string | null> {
    const fileType = await this.parser.fromBuffer(bytes);

    return fileType?.ext ?? null;
  }
}
