export interface ExerciseVideoFormatDetector {
  detect(leadingBytes: Uint8Array): Promise<string | null>;
}
