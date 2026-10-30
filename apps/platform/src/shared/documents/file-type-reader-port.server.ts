export type FileTypeReaderPort = {
  extensionOf(bytes: Uint8Array): Promise<string | null>;
};
