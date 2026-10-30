import type {
  RecipePhotoRenditionSpec,
  RecipePhotoRenditionsPort,
} from "~/bounded-contexts/programs/nutrition-library/domain/nutrition/index";
import { SharpRecipePhotoRenditionsAdapter } from "./sharp-recipe-photo-renditions-adapter.server";

export function createRecipePhotoRenditionsAdapter(
  spec: RecipePhotoRenditionSpec,
): RecipePhotoRenditionsPort {
  return new SharpRecipePhotoRenditionsAdapter(spec);
}
