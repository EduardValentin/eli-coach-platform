import { detectCfbf } from "@file-type/cfbf";
import { FileTypeParser } from "file-type";

export const probe = [detectCfbf, FileTypeParser];
