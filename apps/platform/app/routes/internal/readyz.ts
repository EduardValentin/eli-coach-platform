import { getPlatformContainer } from "~/server/container.server";

export function loader() {
  return getPlatformContainer().readyzController.getStatus();
}
