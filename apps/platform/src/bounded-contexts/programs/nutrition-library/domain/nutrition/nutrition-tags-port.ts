import type { TagFamily } from "./nutrition";

export type NutritionTag = {
  id: string;
  family: TagFamily;
  label: string;
  order: number;
};

export interface NutritionTagsPort {
  list(): Promise<NutritionTag[]>;
}
