import { z } from "zod";

import {
  isProductionRuntime,
  type RuntimeStage,
} from "~/shared/runtime/production-runtime";

const PLACEHOLDER_SECRET = "replace-me";
const MINIMUM_MANAGEMENT_API_SECRET_LENGTH = 32;

export const managementApiShape = {
  MANAGEMENT_API_SECRET: z.string().trim().min(1),
};

export type ManagementApiConfig = z.infer<
  z.ZodObject<typeof managementApiShape>
>;

export function refineManagementApi(
  environment: ManagementApiConfig & RuntimeStage,
  context: z.RefinementCtx,
): void {
  if (environment.ENVIRONMENT === "local") {
    return;
  }

  if (
    environment.MANAGEMENT_API_SECRET !== PLACEHOLDER_SECRET &&
    environment.MANAGEMENT_API_SECRET.length >=
      MINIMUM_MANAGEMENT_API_SECRET_LENGTH
  ) {
    return;
  }

  context.addIssue({
    code: "custom",
    message: `Deployed Store management requires a non-placeholder MANAGEMENT_API_SECRET of at least ${MINIMUM_MANAGEMENT_API_SECRET_LENGTH} characters.`,
    path: ["MANAGEMENT_API_SECRET"],
  });
}

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
