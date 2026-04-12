import { AppMetadataController } from "~/modules/internal/app-metadata-controller.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

const runtimeEnvironment = getRuntimeEnvironment();
const appMetadataController = new AppMetadataController({
  appName: runtimeEnvironment.APP_NAME,
  environment: runtimeEnvironment.ENVIRONMENT,
  version: process.env.GIT_SHA ?? "dev",
});

export function loader() {
  return appMetadataController.handle();
}
