import type { CoachingPeriodHandler } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods";

export class ClientsCoachingPeriodHandler implements CoachingPeriodHandler {
  constructor(private readonly coachingPeriods: CoachingPeriodsFacade) {}

  paidThroughExtended(notice: { clientId: string }): Promise<void> {
    return this.coachingPeriods.startCoachingPeriod({
      clientId: notice.clientId,
    });
  }

  programStarted(notice: { clientId: string }): Promise<void> {
    return this.coachingPeriods.startCoachingPeriod({
      clientId: notice.clientId,
    });
  }
}
