import type { RecipeLibraryPort } from "./recipe-library-port";
import type { RecipePhotoStorePort } from "./recipe-photo-store-port";
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
  recipes: Pick<RecipeLibraryPort, "find">;
  store: Pick<RecipePhotoStorePort, "open">;
};

const NOT_FOUND: OpenRecipePhotoResult = { status: "not-found" };

export class OpenRecipePhotoUseCase {
  constructor(private readonly options: OpenRecipePhotoUseCaseOptions) {}

  async execute(
    command: OpenRecipePhotoCommand,
  ): Promise<OpenRecipePhotoResult> {
    const ownerAccountId = this.ownerAccountIdOf(command.viewer);

    if (!ownerAccountId) return NOT_FOUND;

    const recipe = await this.options.recipes.find({
      ownerAccountId,
      recipeId: command.recipeId,
    });

    if (!recipe) return NOT_FOUND;

    const photo = recipe.photo;

    if (!photo?.isStoredAs(command.photoId)) return NOT_FOUND;

    const opening = await this.options.store.open(photo.photoId);

    if (opening.status === "missing") return NOT_FOUND;

    return { ...opening, mediaType: photo.mediaType };
  }

  private ownerAccountIdOf(viewer: RecipePhotoViewer): string | null {
    switch (viewer.kind) {
      case "coach":
        return viewer.accountId;
      case "client":
      case "visitor":
        return null;
    }
  }
}
