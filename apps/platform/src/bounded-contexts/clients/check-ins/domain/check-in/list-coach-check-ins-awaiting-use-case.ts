import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClockPort } from "../clock-port";

import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInsPort } from "./check-ins-port";
import {
  CoachCheckInViews,
  type CoachCheckInView,
} from "./coach-check-in-views";

type ListCoachCheckInsAwaitingUseCaseOptions = {
  checkInsPort: Pick<CheckInsPort, "listAll">;
  clockPort: ClockPort;
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientIds">;
  checkInIncidentsPort: CheckInIncidentsPort;
};

export class ListCoachCheckInsAwaitingUseCase {
  private readonly views: CoachCheckInViews;

  constructor(
    private readonly options: ListCoachCheckInsAwaitingUseCaseOptions,
  ) {
    this.views = new CoachCheckInViews(options);
  }

  async execute(): Promise<CoachCheckInView[]> {
    try {
      const checkIns = await this.options.checkInsPort.listAll();
      const views = await this.views.viewsOf(checkIns);

      return views.filter((view) => view.awaitsViewer);
    } catch (error) {
      this.options.checkInIncidentsPort.awaitingCheckInsListFailed({ error });

      return [];
    }
  }
}
