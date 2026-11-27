import { z } from "zod";

import type { RuntimeStage } from "~/shared/runtime/production-runtime";

export const comingSoonShape = {
  COMING_SOON_MODE: z.enum(["on", "off"]).optional(),
};

export type ComingSoonConfig = z.infer<z.ZodObject<typeof comingSoonShape>>;

export type ComingSoonMode = NonNullable<ComingSoonConfig["COMING_SOON_MODE"]>;

// Unset in a production runtime is on, so a missing value fails closed. TEST
// also reports itself as a production-like runtime, which is why this reads
// ENVIRONMENT itself instead of isProductionRuntime.
export function resolveComingSoonMode(
  environment: ComingSoonConfig & Pick<RuntimeStage, "ENVIRONMENT">,
): ComingSoonMode {
  if (environment.COMING_SOON_MODE) {
    return environment.COMING_SOON_MODE;
  }

  return environment.ENVIRONMENT === "production" ? "on" : "off";
}
