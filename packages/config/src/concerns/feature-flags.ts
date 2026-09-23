import { z } from "zod";

import type { AppConfig } from "./app";

export const featureFlagsShape = {
  FEATURE_FLAG_OVERRIDES: z.enum(["browser", "none"]).optional(),
};

type FeatureFlagsConfig = z.infer<z.ZodObject<typeof featureFlagsShape>>;

type FeatureFlagOverridesMode = "browser" | "none";

export function resolveFeatureFlagOverrides(
  environment: FeatureFlagsConfig & Pick<AppConfig, "ENVIRONMENT">,
): FeatureFlagOverridesMode {
  if (environment.FEATURE_FLAG_OVERRIDES) {
    return environment.FEATURE_FLAG_OVERRIDES;
  }

  return environment.ENVIRONMENT === "local" ||
    environment.ENVIRONMENT === "test"
    ? "browser"
    : "none";
}

export function refineFeatureFlagOverrides(
  environment: FeatureFlagsConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (
    environment.ENVIRONMENT === "production" &&
    resolveFeatureFlagOverrides(environment) === "browser"
  ) {
    context.addIssue({
      code: "custom",
      message:
        "FEATURE_FLAG_OVERRIDES must not be browser in a production runtime.",
      path: ["FEATURE_FLAG_OVERRIDES"],
    });
  }
}
