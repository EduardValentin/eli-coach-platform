import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { serviceMetadataSchema } from "@eli-coach-platform/contracts";

export function loader() {
  const environment = loadRuntimeEnvironment(process.env);

  return Response.json(
    serviceMetadataSchema.parse({
      appName: environment.APP_NAME,
      environment: environment.ENVIRONMENT,
      service: "platform",
      version: process.env.GIT_SHA ?? "dev",
    }),
  );
}
