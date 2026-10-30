import { detectCfbf } from "@file-type/cfbf";
import { FileTypeParser } from "file-type";
import type { FileTypeReaderPort } from "./file-type-reader-port.server";
import { ParserFileTypeReaderAdapter } from "./parser-file-type-reader-adapter.server";

export function createCompoundFileAwareFileTypeReaderAdapter(): FileTypeReaderPort {
  return new ParserFileTypeReaderAdapter(
    new FileTypeParser({ customDetectors: [detectCfbf] }),
  );
}
