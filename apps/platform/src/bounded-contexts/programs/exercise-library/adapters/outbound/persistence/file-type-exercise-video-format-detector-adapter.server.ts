import { createFileTypeReader } from "~/shared/documents/file-type.server";
import type { ExerciseVideoFormatDetectorPort } from "~/bounded-contexts/programs/exercise-library/domain/exercise/index";

export class FileTypeExerciseVideoFormatDetectorAdapter implements ExerciseVideoFormatDetectorPort {
  readonly #fileTypes = createFileTypeReader();

  detect(leadingBytes: Uint8Array): Promise<string | null> {
    return this.#fileTypes.extensionOf(leadingBytes);
  }
}
