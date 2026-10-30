import { detectCfbf } from "@file-type/cfbf";
import { ZipHandler } from "@tokenizer/inflate";
import { FileTypeParser } from "file-type";
import { fromBuffer } from "strtok3";
import type { FileTypeReaderPort } from "./file-type-reader-port.server";
import { ParserFileTypeReaderAdapter } from "./parser-file-type-reader-adapter.server";

export function createFileTypeReader(): FileTypeReaderPort {
  return new ParserFileTypeReaderAdapter(new FileTypeParser());
}

export function createCompoundFileAwareFileTypeReader(): FileTypeReaderPort {
  return new ParserFileTypeReaderAdapter(
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
