import type { ProgressPhotoRenditionsPort } from "~/bounded-contexts/clients/client-profile/domain/client-profile/index";
import { SharpProgressPhotoRenditionsAdapter } from "./sharp-progress-photo-renditions-adapter.server";

export function createProgressPhotoRenditionsAdapter(): ProgressPhotoRenditionsPort {
  return new SharpProgressPhotoRenditionsAdapter();
}
