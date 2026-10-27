import type {
  RecipePhotoRendition,
  RecipePhotoRenditionSpec,
  RecipePhotoRenditions,
} from "@eli-coach-platform/domain/nutrition";

import { openAcceptedImage } from "~/shared/images/sharp-renditions.server";

const REFUSED: RecipePhotoRendition = { status: "refused" };

class SharpRecipePhotoRenditions implements RecipePhotoRenditions {
  constructor(private readonly spec: RecipePhotoRenditionSpec) {}

  async render(bytes: Uint8Array): Promise<RecipePhotoRendition> {
    try {
      return await this.renderAcceptedImage(bytes);
    } catch {
      return REFUSED;
    }
  }

  private async renderAcceptedImage(
    bytes: Uint8Array,
  ): Promise<RecipePhotoRendition> {
    const image = await openAcceptedImage(bytes);

    if (image === null) {
      return REFUSED;
    }

    const { longEdge, format, quality } = this.spec;
    const rendered = await image.fitInside(longEdge, { format, quality });

    return { status: "rendered", bytes: rendered };
  }
}

export function createRecipePhotoRenditions(
  spec: RecipePhotoRenditionSpec,
): RecipePhotoRenditions {
  return new SharpRecipePhotoRenditions(spec);
}
