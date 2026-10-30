import type { ResourceFileFormatDetectorPort } from "~/bounded-contexts/clients/client-resources/domain/client-resources";

import { FileTypeResourceFileFormatDetectorAdapter } from "./file-type-resource-file-format-detector-adapter.server";

export function createResourceFileFormatDetectorAdapter(): ResourceFileFormatDetectorPort {
  return new FileTypeResourceFileFormatDetectorAdapter();
}
