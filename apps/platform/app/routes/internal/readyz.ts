import { getPlatformContainer } from "~/server/container.server";
import { handleHttpErrorResponse } from "~/server/http.server";

export function loader() {
  return handleHttpErrorResponse(() => getPlatformContainer().readyzController.getStatus());
}
