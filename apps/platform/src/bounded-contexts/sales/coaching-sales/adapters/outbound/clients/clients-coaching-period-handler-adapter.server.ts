import type { CoachingPeriodHandlerPort } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods-facade";

export class ClientsCoachingPeriodHandlerAdapter implements CoachingPeriodHandlerPort {
  constructor(private readonly coachingPeriodsFacade: CoachingPeriodsFacade) {}

  paidThroughExtended(notice: { clientId: string }): Promise<void> {
    return this.coachingPeriodsFacade.startCoachingPeriod({
      clientId: notice.clientId,
    });
  }

  programStarted(notice: { clientId: string }): Promise<void> {
    return this.coachingPeriodsFacade.startCoachingPeriod({
      clientId: notice.clientId,
    });
  }
}
