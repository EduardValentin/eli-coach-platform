import type { RangeFileReader, StoredFileWriter } from "../stored-files";

export type ExerciseVideoStore = StoredFileWriter & RangeFileReader;
