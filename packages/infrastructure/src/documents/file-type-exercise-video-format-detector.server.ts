import type { ExerciseVideoFormatDetector } from "@eli-coach-platform/domain/exercise";
import { FileTypeParser } from "file-type";

export function createExerciseVideoFormatDetector(): ExerciseVideoFormatDetector {
  return new FileTypeExerciseVideoFormatDetector();
}

class FileTypeExerciseVideoFormatDetector implements ExerciseVideoFormatDetector {
  readonly #parser = new FileTypeParser();

  async detect(leadingBytes: Uint8Array): Promise<string | null> {
    const fileType = await this.#parser.fromBuffer(leadingBytes);

    return fileType?.ext ?? null;
  }
}
