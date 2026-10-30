import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClockPort } from "../clock-port";

import type { CheckInsPort } from "./check-ins-port";
import {
  CoachCheckInViews,
  type CoachCheckInView,
} from "./coach-check-in-views";

type ListCoachCheckInsUseCaseOptions = {
  checkIns: Pick<CheckInsPort, "listAll">;
  clock: ClockPort;
  identities: Pick<ClientIdentitiesPort, "findByClientIds">;
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
