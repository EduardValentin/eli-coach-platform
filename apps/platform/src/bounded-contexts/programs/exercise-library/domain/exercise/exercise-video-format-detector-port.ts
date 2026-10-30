export interface ExerciseVideoFormatDetectorPort {
  detect(leadingBytes: Uint8Array): Promise<string | null>;
}
