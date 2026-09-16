import { z } from "zod";

export const appShape = {
  APP_NAME: z.string().default("eli-coach-platform"),
  ENVIRONMENT: z.string().default("local"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_BASE_PATH: z.string().default("/"),
  PUBLIC_APP_URL: z.url(),
  API_PUBLIC_URL: z.url().optional(),
};

export type AppConfig = z.infer<z.ZodObject<typeof appShape>>;

export function isProductionRuntime(
  environment: Pick<AppConfig, "ENVIRONMENT" | "NODE_ENV">,
): boolean {
  return (
    environment.ENVIRONMENT === "production" ||
    (environment.NODE_ENV === "production" && environment.ENVIRONMENT !== "local")
  );
}
