export type DetectedResourceFile = {
  type: string | null;
  archiveEntries: readonly string[];
};

export interface ResourceFileFormatDetector {
  detect(bytes: Uint8Array): Promise<DetectedResourceFile>;
}
