import { z } from "zod";

import type { RuntimeStage } from "~/shared/runtime/production-runtime";

export const featureFlagsShape = {
  FEATURE_FLAG_OVERRIDES: z.enum(["browser", "none"]).optional(),
};

type FeatureFlagsConfig = z.infer<z.ZodObject<typeof featureFlagsShape>>;

type FeatureFlagOverridesMode = NonNullable<
  FeatureFlagsConfig["FEATURE_FLAG_OVERRIDES"]
>;

export function resolveFeatureFlagOverridesMode(
  environment: FeatureFlagsConfig & Pick<RuntimeStage, "ENVIRONMENT">,
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
  environment: FeatureFlagsConfig & RuntimeStage,
  context: z.RefinementCtx,
): void {
  if (
    environment.ENVIRONMENT === "production" &&
    resolveFeatureFlagOverridesMode(environment) === "browser"
  ) {
    context.addIssue({
      code: "custom",
      message:
        "FEATURE_FLAG_OVERRIDES must not be browser in a production runtime.",
      path: ["FEATURE_FLAG_OVERRIDES"],
    });
  }
}
