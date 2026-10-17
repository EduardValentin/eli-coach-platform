import type { RecipeLibrary } from "./recipe-library";
import { RecipePhotoAccess } from "./recipe-photo-access";
import type { RecipePhotoStore } from "./recipe-photo-store";
import type { RecipePhotoViewer } from "./recipe-photo-viewer";

type OpenRecipePhotoCommand = {
  viewer: RecipePhotoViewer;
  recipeId: string;
  photoId: string;
};

export type OpenRecipePhotoResult =
  | {
      status: "opened";
      mediaType: string;
      bytes: AsyncIterable<Uint8Array>;
      sizeBytes: number;
    }
  | { status: "not-found" };

type OpenRecipePhotoUseCaseOptions = {
  recipes: Pick<RecipeLibrary, "find">;
  store: Pick<RecipePhotoStore, "open">;
};

const NOT_FOUND: OpenRecipePhotoResult = { status: "not-found" };

export class OpenRecipePhotoUseCase {
  private readonly access = new RecipePhotoAccess();

  constructor(private readonly options: OpenRecipePhotoUseCaseOptions) {}

  async execute(
    command: OpenRecipePhotoCommand,
  ): Promise<OpenRecipePhotoResult> {
    const ownerAccountId = await this.access.libraryOwnerAccountIdFor(
      command.viewer,
    );

    if (!ownerAccountId) return NOT_FOUND;

    const recipe = await this.options.recipes.find({
      ownerAccountId,
      recipeId: command.recipeId,
    });

    if (!recipe) return NOT_FOUND;
    if (!(await this.access.admits(command.viewer, recipe))) return NOT_FOUND;

    const photo = recipe.photo;

    if (!photo?.isStoredAs(command.photoId)) return NOT_FOUND;

    const opening = await this.options.store.open(photo.photoId);

    if (opening.status === "missing") return NOT_FOUND;

    return { ...opening, mediaType: photo.mediaType };
  }
}
