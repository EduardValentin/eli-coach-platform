export interface DownloadTokenHasherPort {
  sha256(rawToken: string): string;
}
