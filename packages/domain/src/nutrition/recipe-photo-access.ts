import type { Recipe } from "./recipe";
import type { RecipePhotoViewer } from "./recipe-photo-viewer";

export class RecipePhotoAccess {
  async libraryOwnerAccountIdFor(
    viewer: RecipePhotoViewer,
  ): Promise<string | null> {
    switch (viewer.kind) {
      case "coach":
        return viewer.accountId;
      case "client":
      case "visitor":
        return null;
    }
  }

  async admits(viewer: RecipePhotoViewer, _recipe: Recipe): Promise<boolean> {
    switch (viewer.kind) {
      case "coach":
        return true;
      case "client":
      case "visitor":
        return false;
    }
  }
}
