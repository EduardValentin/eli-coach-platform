import { appMetadataSchema } from "@eli-coach-platform/contracts";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export function loader() {
  const environment = getRuntimeEnvironment();

  return Response.json(
    appMetadataSchema.parse({
      appName: environment.APP_NAME,
      environment: environment.ENVIRONMENT,
      version: process.env.GIT_SHA ?? "dev",
    }),
  );
}
