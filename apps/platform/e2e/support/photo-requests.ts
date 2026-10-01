import type { APIRequestContext } from "@playwright/test";

export type PhotoResponse = {
  status: number;
  headers: Record<string, string>;
};

const PHOTOS_PATH = "/api/client-profile/photos";

export class PhotoRequests {
  constructor(private readonly request: APIRequestContext) {}

  async open(photoId: string): Promise<PhotoResponse> {
    const response = await this.request.get(`${PHOTOS_PATH}/${photoId}`);

    return { status: response.status(), headers: response.headers() };
  }

  async remove(photoId: string): Promise<number> {
    const response = await this.request.delete(`${PHOTOS_PATH}/${photoId}`);

    return response.status();
  }
}
