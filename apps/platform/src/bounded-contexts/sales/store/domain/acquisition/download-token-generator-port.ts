export interface DownloadTokenGeneratorPort {
  create(): CreateDownloadTokenResult;
}
export type CreateDownloadTokenResult = {
  rawToken: string;
  sha256: string;
};
