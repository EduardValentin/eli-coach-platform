import type { ProgressPhoto } from "./progress-photo";

export interface ProgressPhotos {
  add(photo: ProgressPhoto): Promise<void>;
  findById(photoId: string): Promise<ProgressPhoto | null>;
  delete(photoId: string): Promise<void>;
}

export interface ProgressPhotoIdGenerator {
  generate(): string;
}
