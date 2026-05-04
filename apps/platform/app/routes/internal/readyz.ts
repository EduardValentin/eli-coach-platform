import { getPlatformContainer } from "~/server/container.server";
import { handleHttpErrorResponse } from "~/server/http.server";

const readyzController = getPlatformContainer().readyzController;

export function loader() {
  return handleHttpErrorResponse(() => readyzController.getStatus());
}
