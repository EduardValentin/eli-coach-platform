import type { ClientIdentities } from "./client-identities";
import type { Clock } from "../clock";

import type { CheckIns } from "./check-ins";
import {
  CoachCheckInViews,
  type CoachCheckInView,
} from "./coach-check-in-views";

type ListCoachCheckInsUseCaseOptions = {
  checkIns: Pick<CheckIns, "listAll">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
};

export class ListCoachCheckInsUseCase {
  private readonly views: CoachCheckInViews;

  constructor(private readonly options: ListCoachCheckInsUseCaseOptions) {
    this.views = new CoachCheckInViews(options);
  }

  async execute(): Promise<CoachCheckInView[]> {
    return this.views.viewsOf(await this.options.checkIns.listAll());
  }
}
