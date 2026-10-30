import { createFileTypeReaderAdapter } from "~/shared/documents/create-file-type-reader-adapter.server";
import type { ExerciseVideoFormatDetectorPort } from "~/bounded-contexts/programs/exercise-library/domain/exercise/index";

export class FileTypeExerciseVideoFormatDetectorAdapter implements ExerciseVideoFormatDetectorPort {
  readonly #fileTypes = createFileTypeReaderAdapter();

  detect(leadingBytes: Uint8Array): Promise<string | null> {
    return this.#fileTypes.extensionOf(leadingBytes);
  }
}
