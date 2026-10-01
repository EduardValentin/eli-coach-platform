import type { APIRequestContext } from "@playwright/test";

export type PhotoResponse = {
  status: number;
  headers: Record<string, string>;
};

export type PhotoDownload = PhotoResponse & { body: Buffer };

const PHOTOS_PATH = "/api/client-profile/photos";

export class PhotoRequests {
  constructor(private readonly request: APIRequestContext) {}

  async open(photoId: string): Promise<PhotoResponse> {
    const response = await this.request.get(`${PHOTOS_PATH}/${photoId}`);

    return { status: response.status(), headers: response.headers() };
  }

  async download(photoId: string): Promise<PhotoDownload> {
    const response = await this.request.get(`${PHOTOS_PATH}/${photoId}`);

    return {
      status: response.status(),
      headers: response.headers(),
      body: await response.body(),
    };
  }

  async remove(photoId: string): Promise<number> {
    const response = await this.request.delete(`${PHOTOS_PATH}/${photoId}`);

    return response.status();
  }
}
