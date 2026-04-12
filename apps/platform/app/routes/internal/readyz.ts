import { ReadyzController } from "~/modules/internal/readyz-controller.server";

const readyzController = new ReadyzController();

export function loader() {
  return readyzController.handle();
}
