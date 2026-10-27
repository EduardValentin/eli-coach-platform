import type { RecipePhotoStore } from "@eli-coach-platform/domain/nutrition";

import { FilesystemRecipePhotoStore } from "./filesystem-recipe-photo-store.server";
import { isReadyMediaRoot } from "~/shared/private-files/filesystem/media-root.server";

export function createRecipePhotoStore(root: string): RecipePhotoStore {
  if (!isReadyMediaRoot(root)) {
    throw new Error("Recipe photo root is not ready.");
  }

  return new FilesystemRecipePhotoStore(root);
}
