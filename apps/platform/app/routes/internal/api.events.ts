import { ApiEventsController } from "~/modules/internal/api-events-controller.server";

const apiEventsController = new ApiEventsController();

export function loader() {
  return apiEventsController.handle();
}
