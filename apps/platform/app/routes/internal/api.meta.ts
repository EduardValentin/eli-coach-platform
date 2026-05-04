import { getPlatformContainer } from "~/server/container.server";
import { handleHttpErrorResponse } from "~/server/http.server";

const appMetadataController = getPlatformContainer().appMetadataController;

export function loader() {
  return handleHttpErrorResponse(() => appMetadataController.getMetadata());
}
