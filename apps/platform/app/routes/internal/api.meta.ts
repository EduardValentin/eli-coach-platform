import { getPlatformContainer } from "~/server/container.server";

export function loader() {
  return getPlatformContainer().appMetadataController.getMetadata();
}
