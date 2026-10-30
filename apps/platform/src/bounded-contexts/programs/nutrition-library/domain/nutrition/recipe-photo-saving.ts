import type { NutritionLibraryIncidentsPort } from "./nutrition-library-incidents-port";
import type { RecipeDraftResult, RecipeSaveProblems } from "./recipe-draft";
import {
  MAX_RECIPE_PHOTO_BYTES,
  RecipePhoto,
  type RecipePhotoChange,
  type RecipePhotoChoice,
  type RecipePhotoRefusal,
} from "./recipe-photo";
import type { RecipePhotoIdsPort } from "./recipe-photo-ids-port";
import type { RecipePhotoRenditionsPort } from "./recipe-photo-renditions-port";
import type { RecipePhotoStorePort } from "./recipe-photo-store-port";

export type JudgedRecipePhoto =
  RecipePhotoChoice | { kind: "refused"; refusal: RecipePhotoRefusal };

type AcceptedRecipePhoto = Exclude<JudgedRecipePhoto, { kind: "refused" }>;

type RecipePhotoSavingOptions = {
  recipePhotoRenditionsPort: RecipePhotoRenditionsPort;
  recipePhotoIdsPort: RecipePhotoIdsPort;
  recipePhotoStorePort: Pick<RecipePhotoStorePort, "store" | "remove">;
  nutritionLibraryIncidentsPort: Pick<
    NutritionLibraryIncidentsPort,
    "recipePhotoCleanupFailed"
  >;
};

export function saveProblemsOf(
  draft: RecipeDraftResult,
  photo: JudgedRecipePhoto,
): RecipeSaveProblems {
  return {
    ...(draft.status === "invalid" && draft.problems),
    ...(photo.kind === "refused" && { photo: photo.refusal }),
  };
}

export class RecipePhotoSaving {
  constructor(private readonly options: RecipePhotoSavingOptions) {}

  async judged(choice: RecipePhotoChoice): Promise<JudgedRecipePhoto> {
    if (choice.kind !== "attach") return choice;

    if (choice.bytes.byteLength > MAX_RECIPE_PHOTO_BYTES) {
      return { kind: "refused", refusal: "too-large" };
    }

    const rendition = await this.options.recipePhotoRenditionsPort.render(
      choice.bytes,
    );

    return rendition.status === "rendered"
      ? { kind: "attach", bytes: rendition.bytes }
      : { kind: "refused", refusal: "unsupported" };
  }

  async storeAccepted(judged: AcceptedRecipePhoto): Promise<RecipePhotoChange> {
    if (judged.kind !== "attach") return judged;

    const photoId = this.options.recipePhotoIdsPort.generate();
    await this.options.recipePhotoStorePort.store(photoId, judged.bytes);

    return { kind: "attach", photo: RecipePhoto.fromStored({ photoId }) };
  }

  async writeOrRemoveStored<Outcome extends string>(
    change: RecipePhotoChange,
    write: () => Promise<Outcome>,
  ): Promise<Outcome> {
    const outcome = await write().catch(async (error: unknown) => {
      await this.removeUnwritten(change);

      throw error;
    });

    if (outcome === "name-taken") await this.removeUnwritten(change);

    return outcome;
  }

  async removeStored(photo: RecipePhoto | null): Promise<void> {
    if (!photo) return;

    await this.removeStoredQuietly(photo);
  }

  private async removeUnwritten(change: RecipePhotoChange): Promise<void> {
    if (change.kind !== "attach") return;

    await this.removeStoredQuietly(change.photo);
  }

  private async removeStoredQuietly(photo: RecipePhoto): Promise<void> {
    const { photoId } = photo;

    try {
      await this.options.recipePhotoStorePort.remove(photoId);
    } catch (error) {
      this.options.nutritionLibraryIncidentsPort.recipePhotoCleanupFailed({
        photoId,
        error,
      });
    }
  }
}
