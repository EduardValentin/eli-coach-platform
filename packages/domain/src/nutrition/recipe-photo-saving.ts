import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import {
  MAX_RECIPE_PHOTO_BYTES,
  RecipePhoto,
  type RecipePhotoChange,
  type RecipePhotoChoice,
  type RecipePhotoRefusal,
} from "./recipe-photo";
import { RecipePhotoCleanup } from "./recipe-photo-cleanup";
import type { RecipePhotoIds } from "./recipe-photo-ids";
import type { RecipePhotoRenditions } from "./recipe-photo-renditions";
import type { RecipePhotoStore } from "./recipe-photo-store";

type JudgedRecipePhoto =
  RecipePhotoChoice | { kind: "refused"; refusal: RecipePhotoRefusal };

type AcceptedRecipePhoto = Exclude<JudgedRecipePhoto, { kind: "refused" }>;

type RecipePhotoSavingOptions = {
  renditions: RecipePhotoRenditions;
  ids: RecipePhotoIds;
  store: Pick<RecipePhotoStore, "store" | "remove">;
  incidents: Pick<NutritionLibraryIncidents, "recipePhotoCleanupFailed">;
};

export class RecipePhotoSaving {
  private readonly cleanup: RecipePhotoCleanup;

  constructor(private readonly options: RecipePhotoSavingOptions) {
    this.cleanup = new RecipePhotoCleanup(options);
  }

  async judged(choice: RecipePhotoChoice): Promise<JudgedRecipePhoto> {
    if (choice.kind !== "attach") return choice;

    if (choice.bytes.byteLength > MAX_RECIPE_PHOTO_BYTES) {
      return { kind: "refused", refusal: "too-large" };
    }

    const rendition = await this.options.renditions.render(choice.bytes);

    return rendition.status === "rendered"
      ? { kind: "attach", bytes: rendition.bytes }
      : { kind: "refused", refusal: "unsupported" };
  }

  async storeAccepted(judged: AcceptedRecipePhoto): Promise<RecipePhotoChange> {
    if (judged.kind !== "attach") return judged;

    const photoId = this.options.ids.generate();
    await this.options.store.store(photoId, judged.bytes);

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
    await this.cleanup.removeStored(photo);
  }

  private async removeUnwritten(change: RecipePhotoChange): Promise<void> {
    if (change.kind !== "attach") return;

    await this.cleanup.removeStored(change.photo);
  }
}
