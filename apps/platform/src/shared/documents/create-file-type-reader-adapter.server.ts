import { FileTypeParser } from "file-type";
import type { FileTypeReaderPort } from "./file-type-reader-port.server";
import { ParserFileTypeReaderAdapter } from "./parser-file-type-reader-adapter.server";

export function createFileTypeReaderAdapter(): FileTypeReaderPort {
  return new ParserFileTypeReaderAdapter(new FileTypeParser());
}
