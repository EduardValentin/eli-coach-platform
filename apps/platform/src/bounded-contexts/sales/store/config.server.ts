import { z } from "zod";

import {
  isProductionRuntime,
  type RuntimeStage,
} from "~/shared/runtime/production-runtime";

const PLACEHOLDER_SECRET = "replace-me";
export const storeAssetsShape = {
  STORE_ASSET_ROOT: z.string().trim().min(1),
};

export type StoreAssetsConfig = z.infer<z.ZodObject<typeof storeAssetsShape>>;

export function refineStoreAssets(
  environment: StoreAssetsConfig & RuntimeStage,
  context: z.RefinementCtx,
): void {
  if (
    !isProductionRuntime(environment) ||
    environment.STORE_ASSET_ROOT !== PLACEHOLDER_SECRET
  ) {
    return;
  }

  context.addIssue({
    code: "custom",
    message:
      "Production Store assets require a non-placeholder STORE_ASSET_ROOT.",
    path: ["STORE_ASSET_ROOT"],
  });
}
