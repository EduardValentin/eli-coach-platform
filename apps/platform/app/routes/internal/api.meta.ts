import { serviceMetadataSchema } from "@eli-coach-platform/contracts";
import { getRuntimeEnvironment } from "../../server/runtime-environment.server";

export function loader() {
  const environment = getRuntimeEnvironment();

  return Response.json(
    serviceMetadataSchema.parse({
      appName: environment.APP_NAME,
      environment: environment.ENVIRONMENT,
      service: "platform",
      version: process.env.GIT_SHA ?? "dev",
    }),
  );
}
