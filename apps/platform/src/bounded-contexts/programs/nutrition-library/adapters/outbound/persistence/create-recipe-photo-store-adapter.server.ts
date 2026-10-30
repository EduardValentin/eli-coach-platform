import type { RecipePhotoStorePort } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";

import { FilesystemRecipePhotoStoreAdapter } from "./filesystem-recipe-photo-store-adapter.server";
import { isReadyMediaRoot } from "~/shared/private-files/filesystem/media-root.server";

export function createRecipePhotoStoreAdapter(
  root: string,
): RecipePhotoStorePort {
  if (!isReadyMediaRoot(root)) {
    throw new Error("Recipe photo root is not ready.");
  }

  return new FilesystemRecipePhotoStoreAdapter(root);
}
