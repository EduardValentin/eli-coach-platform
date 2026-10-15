import type { ClientIdentities } from "../client";
import type { Clock } from "../shared";

import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckIns } from "./check-ins";
import {
  CoachCheckInViews,
  type CoachCheckInView,
} from "./coach-check-in-views";

type ListCoachCheckInsAwaitingUseCaseOptions = {
  checkIns: Pick<CheckIns, "listAll">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  incidents: CheckInIncidents;
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
