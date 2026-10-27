import type { ExerciseVideoFormatDetector } from "@eli-coach-platform/domain/exercise";

import { createFileTypeReader } from "~/shared/documents/file-type.server";

export function createExerciseVideoFormatDetector(): ExerciseVideoFormatDetector {
  return new FileTypeExerciseVideoFormatDetector();
}

class FileTypeExerciseVideoFormatDetector implements ExerciseVideoFormatDetector {
  readonly #fileTypes = createFileTypeReader();

  detect(leadingBytes: Uint8Array): Promise<string | null> {
    return this.#fileTypes.extensionOf(leadingBytes);
  }
}
