import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClockPort } from "../clock-port";

import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInsPort } from "./check-ins-port";
import {
  CoachCheckInViews,
  type CoachCheckInView,
} from "./coach-check-in-views";

type ListCoachCheckInsAwaitingUseCaseOptions = {
  checkIns: Pick<CheckInsPort, "listAll">;
  clock: ClockPort;
  identities: Pick<ClientIdentitiesPort, "findByClientIds">;
  incidents: CheckInIncidentsPort;
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
      const checkIns = await this.options.checkIns.listAll();
      const views = await this.views.viewsOf(checkIns);

      return views.filter((view) => view.awaitsViewer);
    } catch (error) {
      this.options.incidents.awaitingCheckInsListFailed({ error });

      return [];
    }
  }
}
