import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import type { RecipePhoto } from "./recipe-photo";
import type { RecipePhotoStore } from "./recipe-photo-store";

type RecipePhotoCleanupOptions = {
  store: Pick<RecipePhotoStore, "remove">;
  incidents: Pick<NutritionLibraryIncidents, "recipePhotoCleanupFailed">;
};

export class RecipePhotoCleanup {
  constructor(private readonly options: RecipePhotoCleanupOptions) {}

  async removeStored(photo: RecipePhoto | null): Promise<void> {
    if (!photo) return;

    const { photoId } = photo;

    try {
      await this.options.store.remove(photoId);
    } catch (error) {
      this.options.incidents.recipePhotoCleanupFailed({ photoId, error });
    }
  }
}
