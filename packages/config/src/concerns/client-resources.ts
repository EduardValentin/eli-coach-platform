import { z } from "zod";

import { isProductionRuntime, type AppConfig } from "./app";

const PLACEHOLDER_SECRET = "replace-me";

export const clientResourcesShape = {
  CLIENT_RESOURCE_ROOT: z.string().trim().min(1),
};

export type ClientResourcesConfig = z.infer<
  z.ZodObject<typeof clientResourcesShape>
>;

export function refineClientResources(
  environment: ClientResourcesConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (
    !isProductionRuntime(environment) ||
    environment.CLIENT_RESOURCE_ROOT !== PLACEHOLDER_SECRET
  ) {
    return;
  }

  context.addIssue({
    code: "custom",
    message:
      "Production client resources require a non-placeholder CLIENT_RESOURCE_ROOT.",
    path: ["CLIENT_RESOURCE_ROOT"],
  });
}
