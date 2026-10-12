import type { ClientIdentities } from "../client";
import type { Clock } from "../shared";

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

  constructor(options: ListCoachCheckInsUseCaseOptions) {
    this.views = new CoachCheckInViews(options);
  }

  async execute(): Promise<CoachCheckInView[]> {
    return this.views.list();
  }
}
