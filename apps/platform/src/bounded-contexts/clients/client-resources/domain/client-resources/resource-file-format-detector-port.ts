export type DetectedResourceFile = {
  type: string | null;
  archiveEntries: readonly string[];
};

export interface ResourceFileFormatDetectorPort {
  detect(bytes: Uint8Array): Promise<DetectedResourceFile>;
}
