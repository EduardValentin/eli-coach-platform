export type StagedExerciseVideo = {
  stagingId: string;
  sizeBytes: number;
  leadingBytes: Uint8Array;
};

export type RequestedByteRange =
  | { kind: "from"; start: number; end: number | null }
  | { kind: "suffix"; length: number };

export type ServedByteRange = { start: number; end: number };

export type ExerciseVideoOpening =
  | {
      status: "opened";
      bytes: AsyncIterable<Uint8Array>;
      sizeBytes: number;
      served: ServedByteRange | "whole";
    }
  | { status: "unsatisfiable"; sizeBytes: number }
  | { status: "missing" };

export interface ExerciseVideoStore {
  receive(
    bytes: AsyncIterable<Uint8Array>,
    countUpTo: number,
  ): Promise<StagedExerciseVideo>;
  keep(stagingId: string): Promise<string>;
  discard(stagingId: string): Promise<void>;
  remove(videoId: string): Promise<void>;
  open(
    videoId: string,
    requested: RequestedByteRange | null,
  ): Promise<ExerciseVideoOpening>;
}
