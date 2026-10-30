import type { ProgressPhoto } from "./progress-photo";

export interface ProgressPhotosPort {
  add(photo: ProgressPhoto): Promise<void>;
  findById(photoId: string): Promise<ProgressPhoto | null>;
  delete(photoId: string): Promise<void>;
}
