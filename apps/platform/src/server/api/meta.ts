import { getPlatformContainer } from "~/server/container.server";
import { handleHttpErrorResponse } from "@eli-coach-platform/infrastructure/http/server";

export function loader() {
  return handleHttpErrorResponse(() =>
    getPlatformContainer().appMetadataController.getMetadata(),
  );
}
