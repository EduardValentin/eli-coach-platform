import { detectCfbf } from "@file-type/cfbf";
import { ZipHandler } from "@tokenizer/inflate";
import { FileTypeParser } from "file-type";
import { fromBuffer } from "strtok3";

type FileTypeReader = {
  extensionOf(bytes: Uint8Array): Promise<string | null>;
};

class ParserFileTypeReader implements FileTypeReader {
  constructor(private readonly parser: FileTypeParser) {}

  async extensionOf(bytes: Uint8Array): Promise<string | null> {
    const fileType = await this.parser.fromBuffer(bytes);

    return fileType?.ext ?? null;
  }
}

export function createFileTypeReader(): FileTypeReader {
  return new ParserFileTypeReader(new FileTypeParser());
}

export function createCompoundFileAwareFileTypeReader(): FileTypeReader {
  return new ParserFileTypeReader(
    new FileTypeParser({ customDetectors: [detectCfbf] }),
  );
}

export async function readZipEntryNames(
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
